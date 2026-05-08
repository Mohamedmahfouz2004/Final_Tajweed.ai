"""
Streaming CTC decoder with temporal smoothing.

Accumulates per-chunk logits/probs, runs greedy CTC decode over the
growing sequence, smooths predictions, and emits a stable
``MuaalemOutput`` whenever new phonemes are detected.

Reuses the existing ``decode.py`` logic — no model changes.
"""

import logging
import threading
import queue
import time
import traceback
from typing import Optional, Callable
from collections import deque

import torch
import numpy as np

from quran_transcript import chunck_phonemes, QuranPhoneticScriptOutput

from ..decode import (
    phonemes_level_greedy_decode,
    multilevel_greedy_decode,
)
from ..inference import format_sifat
from ..muaalem_typing import Unit, MuaalemOutput, Sifa
from ..modeling.multi_level_tokenizer import MultiLevelTokenizer

from .config import StreamingConfig
from .inference_engine import InferenceChunk
from .metrics import ChunkMetrics, MetricsCollector

logger = logging.getLogger(__name__)


class StreamingDecoder:
    """
    Thread that reads :class:`InferenceChunk` objects, accumulates logit
    probabilities, runs CTC decoding, and calls a user-supplied callback
    with the latest ``MuaalemOutput``.
    """

    def __init__(
        self,
        config: StreamingConfig,
        multi_level_tokenizer: MultiLevelTokenizer,
        in_queue: queue.Queue,
        metrics: MetricsCollector,
        ref_phonetizer_out: Optional[QuranPhoneticScriptOutput] = None,
        on_prediction: Optional[Callable[[MuaalemOutput, dict], None]] = None,
    ):
        self._config = config
        self._tokenizer = multi_level_tokenizer
        self._in_queue = in_queue
        self._metrics = metrics
        self._ref = ref_phonetizer_out
        self._on_prediction = on_prediction
        self._running = threading.Event()
        self._thread: Optional[threading.Thread] = None

        # Accumulated probabilities across chunks
        self._accumulated_probs: dict[str, list[torch.Tensor]] = {}
        # Smoothing buffer
        self._recent_predictions: deque[str] = deque(maxlen=config.smoothing_window)
        self._last_emitted_text = ""
        self._decode_count = 0

    # ── lifecycle ────────────────────────────────────────────────────────

    def set_reference(self, ref: QuranPhoneticScriptOutput) -> None:
        """Update the Quranic reference (e.g. when user selects a new verse)."""
        self._ref = ref
        self.reset()

    def reset(self) -> None:
        """Clear accumulated state."""
        self._accumulated_probs = {}
        self._recent_predictions.clear()
        self._last_emitted_text = ""
        self._decode_count = 0

    def start(self) -> None:
        self._running.set()
        self._thread = threading.Thread(
            target=self._run, daemon=True, name="ctc-decoder"
        )
        self._thread.start()
        logger.info("StreamingDecoder started")

    def stop(self) -> None:
        self._running.clear()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        logger.info("StreamingDecoder stopped")

    # ── main loop ────────────────────────────────────────────────────────

    def _run(self) -> None:
        while self._running.is_set():
            try:
                inf_chunk: InferenceChunk = self._in_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            t0 = time.perf_counter()

            # ── Handle silence sentinel ──────────────────────────────────
            if not inf_chunk.is_speech:
                metrics = self._build_metrics(inf_chunk, 0.0, 0, 0.0)
                self._metrics.record(metrics)
                continue

            # ── Accumulate probabilities ─────────────────────────────────
            for level, prob_tensor in inf_chunk.level_to_probs.items():
                if level not in self._accumulated_probs:
                    self._accumulated_probs[level] = []
                # prob_tensor shape: (1, T, C)  — keep batch dim
                self._accumulated_probs[level].append(prob_tensor)

            logger.info(
                "Decoder: chunk #%d received, accumulated %d chunks, levels=%s",
                inf_chunk.chunk_index,
                len(self._accumulated_probs.get("phonemes", [])),
                list(self._accumulated_probs.keys()),
            )

            # ── Decode accumulated sequence ──────────────────────────────
            try:
                result, confidence = self._decode_accumulated()
            except Exception as e:
                logger.error("Decode error: %s\n%s", e, traceback.format_exc())
                decode_latency = (time.perf_counter() - t0) * 1000.0
                metrics = self._build_metrics(inf_chunk, decode_latency, 0, 0.0)
                metrics.error = str(e)
                self._metrics.record(metrics)

                # Even on error, try to emit a phoneme-only result
                try:
                    result, confidence = self._decode_phonemes_only()
                except Exception:
                    continue
                if result is None:
                    continue

            decode_latency = (time.perf_counter() - t0) * 1000.0

            if result is None:
                metrics = self._build_metrics(inf_chunk, decode_latency, 0, 0.0)
                self._metrics.record(metrics)
                continue

            # ── Smoothing / stability ────────────────────────────────────
            phoneme_text = result.phonemes.text if result else ""
            self._recent_predictions.append(phoneme_text)
            self._decode_count += 1

            logger.info(
                "Decoder: decode #%d  phonemes='%s'  confidence=%.3f",
                self._decode_count, phoneme_text[:60], confidence,
            )

            # Emit on every decode (not just changes) for streaming responsiveness
            if result is not None and self._on_prediction is not None:
                self._last_emitted_text = phoneme_text
                summary = self._metrics.summary()
                summary["decode_latency_ms"] = round(decode_latency, 2)
                try:
                    self._on_prediction(result, summary)
                except Exception as e:
                    logger.error("Prediction callback error: %s", e, exc_info=True)

            # ── Record metrics ───────────────────────────────────────────
            num_ph = len(result.sifat) if result else 0
            metrics = self._build_metrics(
                inf_chunk, decode_latency, num_ph, confidence
            )
            self._metrics.record(metrics)

        logger.info("StreamingDecoder loop exited")

    # ── internal helpers ─────────────────────────────────────────────────

    def _decode_phonemes_only(self) -> tuple[Optional[MuaalemOutput], float]:
        """Fallback: decode only the phonemes level, no sifat."""
        if not self._accumulated_probs or "phonemes" not in self._accumulated_probs:
            return None, 0.0

        probs_phonemes = torch.cat(self._accumulated_probs["phonemes"], dim=1)

        phonemes_units = phonemes_level_greedy_decode(
            probs_phonemes,
            self._tokenizer.id_to_vocab["phonemes"],
        )

        if not phonemes_units or len(phonemes_units[0].ids) == 0:
            return None, 0.0

        avg_confidence = float(phonemes_units[0].probs.mean()) if len(phonemes_units[0].probs) > 0 else 0.0

        output = MuaalemOutput(
            phonemes=phonemes_units[0],
            sifat=[],
        )
        return output, avg_confidence

    def _decode_accumulated(self) -> tuple[Optional[MuaalemOutput], float]:
        """Run the full CTC decode pipeline on accumulated probs."""
        if not self._accumulated_probs or "phonemes" not in self._accumulated_probs:
            return None, 0.0

        # Concatenate along the time axis
        probs = {}
        for level, chunks in self._accumulated_probs.items():
            probs[level] = torch.cat(chunks, dim=1)  # (1, T_total, C)

        # ── Phoneme-level greedy decode ──────────────────────────────────
        phonemes_units = phonemes_level_greedy_decode(
            probs["phonemes"],
            self._tokenizer.id_to_vocab["phonemes"],
        )

        if not phonemes_units or len(phonemes_units[0].ids) == 0:
            return None, 0.0

        chunked_phonemes_batch: list[list[str]] = []
        for pu in phonemes_units:
            chunked_phonemes_batch.append(chunck_phonemes(pu.text))

        avg_confidence = float(phonemes_units[0].probs.mean()) if len(phonemes_units[0].probs) > 0 else 0.0

        # ── Multi-level decode (with ref alignment if available) ─────────
        if self._ref is not None:
            try:
                level_to_ref_ids = self._tokenizer.tokenize(
                    [self._ref.phonemes],
                    [self._ref.sifat],
                    to_dict=True,
                    return_tensors="pt",
                    padding="longest",
                )["input_ids"]

                level_to_units = multilevel_greedy_decode(
                    level_to_probs=probs,
                    level_to_id_to_vocab=self._tokenizer.id_to_vocab,
                    level_to_ref_ids=level_to_ref_ids,
                    chunked_phonemes_batch=chunked_phonemes_batch,
                    ref_chuncked_phonemes_batch=[
                        [s.phonemes for s in self._ref.sifat]
                    ],
                    phonemes_units=phonemes_units,
                )

                sifat_batch = format_sifat(
                    level_to_units,
                    chunked_phonemes_batch,
                    self._tokenizer,
                )
            except Exception as e:
                logger.warning(
                    "Multi-level decode failed (falling back to phonemes-only): %s", e
                )
                # Fallback: phonemes only
                level_to_units = {"phonemes": phonemes_units}
                sifat_batch = [[]]
        else:
            # Without ref — just emit phonemes, no sifat
            level_to_units = {"phonemes": phonemes_units}
            sifat_batch = [[]]

        output = MuaalemOutput(
            phonemes=level_to_units["phonemes"][0],
            sifat=sifat_batch[0],
        )
        return output, avg_confidence

    def _build_metrics(
        self,
        inf: InferenceChunk,
        decode_latency_ms: float,
        num_phonemes: int,
        confidence: float,
    ) -> ChunkMetrics:
        total = (
            inf.capture_latency_ms
            + inf.feature_latency_ms
            + inf.inference_latency_ms
            + decode_latency_ms
        )
        rtf = total / inf.audio_duration_ms if inf.audio_duration_ms > 0 else 0.0

        return ChunkMetrics(
            chunk_index=inf.chunk_index,
            timestamp=inf.timestamp,
            capture_latency_ms=inf.capture_latency_ms,
            feature_latency_ms=inf.feature_latency_ms,
            inference_latency_ms=inf.inference_latency_ms,
            decode_latency_ms=decode_latency_ms,
            total_latency_ms=total,
            rtf=rtf,
            chunk_duration_ms=inf.audio_duration_ms,
            buffer_fill_pct=0.0,  # filled in by pipeline
            is_speech=inf.is_speech,
            prediction_confidence=confidence,
            num_phonemes=num_phonemes,
            gpu_util_pct=inf.gpu_util_pct,
            vram_used_mb=inf.vram_used_mb,
        )
