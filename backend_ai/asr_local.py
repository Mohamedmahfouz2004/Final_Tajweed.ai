"""
asr_local.py — Local FastConformer ONNX ASR for Arabic Quran recitation

Replaces cloud-based Groq Whisper with a local ONNX model.
Model: NVIDIA FastConformer (quantized uint8, 131 MB)
Source: https://github.com/yazinsai/offline-tarteel

Pipeline:
  1. Decode audio bytes (WebM/WAV) → 16 kHz mono float32
  2. Compute NeMo-compatible 80-bin mel spectrogram
  3. Run ONNX inference → CTC logprobs
  4. Greedy CTC decode → Arabic transcript
"""

import io
import os
import re
import json
import logging
import tempfile

import numpy as np

logger = logging.getLogger(__name__)

# ── Lazy-loaded globals ──────────────────────────────────────────────────────
_session = None
_id_to_char = None
_blank_id = None

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'fastconformer_ar_ctc_q8.onnx')
VOCAB_PATH = os.path.join(MODELS_DIR, 'vocab.json')


def _load_model():
    """Lazy-load the ONNX model and vocabulary."""
    global _session, _id_to_char, _blank_id

    if _session is not None:
        return

    import onnxruntime as ort

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f'ONNX model not found at {MODEL_PATH}. '
            'Download it: curl -L -o backend/recite/models/fastconformer_ar_ctc_q8.onnx '
            'https://github.com/yazinsai/offline-tarteel/releases/download/v0.1.0/fastconformer_ar_ctc_q8.onnx'
        )

    if not os.path.exists(VOCAB_PATH):
        raise FileNotFoundError(
            f'Vocabulary not found at {VOCAB_PATH}. '
            'Download it from https://github.com/yazinsai/offline-tarteel/blob/main/data/vocab.json'
        )

    logger.info('Loading FastConformer ONNX model...')
    _session = ort.InferenceSession(
        MODEL_PATH,
        providers=['CUDAExecutionProvider', 'CPUExecutionProvider'],
    )

    with open(VOCAB_PATH, encoding='utf-8') as f:
        vocab = json.load(f)

    _id_to_char = {int(k): v for k, v in vocab.items()}
    _blank_id = max(_id_to_char.keys())

    logger.info(
        f'FastConformer loaded: {len(_id_to_char)} tokens, '
        f'blank_id={_blank_id}, model={os.path.basename(MODEL_PATH)}'
    )


def _audio_bytes_to_float32(audio_bytes: bytes) -> np.ndarray:
    """
    Convert raw audio bytes (WAV, FLAC, OGG, WebM, etc.) to 16 kHz mono float32 numpy array.
    Frontend sends WAV directly, so soundfile handles it without ffmpeg.
    Falls back to pydub/ffmpeg for non-WAV formats.
    """
    import soundfile as sf

    # Try soundfile first (handles WAV, FLAC, OGG natively — fast path)
    try:
        buf = io.BytesIO(audio_bytes)
        audio, sr = sf.read(buf, dtype='float32')
        if len(audio.shape) > 1:
            audio = audio.mean(axis=1)  # stereo → mono
        if sr != 16000:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        return audio
    except Exception as e:
        logger.debug(f'soundfile failed: {e}, trying ffmpeg fallback')

    # Fallback: use ffmpeg via subprocess for WebM, MP4, etc.
    import subprocess
    
    # Detect format from header bytes
    suffix = '.webm'
    if audio_bytes[:4] == b'RIFF':
        suffix = '.wav'
    elif audio_bytes[:4] == b'fLaC':
        suffix = '.flac'
    
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_in:
        tmp_in.write(audio_bytes)
        tmp_in_path = tmp_in.name

    tmp_out_path = tmp_in_path + '.out.wav'
    try:
        subprocess.run(
            [
                'ffmpeg', '-y', '-i', tmp_in_path,
                '-ar', '16000', '-ac', '1', '-f', 'wav',
                tmp_out_path,
            ],
            capture_output=True, check=True, timeout=15,
        )
        audio, sr = sf.read(tmp_out_path, dtype='float32')
        return audio
    finally:
        for p in (tmp_in_path, tmp_out_path):
            try:
                os.unlink(p)
            except OSError:
                pass


def _compute_mel(audio: np.ndarray) -> np.ndarray:
    """
    Compute NeMo-compatible 80-bin mel spectrogram.
    Matches the offline-tarteel pipeline exactly.
    """
    import librosa

    # Dither (uniform, not Gaussian — matches NeMo)
    audio = audio + 1e-5 * (np.random.rand(len(audio)) * 2 - 1)
    # Preemphasis
    audio = np.append(audio[0], audio[1:] - 0.97 * audio[:-1])
    # Mel spectrogram — center=False is critical (NeMo doesn't pad edges)
    mel = librosa.feature.melspectrogram(
        y=audio, sr=16000,
        n_fft=512, hop_length=160, win_length=400,
        n_mels=80, fmax=8000, htk=True, norm='slaney',
        center=False, power=2.0,
    )
    # Log mel
    mel = np.log(mel + 1e-5)
    # Per-feature normalization
    mel = (mel - mel.mean(axis=1, keepdims=True)) / (mel.std(axis=1, keepdims=True) + 1e-10)
    return mel.astype(np.float32)


def _ctc_decode(logprobs: np.ndarray) -> str:
    """
    CTC greedy decode: argmax per timestep, collapse repeats, remove blanks.
    """
    ids = logprobs[0].argmax(axis=1)
    prev = -1
    tokens = []
    for i in ids:
        if i != prev and i != _blank_id:
            tokens.append(_id_to_char.get(int(i), ''))
        prev = i
    transcript = ''.join(tokens).replace('\u2581', ' ').strip()
    # Strip <unk> and other special tokens
    transcript = re.sub(r'<[^>]+>', '', transcript).strip()
    return transcript


def transcribe(audio_bytes: bytes, language: str = 'ar') -> str:
    """
    Transcribe audio using local FastConformer ONNX model.
    Accepts WebM, WAV, OGG, FLAC, MP3, etc.

    Returns transcribed Arabic text (may be empty for silence/noise).
    """
    _load_model()

    # 1. Decode audio to 16 kHz float32
    audio = _audio_bytes_to_float32(audio_bytes)
    if len(audio) < 1600:  # < 100ms
        return ''

    # Skip silence — if RMS energy is too low, don't bother running the model
    rms = float(np.sqrt(np.mean(audio ** 2)))
    if rms < 0.005:
        return ''

    # 2. Compute mel spectrogram
    mel = _compute_mel(audio)

    # 3. Run ONNX inference
    features = mel[np.newaxis]  # [1, 80, T]
    length = np.array([mel.shape[1]], dtype=np.int64)

    logprobs = _session.run(None, {
        _session.get_inputs()[0].name: features,
        _session.get_inputs()[1].name: length,
    })[0]  # [1, T, vocab_size]

    # 4. CTC greedy decode
    transcript = _ctc_decode(logprobs)
    return transcript


def is_available() -> bool:
    """Check whether the local ONNX model files are present."""
    return os.path.exists(MODEL_PATH) and os.path.exists(VOCAB_PATH)
