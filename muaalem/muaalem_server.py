"""
🎙️ Muaalem Streaming Server — FastAPI + WebSocket
Serves the Quran Muaalem model for real-time recitation analysis.
Port: 8000
"""

import sys
import os
import logging
import threading
import time
import json
from typing import Optional
import uuid

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import numpy as np
import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from quran_transcript import Aya, quran_phonetizer, MoshafAttributes, chunck_phonemes
from quran_muaalem.inference import Muaalem
from quran_muaalem.explain_gradio import explain_for_gradio
from quran_muaalem.explain import expalin_sifat, segment_groups
from quran_muaalem.uthmani_annotator import annotate_uthmani
import diff_match_patch as dmp_module

# Analytics & Session Management
from analytics_db import SessionLogger, get_session_chunks, store_report, get_report
from analytics_engine import AnalyticsEngine

# Tajweed explanation (post-recitation report) — loads OPENROUTER_* from .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from pydantic import BaseModel
import explain_tajweed

# ── Logging ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("muaalem_server")

# ── Device ───────────────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info("Device: %s", device)

# ── Load Model ───────────────────────────────────────────────────────────
model_id = "obadx/muaalem-model-v3_2"
SAMPLING_RATE = 16000
logger.info("Loading Muaalem model...")
muaalem = Muaalem(model_name_or_path=model_id, device=device)
logger.info("✅ Muaalem model loaded!")

# ── Default Moshaf ───────────────────────────────────────────────────────
default_moshaf = MoshafAttributes(
    rewaya="hafs",
    madd_monfasel_len=4,
    madd_mottasel_len=4,
    madd_mottasel_waqf=4,
    madd_aared_len=4,
)

# ── Sura Data ────────────────────────────────────────────────────────────
sura_data = {}
_tmp = Aya()
for _si in range(1, 115):
    _tmp.set(_si, 1)
    info = _tmp.get()
    sura_data[_si] = {
        "id": _si,
        "name": info.sura_name,
        "aya_count": info.num_ayat_in_sura,
    }


# ── Uthmani Annotation Engine ────────────────────────────────────────────
DIACRITICS = set(range(0x064B, 0x0656)) | {0x0670, 0x0640, 0x06DF, 0x06E0, 0x06E2, 0x06E3, 0x06E4, 0x06E5, 0x06E6, 0x06E7, 0x06E8, 0x06EA, 0x06EB, 0x06EC, 0x06ED}

def parse_uthmani_to_letter_units(text: str) -> list[dict]:
    """Parse Uthmani text into letter units (base letter + its diacritics)."""
    units = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == ' ' or ch == '\u06DD':  # space or end-of-ayah marker
            units.append({'start': i, 'end': i+1, 'text': ch, 'is_letter': False})
            i += 1
        elif ord(ch) in DIACRITICS:
            # Orphan diacritic, attach to previous unit if possible
            if units and units[-1]['is_letter']:
                units[-1]['end'] = i + 1
                units[-1]['text'] = text[units[-1]['start']:i+1]
            i += 1
        else:
            start = i
            i += 1
            while i < len(text) and (ord(text[i]) in DIACRITICS):
                i += 1
            is_wasla = (ord(ch) == 0x0671)
            units.append({'start': start, 'end': i, 'text': text[start:i], 'is_letter': True, 'is_wasla': is_wasla})
    return units


def annotate_uthmani_html(uthmani_text: str, predicted_phonemes: str, ref_phonemes: str, predicted_sifat: list, ref_sifat: list, locked_status: list = None) -> tuple:
    """
    Create annotated Uthmani HTML that mirrors the Matrix table exactly.
    Uses expalin_sifat (the same function that generates the matrix) to identify errors,
    then maps those errors back to Uthmani letter positions.
    """
    dmp_obj = dmp_module.diff_match_patch()
    diffs = dmp_obj.diff_main(ref_phonemes, predicted_phonemes)
    
    # 1. Parse Uthmani text into letter units and map to ref_sifat indices
    letter_units = parse_uthmani_to_letter_units(uthmani_text)
    content_units = [u for u in letter_units if u['is_letter'] and not u.get('is_wasla', False)]
    
    # Track wasla positions for post-processing
    wasla_char_positions = set()
    for u in letter_units:
        if u.get('is_wasla', False):
            for ci in range(u['start'], u['end']):
                wasla_char_positions.add(ci)
    
    if len(content_units) != len(ref_sifat):
        logger.warning("Uthmani alignment mismatch: content_units=%d, ref_sifat=%d", len(content_units), len(ref_sifat))
    
    mapping_len = min(len(content_units), len(ref_sifat))

    # Build phoneme-char-index mapping for diff walking
    phoneme_idx_to_char_indices = []
    for i in range(mapping_len):
        s = ref_sifat[i]
        unit = content_units[i]
        char_indices = list(range(unit['start'], unit['end']))
        for _ in s.phonemes:
            phoneme_idx_to_char_indices.append(char_indices)

    # Build reverse map: phoneme index -> ref_sifat index
    phoneme_to_sifat_idx = {}
    curr_p = 0
    for i in range(mapping_len):
        s = ref_sifat[i]
        for _ in s.phonemes:
            phoneme_to_sifat_idx[curr_p] = i
            curr_p += 1

    # 2. Use expalin_sifat — the EXACT same function that generates the matrix table
    #    to identify which ref_sifat indices have errors
    sifat_error_refs = set()
    
    try:
        sifat_table = expalin_sifat(predicted_sifat, ref_sifat, diffs)
        base_keys = []
        if sifat_table:
            base_keys = [k for k in sifat_table[0].keys() if not k.startswith("exp_") and k != "tag" and k != "ref_idx" and k != "phonemes" and k != "exp_phonemes"]
        
        for row in sifat_table:
            tag = row.get("tag")
            ref_idx = row.get("ref_idx")
            if ref_idx is None:
                continue
                
            if tag == "exact":
                # Check each sifat key — same logic as explain_sifat_html line 105
                for key in base_keys:
                    exp_key = f"exp_{key}"
                    if row.get(exp_key) != row.get(key):
                        sifat_error_refs.add(ref_idx)
                        break
            elif tag == "insert":
                if ref_idx is not None:
                    sifat_error_refs.add(ref_idx)
    except Exception as e:
        logger.warning("expalin_sifat error for Uthmani annotation: %s", e)

    # 3. Walk diffs to assign status to each Uthmani character
    # status: 0=future (grey), 1=correct (green), 2=phoneme_error (red), 3=sifat_error (red)
    char_status = [0] * len(uthmani_text)
    
    # FIX: Only update last_spoken_ref_idx on EQUAL (not INSERT!)
    # INSERT = extra phonemes user said, doesn't advance ref position
    last_spoken_ref_idx = -1
    temp_ref_ptr = 0
    for op, data in diffs:
        if op == dmp_obj.DIFF_EQUAL:
            last_spoken_ref_idx = temp_ref_ptr + len(data) - 1
        if op != dmp_obj.DIFF_INSERT:
            temp_ref_ptr += len(data)

    ref_ptr = 0
    for op, data in diffs:
        d_len = len(data)
        if op == dmp_obj.DIFF_EQUAL:
            for p_idx in range(ref_ptr, ref_ptr + d_len):
                if p_idx < len(phoneme_idx_to_char_indices):
                    s_idx = phoneme_to_sifat_idx.get(p_idx)
                    # If this ref_sifat index has an error in the matrix → status 3 (red)
                    status = 3 if s_idx in sifat_error_refs else 1
                    for c_idx in phoneme_idx_to_char_indices[p_idx]:
                        if char_status[c_idx] <= 1:
                            char_status[c_idx] = status
            ref_ptr += d_len
        elif op == dmp_obj.DIFF_DELETE:
            for p_idx in range(ref_ptr, ref_ptr + d_len):
                status = 2 if p_idx <= last_spoken_ref_idx else 0
                if p_idx < len(phoneme_idx_to_char_indices):
                    for c_idx in phoneme_idx_to_char_indices[p_idx]:
                        if char_status[c_idx] == 0:
                            char_status[c_idx] = status
            ref_ptr += d_len
        elif op == dmp_obj.DIFF_INSERT:
            # Extra phonemes user said — don't advance ref_ptr
            pass
    
    # 4. Merge with locked status — once colored, NEVER change back
    if locked_status and len(locked_status) == len(char_status):
        for i in range(len(char_status)):
            if locked_status[i] != 0:
                # Already determined — keep the locked value
                char_status[i] = locked_status[i]
    
    # 5. Post-process: Alif Wasla inherits color from the next non-wasla letter
    for ci in sorted(wasla_char_positions):
        for ni in range(ci + 1, len(uthmani_text)):
            if ni not in wasla_char_positions:
                char_status[ci] = char_status[ni]
                break
    
    # 6. Build annotated HTML
    html_parts = ['<div style="font-family: \'Amiri\', serif; font-size: 32px; line-height: 2.2; direction: rtl; text-align: center; color: #1e293b;">']
    
    i = 0
    while i < len(uthmani_text):
        status = char_status[i]
        # 0=future(grey), 1=correct(GREEN), 2=phoneme error(red), 3=sifat error(red)
        if status == 0:
            color = '#94A3B8'
        elif status == 1:
            color = '#22C55E'  # GREEN for correct
        else:
            color = '#DC2626'  # RED for any error
        
        start = i
        while i < len(uthmani_text) and char_status[i] == status:
            i += 1
        segment = uthmani_text[start:i]
        
        html_parts.append(f'<span style="color:{color};">{segment}</span>')
            
    html_parts.append('</div>')
    return ''.join(html_parts), char_status




def _aya_marker(aya_num: int) -> str:
    """Build an end-of-ayah marker like ﴿١﴾ using U+06DD + Eastern Arabic numerals."""
    eastern = ''.join(chr(0x0660 + int(d)) for d in str(aya_num))
    return f"\u06DD{eastern}"


def build_reference_for_range(surah: int, from_aya: int, to_aya: int, moshaf: MoshafAttributes):
    """Build phonetic reference for a range of ayahs.
    
    Returns:
        (plain_uthmani, ref, display_uthmani)
        - plain_uthmani: clean text for phonetization (no markers)
        - ref: phonetic reference object
        - display_uthmani: text with ayah end markers for UI display
    """
    logger.info("Building reference for range: Surah %d, Ayahs %d-%d", surah, from_aya, to_aya)
    uthmani_parts = []
    display_parts = []
    for aya_num in range(from_aya, to_aya + 1):
        logger.info("Fetching aya %d...", aya_num)
        aya = Aya(surah, aya_num, quran_dict=_tmp.quran_dict)
        aya_info = aya.get()
        word_count = len(aya_info.imlaey.split())
        aya_text = aya.get_by_imlaey_words(0, word_count).uthmani
        uthmani_parts.append(aya_text)
        display_parts.append(aya_text + " " + _aya_marker(aya_num))

    logger.info("Ayahs fetched. Building phonetizer...")
    full_uthmani = " ".join(uthmani_parts)
    display_uthmani = " ".join(display_parts)
    ref = quran_phonetizer(full_uthmani, moshaf, remove_spaces=True)
    logger.info("Phonetizer ready.")
    return full_uthmani, ref, display_uthmani


def get_uthmani_for_range(surah: int, from_aya: int, to_aya: int) -> str:
    """Get Uthmani text for display (with ayah markers)."""
    parts = []
    for aya_num in range(from_aya, to_aya + 1):
        aya = Aya(surah, aya_num, quran_dict=_tmp.quran_dict)
        aya_info = aya.get()
        word_count = len(aya_info.imlaey.split())
        text = aya.get_by_imlaey_words(0, word_count).uthmani
        parts.append(text + " " + _aya_marker(aya_num))
    return " ".join(parts)



# ── FastAPI App ──────────────────────────────────────────────────────────
app = FastAPI(title="Muaalem Streaming Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/surahs")
def get_surahs():
    return list(sura_data.values())


@app.get("/api/uthmani")
def get_uthmani(surah: int = 1, from_aya: int = 1, to_aya: int = 1):
    try:
        text = get_uthmani_for_range(surah, from_aya, to_aya)
        return {"text": text, "surah": surah, "from_aya": from_aya, "to_aya": to_aya}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/health")
def health():
    return {"status": "ok", "device": device, "model": model_id}


# ── Tajweed explanation (post-recitation report) ───────────────────────────
class _ExplainMistake(BaseModel):
    error_type: Optional[str] = None
    name: Optional[str] = None
    surah_number: Optional[int] = None
    ayah_number: Optional[int] = None
    ayah_text: Optional[str] = None
    char_index: Optional[int] = None
    tooltip: Optional[str] = None
    severity: Optional[str] = None


class _ExplainRequest(BaseModel):
    mistakes: list[_ExplainMistake] = []


@app.post("/api/explain")
async def explain(body: _ExplainRequest):
    """Explain a session's tajweed mistakes + (frontend joins) recommend videos.
    LLM-personalised with a static knowledge-base fallback — never hard-fails."""
    mistakes = [m.model_dump() for m in body.mistakes]
    return await explain_tajweed.build_explanation(mistakes)


# ══════════════════════════════════════════════════════════════════════════
#  WebSocket Streaming Endpoint
# ══════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")

    # Per-connection state
    audio_buffer = np.array([], dtype=np.float32)
    current_ref = None
    current_uthmani = ""
    latest_html = ""
    latest_phonemes = ""
    latest_annotated_uthmani = ""
    latest_structured_chars = None  # Structured JSON annotation
    locked_char_status = None  # Persists across inferences to lock colors
    streaming_active = False
    chunks_received = 0
    last_inference_duration = 0.0
    lock = threading.Lock()
    inference_needed = threading.Event()
    stop_event = threading.Event()
    current_moshaf = default_moshaf
    metrics_history = []
    auto_stop_flag = False
    current_session_id = None
    session_logger = None

    def inference_loop():
        nonlocal latest_html, latest_phonemes, latest_annotated_uthmani, latest_structured_chars, last_inference_duration, auto_stop_flag, locked_char_status

        logger.info("Inference loop started")
        while not stop_event.is_set():
            got_signal = inference_needed.wait(timeout=0.3)
            if stop_event.is_set():
                break
            if not got_signal:
                continue

            inference_needed.clear()

            with lock:
                if current_ref is None:
                    continue
                buf = audio_buffer.copy()
                ref = current_ref

            if len(buf) < int(0.3 * SAMPLING_RATE):
                continue

            t_start = time.perf_counter()
            try:
                # 1. Model Inference
                outs = muaalem([buf], [ref], SAMPLING_RATE)
                t_after_model = time.perf_counter()
                
                if outs and len(outs) > 0:
                    result = outs[0]
                    # 2. Post-processing
                    html, is_finished = explain_for_gradio(
                        result.phonemes.text,
                        ref.phonemes,
                        result.sifat,
                        ref.sifat,
                        lang="arabic",
                    )
                    
                    # 3. Annotate Uthmani text with per-character errors
                    try:
                        ann_result = annotate_uthmani(
                            current_uthmani,
                            result.phonemes.text,
                            ref.phonemes,
                            result.sifat,
                            ref.sifat,
                            locked_status=locked_char_status,
                        )
                        annotated = ann_result.html
                        locked_char_status = ann_result.locked_status
                        structured_chars = ann_result.to_json()
                    except Exception as ann_err:
                        logger.warning("Annotation error: %s", ann_err)
                        annotated = f'<div style="font-family: \'Amiri\', serif; font-size: 32px; line-height: 2.2; direction: rtl; text-align: center; color: #1e293b;">{current_uthmani}</div>'
                        structured_chars = None
                    
                    t_after_post = time.perf_counter()
                    
                    model_ms = (t_after_model - t_start) * 1000.0
                    post_ms = (t_after_post - t_after_model) * 1000.0
                    total_ms = (t_after_post - t_start) * 1000.0
                    
                    gpu_info = {}
                    if torch.cuda.is_available():
                        gpu_info = {
                            "name": torch.cuda.get_device_name(0),
                            "mem_alloc_mb": round(torch.cuda.memory_allocated(0) / 1024 / 1024, 1),
                            "mem_res_mb": round(torch.cuda.memory_reserved(0) / 1024 / 1024, 1)
                        }

                    with lock:
                        latest_html = html
                        latest_phonemes = result.phonemes.text
                        latest_annotated_uthmani = annotated
                        latest_structured_chars = structured_chars
                        
                        m_entry = {
                            "chunk": chunks_received,
                            "buffer_s": round(len(audio_buffer) / SAMPLING_RATE, 1),
                            "model_ms": round(model_ms, 1),
                            "post_ms": round(post_ms, 1),
                            "total_ms": round(total_ms, 1),
                            "inference_ms": round(total_ms, 1),
                            "gpu": gpu_info
                        }
                        metrics_history.append(m_entry)
                        
                        # Persistent Analytics Logging
                        if session_logger:
                            try:
                                session_logger.log_chunk({
                                    "chunk_id": chunks_received,
                                    "audio_timestamp": time.time(),
                                    "model_input_time": t_start,
                                    "model_output_time": t_after_model,
                                    "frontend_render_time": time.time(),
                                    "phonemes": result.phonemes.text,
                                    "errors": {}, 
                                    "gpu_utilization": 0,
                                    "gpu_memory": gpu_info.get("mem_alloc_mb", 0),
                                    "cpu_utilization": 0
                                })
                            except Exception as ex:
                                logger.error("Logging error: %s", ex)
                        
                        # if is_finished and chunks_received > 2:
                        #     auto_stop_flag = True

                    last_inference_duration = total_ms
                    logger.info(
                        "Inference done in %.0fms | model=%.0fms | post=%.0fms",
                        total_ms, model_ms, post_ms
                    )
            except Exception as e:
                logger.error("Inference error: %s", e, exc_info=True)
                with lock:
                    latest_html = f'<div style="color:red;padding:10px;">⚠️ خطأ: {e}</div>'

        logger.info("Inference loop exited")

    inference_thread = None

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                logger.info("Client disconnected normally.")
                break

            if "bytes" in message:
                if not streaming_active:
                    continue
                audio_data = np.frombuffer(message["bytes"], dtype=np.float32)
                if audio_data.ndim > 1:
                    audio_data = audio_data[:, 0]
                with lock:
                    audio_buffer = np.concatenate([audio_buffer, audio_data])
                    chunks_received += 1
                inference_needed.set()

                if chunks_received % 3 == 0 or chunks_received <= 2:
                    with lock:
                        html = latest_html
                        buf_len = len(audio_buffer) / SAMPLING_RATE
                        ann_uthmani = latest_annotated_uthmani
                        s_chars = latest_structured_chars
                    response = {
                        "type": "result",
                        "html": html,
                        "annotated_uthmani": ann_uthmani or html,
                        "structured_chars": s_chars,
                        "phonemes": latest_phonemes,
                        "metrics": {
                            "buffer_s": round(buf_len, 1),
                            "inference_ms": round(last_inference_duration),
                            "model_ms": round(metrics_history[-1]["model_ms"]) if metrics_history else 0,
                            "post_ms": round(metrics_history[-1]["post_ms"]) if metrics_history else 0,
                            "gpu": metrics_history[-1]["gpu"] if metrics_history else {},
                            "chunks": chunks_received,
                            "active": True,
                        }
                    }
                    await websocket.send_json(response)

            elif "text" in message:
                data = json.loads(message["text"])
                msg_type = data.get("type")

                if msg_type == "start":
                    if streaming_active:
                        stop_event.set()
                        if inference_thread:
                            inference_thread.join(timeout=3)

                    surah = int(data["surah"])
                    from_aya = int(data["from_aya"])
                    to_aya = int(data["to_aya"])
                    moshaf_settings = data.get("moshaf_settings", {})
                    
                    with lock:
                        metrics_history.clear()
                        auto_stop_flag = False

                    if moshaf_settings:
                        try:
                            current_moshaf = MoshafAttributes(**moshaf_settings)
                        except:
                            current_moshaf = default_moshaf

                    try:
                        uthmani_text, ref, display_uthmani = build_reference_for_range(
                            surah, from_aya, to_aya, current_moshaf
                        )
                    except Exception as e:
                        await websocket.send_json({"type": "error", "message": str(e)})
                        continue

                    with lock:
                        current_ref = ref
                        current_uthmani = uthmani_text
                        audio_buffer = np.array([], dtype=np.float32)
                        latest_html = ""
                        latest_phonemes = ""
                        latest_annotated_uthmani = ""
                        latest_structured_chars = None
                        locked_char_status = None
                        chunks_received = 0
                        current_session_id = str(uuid.uuid4())
                        session_logger = SessionLogger(current_session_id)

                    stop_event.clear()
                    inference_needed.clear()
                    streaming_active = True
                    inference_thread = threading.Thread(target=inference_loop, daemon=True)
                    inference_thread.start()

                    await websocket.send_json({
                        "type": "started",
                        "uthmani": uthmani_text,
                        "display_uthmani": display_uthmani,
                        "surah": surah,
                        "from_aya": from_aya,
                        "to_aya": to_aya,
                        "session_id": current_session_id
                    })

                elif msg_type == "stop":
                    streaming_active = False
                    stop_event.set()
                    if inference_thread:
                        inference_thread.join(timeout=3)

                    await websocket.send_json({
                        "type": "stopped",
                        "html": latest_html,
                        "annotated_uthmani": latest_annotated_uthmani,
                        "structured_chars": latest_structured_chars,
                        "phonemes": latest_phonemes,
                        "metrics_history": metrics_history,
                        "metrics": {
                            "buffer_s": round(len(audio_buffer) / SAMPLING_RATE, 1),
                            "inference_ms": round(last_inference_duration),
                            "model_ms": round(metrics_history[-1]["model_ms"]) if metrics_history else 0,
                            "post_ms": round(metrics_history[-1]["post_ms"]) if metrics_history else 0,
                            "gpu": metrics_history[-1]["gpu"] if metrics_history else {},
                            "chunks": chunks_received,
                            "active": False,
                        }
                    })
                    if session_logger:
                        session_logger.end_session()

                elif msg_type == "poll":
                    with lock:
                        html = latest_html
                        buf_len = len(audio_buffer) / SAMPLING_RATE
                        should_stop = auto_stop_flag
                    if should_stop and streaming_active:
                        await websocket.send_json({"type": "auto_stop"})
                        continue
                    await websocket.send_json({
                        "type": "result",
                        "html": html,
                        "annotated_uthmani": latest_annotated_uthmani,
                        "phonemes": latest_phonemes,
                        "metrics": {
                            "buffer_s": round(buf_len, 1),
                            "inference_ms": round(last_inference_duration),
                            "model_ms": round(metrics_history[-1]["model_ms"]) if metrics_history else 0,
                            "post_ms": round(metrics_history[-1]["post_ms"]) if metrics_history else 0,
                            "gpu": metrics_history[-1]["gpu"] if metrics_history else {},
                            "chunks": chunks_received,
                            "active": streaming_active,
                        }
                    })

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    finally:
        streaming_active = False
        stop_event.set()
        if session_logger:
            session_logger.end_session()
        if inference_thread:
            inference_thread.join(timeout=3)

# --- REST API for Post-Session Analytics ---

@app.post("/api/session/{session_id}/end")
async def api_end_session(session_id: str):
    chunks = get_session_chunks(session_id)
    if not chunks: return {"error": "No data"}
    report = AnalyticsEngine.process_session(chunks)
    store_report(session_id, report)
    return report

@app.get("/api/session/{session_id}/analytics")
async def api_get_analytics(session_id: str):
    report = get_report(session_id)
    if not report:
        chunks = get_session_chunks(session_id)
        if chunks:
            report = AnalyticsEngine.process_session(chunks)
            store_report(session_id, report)
            return report
        return {"error": "Not found"}
    return report

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8888)
