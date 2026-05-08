"""
app.py — Flask + Flask-SocketIO alignment server
Receives transcripts from Google Web Speech API (via browser),
returns word-level alignment results.

Events:
  Client → Server:
    set_sura   { sura: int }          → loads surah, emits surah_words
    transcript { text: str }          → aligns, emits alignment_result
    reset                             → resets session position

  Server → Client:
    surah_words       { words: [...] }
    alignment_result  { matches: [...], confidence, mode, sequence_error? }
    error             { message: str }
"""

import json
import os
import sys
import torch
import logging
import io
import eventlet
from dotenv import load_dotenv

# Fix for Windows CUDA detection in virtual environments
try:
    if os.name == 'nt':
        cuda_bin = os.path.join(os.path.dirname(__file__), '.venv', 'Lib', 'site-packages', 'nvidia', 'cuda_runtime', 'bin')
        if os.path.exists(cuda_bin):
            os.add_dll_directory(cuda_bin)
            print(f"Added CUDA DLL directory: {cuda_bin}")
except Exception as e:
    print(f"Error setting CUDA DLL path: {e}")

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

from quran_alignment import QuranAlignmentEngine
from sequence_analyzer import SequenceAnalyzer
from session_manager import SessionManager
import asr_local as asr
import database as db

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("Initializing SQLite database...")
try:
    db.init_db()
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
# ── Load .env ───────────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

if asr.is_available():
    logger.info('Local FastConformer ONNX model found — offline ASR active')
else:
    logger.warning('ONNX model files missing — audio_chunk will fail. See asr_local.py for download instructions')

# ── Muaalem Tajweed Model Setup ───────────────────────────────────────────────
import torch
import sys
import os

try:
    # Model code now resides locally in the project folder
    from quran_muaalem.inference import Muaalem
    from quran_muaalem.explain_gradio import explain_for_gradio
    from quran_transcript import quran_phonetizer, MoshafAttributes

    logger.info("Initializing Muaalem Tajweed model...")
    muaalem_device = "cuda" if torch.cuda.is_available() else "cpu"
    muaalem = Muaalem(model_name_or_path="obadx/muaalem-model-v3_2", device=muaalem_device)
    moshaf = MoshafAttributes(
        rewaya="hafs",
        madd_monfasel_len=4,
        madd_mottasel_len=4,
        madd_mottasel_waqf=4,
        madd_aared_len=4,
    )
    logger.info("Muaalem Tajweed model ready.")
except ImportError as e:
    logger.error(f"Cannot import quran_muaalem dependencies (ensure they are installed): {e}")
    muaalem = None
except Exception as e:
    logger.error(f"Failed to load Muaalem model: {e}")
    muaalem = None

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet',
                    max_http_buffer_size=5 * 1024 * 1024)  # 5 MB for audio chunks

# ── Load Quran data ─────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), 'assets', 'hafs_smart_v8.json')
TASHKEEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'quran.json')

try:
    with open(DATA_PATH, encoding='utf-8') as f:
        raw_data = json.load(f)
    with open(TASHKEEL_PATH, encoding='utf-8') as f:
        tashkeel_data = json.load(f)
    logger.info(f"Loaded {len(raw_data)} Ayahs from local assets.")
except Exception as e:
    logger.error(f"Failed to load local Quran data: {e}")
    raw_data = []
    tashkeel_data = []

from config import Config as AppConfig

# Initialize engine with actual data
engine = QuranAlignmentEngine(raw_data, config=AppConfig)

seq_analyzer = SequenceAnalyzer(
    skip_min_words=AppConfig.SEQUENCE_SKIP_MIN_WORDS,
    skip_min_ayas=AppConfig.SEQUENCE_SKIP_MIN_AYAS,
    backwards_tolerance=getattr(AppConfig, 'BACKWARDS_TOLERANCE', 5),
)

sessions = SessionManager(
    confidence_threshold=AppConfig.CONFIDENCE_THRESHOLD,
    max_low=AppConfig.MAX_LOW_CONFIDENCE,
)

# Pre-populated SURAH_LIST from local metadata (fast, only headers)
SURAH_LIST = []
try:
    with open(os.path.join(os.path.dirname(__file__), 'assets', 'hafs_smart_v8.json'), encoding='utf-8') as f:
        _raw = json.load(f)
        _seen = set()
        for aya in _raw:
            sno = aya['sura_no']
            if sno not in _seen:
                _seen.add(sno)
                SURAH_LIST.append({
                    'num': sno,
                    'name': aya.get('sura_name_en', f'Surah {sno}'),
                    'arabic': aya.get('sura_name_ar', '')
                })
        SURAH_LIST.sort(key=lambda s: s['num'])
    logger.info(f"Pre-populated {len(SURAH_LIST)} Surahs for navigation.")
except Exception as e:
    logger.error(f"Failed to pre-populate SURAH_LIST: {e}")

logger.info("Server ready. Verse text will be fulfilled dynamically via api.quran.com")


# ── Load Tafsir data once ──────────────────────────────────────────────────────
import sqlite3
logger.info("Loading Tafsir data into memory...")
TAFSIR_DB_PATH = os.path.join(os.path.dirname(__file__), 'tafsir_rag', 'tafsir.sqlite3')
tafsir_cache = {}
try:
    if os.path.exists(TAFSIR_DB_PATH):
        conn = sqlite3.connect(TAFSIR_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT surah, ayah, text FROM tafsir")
        for row in cursor.fetchall():
            sura, ayah, text = row
            if sura not in tafsir_cache:
                tafsir_cache[sura] = {}
            tafsir_cache[sura][ayah] = text
        conn.close()
        logger.info("Tafsir data loaded successfully.")
    else:
        logger.warning(f"Tafsir DB not found at {TAFSIR_DB_PATH}")
except Exception as e:
    logger.error(f"Error loading Tafsir data: {e}")


logger.info(f"Quran alignment engine ready. {len(SURAH_LIST)} surahs indexed.")

# ── REST endpoints for Learn page ─────────────────────────────────────────────
from flask import jsonify, request



@app.route('/api/surahs')
def api_surahs():
    """Return list of surahs with ayah counts."""
    counts = {}
    for aya in raw_data:
        sno = aya['sura_no']
        counts[sno] = counts.get(sno, 0) + 1
    result = []
    for s in SURAH_LIST:
        result.append({**s, 'ayah_count': counts.get(s['num'], 0)})
    return jsonify(result)

@app.route("/api/tafsir/<int:sura_no>")
def api_tafsir_surah(sura_no):
    if sura_no in tafsir_cache:
        return jsonify(tafsir_cache[sura_no])
    return jsonify({"error": "Surah not found in tafsir"}), 404

@app.route('/api/surah/<int:sura_no>')
def api_surah(sura_no):
    """Return all ayahs for a given surah."""
    ayahs = [a for a in raw_data if a['sura_no'] == sura_no]
    if not ayahs:
        return jsonify({'error': 'Surah not found'}), 404
    return jsonify({
        'sura_no': sura_no,
        'name_en': ayahs[0].get('sura_name_en', ''),
        'name_ar': ayahs[0].get('sura_name_ar', ''),
        'ayahs': [{
            'id': a['id'],
            'aya_no': a['aya_no'],
            'text': tashkeel_data[a['id'] - 1].get('text_uthmani', a.get('aya_text_emlaey', '')),
            'text_uthmani': a.get('aya_text', ''),
        } for a in ayahs]
    })

@app.route('/api/lessons')
def api_lessons():
    return jsonify(db.get_lessons())

@app.route('/api/quiz/<int:lesson_id>')
def api_quiz(lesson_id):
    return jsonify(db.get_quiz(lesson_id))

@app.route('/api/progress', methods=['POST'])
def api_update_progress():
    data = request.json
    lesson_id = data.get('lesson_id')
    score = data.get('score')
    mistakes = data.get('mistakes', []) # list of question IDs
    db.update_progress(lesson_id, score, mistakes)
    return jsonify({'status': 'ok'})

@app.route('/api/stats')
def api_stats():
    return jsonify(db.get_stats())

# ── Socket events ─────────────────────────────────────────────────────────────

@socketio.on('connect')
def on_connect():
    sessions.create(request_sid())
    emit('surah_list', {'surahs': SURAH_LIST})
    logger.info(f"Client connected: {request_sid()}")


@socketio.on('disconnect')
def on_disconnect():
    sessions.delete(request_sid())
    logger.info(f"Client disconnected: {request_sid()}")


@socketio.on('set_sura')
def on_set_sura(data):
    sid = request_sid()
    try:
        sura = int(data.get('sura', 1))
        # Get authoritative words for the surah
        words = engine.get_surah_words(sura)
        
        # Reset tracker position for this session
        state = sessions.get(sid)
        if state:
            state.global_word_pos = words[0]['global_index'] if words else 0
            state.current_sura = sura
            state.first_global = state.global_word_pos

        emit('surah_words', {
            'sura': sura,
            'words': words
        })
        logger.info(f"[{sid}] Loaded Surah {sura}: {len(words)} words")
    except Exception as e:
        logger.exception(e)
        emit('error', {'message': str(e)})


@socketio.on('set_recitation_range')
def on_set_recitation_range(data):
    sid = request_sid()
    try:
        sura = int(data.get('sura', 1))
        start_aya = int(data.get('start_aya', 1))
        end_aya = int(data.get('end_aya', start_aya)) # Default to just start aya
        
        first_global = engine.get_ayah_first_index(sura, start_aya)
        state = sessions.get(sid)
        state.global_word_pos = first_global
        state.first_global = first_global
        state.end_aya = end_aya # Store for potential windowing
        state.mode = 'tracking'
        state.consecutive_low = 0
        
        logger.info(f"[{sid}] Range set: Sura {sura}, Aya {start_aya} to {end_aya} (Global index {first_global})")
    except Exception as e:
        logger.exception(e)
        emit('error', {'message': str(e)})


@socketio.on('transcript')
def on_transcript(data):
    """Handle text transcripts (Web Speech API fallback)."""
    sid = request_sid()
    text = data.get('text', '').strip()
    is_interim = data.get('is_interim', False)
    if not text:
        return

    _run_alignment(sid, text, is_interim)


@socketio.on('start_streaming')
def on_start_streaming(data):
    sid = request_sid()
    state = sessions.get(sid)
    
    sura = data.get('sura', 1)
    start_aya = data.get('start_aya', 1)
    end_aya = data.get('end_aya', start_aya)
    
    try:
        from quran_transcript import Aya
        aya_segments = []  # [{aya_num, text, char_start, char_end}]
        texts = []
        for a_num in range(int(start_aya), int(end_aya) + 1):
            aya_text = Aya(int(sura), a_num).get().uthmani
            aya_segments.append({'aya_num': a_num, 'text': aya_text})
            texts.append(aya_text)
        uthmani_ref = " ".join(texts)
        
        # Build character-to-aya mapping
        # Track the character offset of each aya within the concatenated string
        char_offset = 0
        for seg in aya_segments:
            seg['char_start'] = char_offset
            seg['char_end'] = char_offset + len(seg['text'])
            char_offset = seg['char_end'] + 1  # +1 for the space separator
    except Exception as e:
        logger.error(f"Error fetching Uthmani ref: {e}")
        uthmani_ref = ""
        aya_segments = []
        
    setattr(state, 'target_uthmani_ref', uthmani_ref)
    setattr(state, 'aya_segments', aya_segments)
    state.streaming_active = True
    state.audio_buffer = []
    setattr(state, 'chunks_received', 0)
    setattr(state, 'last_inf_duration', 0)
    
    socketio.start_background_task(inference_loop, sid)
    logger.info(f"[{sid}] Started Muaalem streaming analysis. Ref: {uthmani_ref}")


@socketio.on('stop_streaming')
def on_stop_streaming(data=None):
    sid = request_sid()
    state = sessions.get(sid)
    state.streaming_active = False
    logger.info(f"[{sid}] Stopped Muaalem streaming analysis.")


def inference_loop(sid):
    import librosa
    from quran_transcript import MoshafAttributes, quran_phonetizer
    import diff_match_patch as dmp
    from quran_muaalem.explain import SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS, segment_groups
    import quran_transcript.alphabet as alph
    import dataclasses
    import re
    import numpy as np
    
    logger.info(f"[{sid}] Inference loop started")
    
    while True:
        eventlet.sleep(0.3)  # check every 300ms
        
        state = sessions.get(sid)
        if not state or not getattr(state, 'streaming_active', False):
            break
            
        if not getattr(state, 'inference_needed', False):
            continue
            
        state.inference_needed = False
        audio_chunks = list(state.audio_buffer)
        
        if not audio_chunks:
            continue
            
        # Combine wav files
        try:
            # We assume audio_chunks is a list of WAV bytes from the client
            # The client sends a fully encoded WAV file for each chunk.
            # We can use soundfile or librosa to read them.
            # However, librosa.load can read file-like objects
            combined_wave = []
            for chunk_bytes in audio_chunks:
                wave, _ = librosa.load(io.BytesIO(chunk_bytes), sr=16000, mono=True)
                combined_wave.extend(wave)
                
            wave = np.array(combined_wave)
            
            if len(wave) < 16000 * 0.3: # Need at least 0.3s
                continue
                
            uthmani_ref = getattr(state, 'target_uthmani_ref', "")
            
            if not uthmani_ref or not muaalem:
                continue

            import time
            t0 = time.perf_counter()

            # Moshaf Settings
            current_settings = {
                "rewaya": "hafs",
                "madd_monfasel_len": 4,
                "madd_mottasel_len": 4,
                "madd_mottasel_waqf": 4,
                "madd_aared_len": 4
            }
            if state.moshaf_settings:
                current_settings.update(state.moshaf_settings)
            current_moshaf = MoshafAttributes(**current_settings)

            phonetizer_out = quran_phonetizer(
                uthmani_ref, current_moshaf, remove_spaces=True
            )
            
            outs = muaalem(
                [wave],
                [phonetizer_out],
                sampling_rate=16000,
            )
            
            if not outs or not outs[0]:
                continue
                
            # Alignment & diff logic mapping (same as offline tajweed_analyze)
            dmp_obj = dmp.diff_match_patch()
            exp_phonemes = phonetizer_out.phonemes
            pronounced_phonemes = outs[0].phonemes.text
            diffs = dmp_obj.diff_main(exp_phonemes, pronounced_phonemes)
            
            ph_to_uthmani = [[] for _ in range(len(exp_phonemes))]
            for u_idx, m in enumerate(phonetizer_out.mappings):
                if m is not None and not m.deleted:
                    for p_idx in range(m.pos[0], m.pos[1]):
                        if p_idx < len(exp_phonemes):
                            ph_to_uthmani[p_idx].append(u_idx)
                            
            chars_out = [{'char': c, 'error': False, 'inserts': [], 'deletes': []} for c in uthmani_ref]
            
            chunks = [s.phonemes_group for s in outs[0].sifat]
            exp_chunks = [s.phonemes for s in phonetizer_out.sifat]
            groups = segment_groups(ref_groups=exp_chunks, groups=chunks, diffs=diffs)

            group_to_p_idxs = []
            curr_p = 0
            for chunk in exp_chunks:
                group_to_p_idxs.append(list(range(curr_p, curr_p + len(chunk))))
                curr_p += len(chunk)

            sifat_messages_by_ref_idx = {}
            madd_group = alph.phonetics.alif + alph.phonetics.yaa_madd + alph.phonetics.waw_madd
            keys = set(dataclasses.asdict(outs[0].sifat[0]).keys()) - {"phonemes_group"}
            last_ref_i = 0

            def resolve_u_idxs(target_group_idx):
                u_idxs = []
                if target_group_idx < len(group_to_p_idxs):
                    for p_idx in group_to_p_idxs[target_group_idx]:
                        if p_idx < len(ph_to_uthmani):
                            u_idxs.extend(ph_to_uthmani[p_idx])
                if not u_idxs:
                    search_down, search_up = target_group_idx - 1, target_group_idx + 1
                    while not u_idxs and (search_down >= 0 or search_up < len(group_to_p_idxs)):
                        if search_down >= 0:
                            for p_idx in group_to_p_idxs[search_down]:
                                if p_idx < len(ph_to_uthmani):
                                    u_idxs.extend(ph_to_uthmani[p_idx])
                            search_down -= 1
                        if not u_idxs and search_up < len(group_to_p_idxs):
                            for p_idx in group_to_p_idxs[search_up]:
                                if p_idx < len(ph_to_uthmani):
                                    u_idxs.extend(ph_to_uthmani[p_idx])
                            search_up += 1
                return list(set(u_idxs))

            for group in groups:
                tag = group.get_tag()
                ref_i = group.ref_idx
                if ref_i is not None:
                    last_ref_i = ref_i
                out_i = group.out_idx
                
                if (tag == "exact") or (tag == "partial" and group.ref[0] in madd_group):
                    if ref_i is None or ref_i >= len(group_to_p_idxs):
                        continue
                    has_sifat_error = False
                    msgs = []
                    exp_phonemes_text = getattr(phonetizer_out.sifat[ref_i], "phonemes", "")
                    out_phonemes_text = getattr(outs[0].sifat[out_i], "phonemes_group", "")
                    if exp_phonemes_text != out_phonemes_text:
                        has_sifat_error = True
                        msgs.append(f"تغيير في الحرف: المفروض ({exp_phonemes_text}) وأنت نطقتها ({out_phonemes_text})")
                    for key in keys:
                        exp_val_obj = getattr(phonetizer_out.sifat[ref_i], key)
                        exp_val = str(exp_val_obj) if exp_val_obj is not None else "None"
                        out_val_obj = getattr(outs[0].sifat[out_i], key)
                        out_val = str(out_val_obj.text) if out_val_obj is not None else "None"
                        if out_val != exp_val:
                            has_sifat_error = True
                            ar_feat = SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS.get(key, key)
                            msgs.append(f"خطأ في {ar_feat}: المفروض ({exp_val}) وأنت نطقتها ({out_val})")
                    if has_sifat_error:
                        sifat_messages_by_ref_idx[ref_i] = msgs
                        for u in resolve_u_idxs(ref_i):
                            if u < len(chars_out):
                                chars_out[u]['error'] = True
                                if '\u064B' <= chars_out[u]['char'] <= '\u065F':
                                    pre = u - 1
                                    while pre >= 0 and '\u064B' <= chars_out[pre]['char'] <= '\u065F':
                                        pre -= 1
                                    if pre >= 0:
                                        chars_out[pre]['error'] = True

                elif tag in {"partial", "insert"} and out_i is not None:
                    attach_idx = ref_i if ref_i is not None else last_ref_i
                    if attach_idx is not None and attach_idx < len(group_to_p_idxs):
                        if attach_idx not in sifat_messages_by_ref_idx:
                            sifat_messages_by_ref_idx[attach_idx] = []
                        sifat_messages_by_ref_idx[attach_idx].append(f"نطق حرف أو حركة زائدة ({outs[0].sifat[out_i].phonemes_group})")
                        for u in resolve_u_idxs(attach_idx):
                            if u < len(chars_out):
                                chars_out[u]['error'] = True

                elif tag == "delete" and ref_i is not None and ref_i < len(group_to_p_idxs):
                    if ref_i not in sifat_messages_by_ref_idx:
                        sifat_messages_by_ref_idx[ref_i] = []
                    sifat_messages_by_ref_idx[ref_i].append(f"نسيت نطق ({phonetizer_out.sifat[ref_i].phonemes})")
                    for u in resolve_u_idxs(ref_i):
                        if u < len(chars_out):
                            chars_out[u]['error'] = True

            word_details = []
            aya_segments = getattr(state, 'aya_segments', [])
            
            def get_aya_for_char(char_pos):
                """Find which aya a character position belongs to."""
                for seg in aya_segments:
                    if seg['char_start'] <= char_pos < seg['char_end']:
                        return seg['aya_num']
                # Fallback: return last aya
                return aya_segments[-1]['aya_num'] if aya_segments else None
            
            target_idx = 0
            for match in re.finditer(r'\S+', uthmani_ref):
                w = match.group()
                start, end = match.span()
                w_chars = chars_out[start:end]
                has_error = any(c['error'] or len(c['inserts']) > 0 for c in w_chars)
                
                # Determine aya number from character position
                word_aya = get_aya_for_char(start)
                
                error_descriptions = set()
                for i, c in enumerate(w_chars):
                    char_abs_idx = start + i
                    for p_idx, u_list in enumerate(ph_to_uthmani):
                        if char_abs_idx in u_list and p_idx in sifat_messages_by_ref_idx:
                            for msg in sifat_messages_by_ref_idx[p_idx]:
                                error_descriptions.add(msg)
                
                html_content = ""
                current_state = None
                current_buffer = ""
                
                def flush_buffer():
                    nonlocal html_content, current_buffer
                    if current_buffer:
                        if current_state == 'error':
                            html_content += f"<span style='color: #ef4444; font-weight: bold; text-decoration: underline; text-decoration-color: #ef4444;' class='tajweed-error' title='{chr(10).join(error_descriptions)}'>{current_buffer}</span>"
                        else:
                            html_content += current_buffer
                    current_buffer = ""

                for c in w_chars:
                    tag_state = 'error' if c['error'] else 'normal'
                    if tag_state != current_state:
                        flush_buffer()
                        current_state = tag_state
                    current_buffer += c['char']
                        
                flush_buffer()
                
                word_details.append({
                    'text': w,
                    'has_error': has_error,
                    'html_content': html_content,
                    'error_descriptions': list(error_descriptions),
                    'aya': word_aya
                })
                
            t1 = time.perf_counter()
            duration_ms = (t1 - t0) * 1000
            setattr(state, 'last_inf_duration', duration_ms)
            
            metrics = {
                'buffer_s': len(wave) / 16000,
                'chunks': getattr(state, 'chunks_received', 0),
                'last_inf_ms': duration_ms,
                'active': getattr(state, 'streaming_active', False)
            }
                
            socketio.emit('tajweed_streaming_result', {'word_details': word_details, 'metrics': metrics}, to=sid)
            
        except Exception as e:
            logger.exception(f"[{sid}] Inference loop error: {e}")

@socketio.on('audio_chunk')
def on_audio_chunk(data):
    """Handle binary audio from MediaRecorder → Groq Whisper / Muaalem streaming."""
    sid = request_sid()
    audio_bytes = bytes(data) if not isinstance(data, bytes) else data

    if len(audio_bytes) < 200:
        return  # too small / silence
        
    state = sessions.get(sid)
    if state and getattr(state, 'streaming_active', False):
        state.audio_buffer.append(audio_bytes)
        state.inference_needed = True
        setattr(state, 'chunks_received', getattr(state, 'chunks_received', 0) + 1)
        return  # Bypass Whisper ASR completely during streaming

    try:
        transcript = asr.transcribe(audio_bytes)
    except Exception as e:
        logger.error(f'[{sid}] Whisper error: {e}')
        emit('error', {'message': f'ASR error: {e}'})
        return

    if not transcript or len(transcript) < 2:
        return  # noise / silence

    logger.info(f'[{sid}] ASR: "{transcript}"')
    
    # If a sura is loaded, we run alignment (RecitePage usage)
    if state and state.current_sura:
        _run_alignment(sid, transcript, is_interim=False)
    
    # Always emit transcript for global navigation (VoiceNav usage)
    emit('nav_command_transcript', {'text': transcript})


def _run_alignment(sid, text, is_interim=False):
    """Shared alignment logic for both transcript and audio_chunk events."""

    state = sessions.get(sid)
    logger.debug(f"[{sid}] {'(interim) ' if is_interim else ''}Transcript: '{text}' | pos={state.global_word_pos}")

    try:
        result = engine.align(
            transcript=text,
            anchor_pos=state.global_word_pos,
            mode=state.mode,
            page_verse_ids=state.page_verse_ids or None,
            current_sura=state.current_sura,
        )

        if not is_interim:
            # Only advance position and run sequence analysis on final results
            prev_pos = state.global_word_pos
            sessions.update_from_alignment(sid, result.confidence, result.furthest_global_index)
            state = sessions.get(sid)

            seq_error = seq_analyzer.analyze(
                prev_pos=prev_pos,
                alignment_result=result,
                all_words=engine.all_words,
                consecutive_low=state.consecutive_low
            )

            # Record recitation mistakes
            for m in result.matches:
                if m.quran_word and not m.is_correct:
                    aya_num = getattr(m.quran_word, 'aya_no', getattr(m.quran_word, 'aya', 1))
                    db.add_recitation_mistake(
                        state.current_sura,
                        aya_num,
                        m.quran_word.text
                    )
        else:
            seq_error = None   # don't flag errors on partial speech

        # Build response
        matches_out = []
        for m in result.matches:
            matches_out.append({
                'spoken_word': m.spoken_word,
                'global_index': m.quran_word.global_index if m.quran_word else None,
                'similarity': round(m.similarity, 3),
                'alignment_type': m.alignment_type,
                'is_correct': m.is_correct,
            })

        response = {
            'matches': matches_out,
            'confidence': round(result.confidence, 3),
            'furthest_pos': result.furthest_global_index,
            'mode': state.mode,
            'is_interim': is_interim,
        }
        if seq_error:
            response['sequence_error'] = {
                'type': seq_error.error_type,
                'severity': seq_error.severity,
                'message': seq_error.message,
                'details': seq_error.details,
            }

        emit('alignment_result', response)

    except Exception as e:
        logger.exception(e)
        emit('error', {'message': str(e)})


@socketio.on('reset')
def on_reset():
    sessions.reset_position(request_sid())
    emit('reset_ok', {})


@socketio.on('set_moshaf_settings')
def on_set_moshaf_settings(data):
    sid = getattr(request, 'sid', None)
    if not sid: return
    state = sessions.get(sid)
    state.moshaf_settings.update(data)
    logger.info(f"Session {sid} updated moshaf settings: {data}")

@socketio.on('tajweed_analyze')
def on_tajweed_analyze(data):
    """
    Batch tajweed analysis using `quran_muaalem`.
    Converts audio buffer and compares it against intended recited words.
    """
    sid = request_sid()
    audio_bytes = data.get('audio')
    sura = data.get('sura')

    logger.info(f'[{sid}] tajweed_analyze received — sura={sura}, audio={len(audio_bytes) if audio_bytes else 0} bytes')
    
    if not audio_bytes:
        emit('tajweed_error', {'message': 'No audio received.'})
        return

    if not muaalem:
        emit('tajweed_error', {'message': 'Muaalem tajweed model is not available on backend.'})
        return

    test_mode = data.get('test_mode', 'tajweed')
    
    if test_mode == 'tajweed':
        sura = data.get('sura')
        start_aya = data.get('start_aya')
        end_aya = data.get('end_aya')
        
        # Fallback if range not provided (legacy single aya logic)
        if start_aya is None:
            aya = data.get('aya')
            start_idx = data.get('start_idx', 0)
            num_words = data.get('num_words', 10)
            try:
                from quran_transcript import Aya
                uthmani_ref = Aya(int(sura), int(aya)).get_by_imlaey_words(int(start_idx), int(num_words)).uthmani
            except Exception as e:
                emit('tajweed_error', {'message': f'Invalid selection: {str(e)}'})
                return
        else:
            try:
                from quran_transcript import Aya
                texts = []
                for a_num in range(int(start_aya), int(end_aya) + 1):
                    # Get full ayah text
                    texts.append(Aya(int(sura), a_num).get().uthmani)
                uthmani_ref = " ".join(texts)
            except Exception as e:
                emit('tajweed_error', {'message': f'Invalid range selection: {str(e)}'})
                return
    else:
        # Fallback for 'memorization' if needed
        sid = request_sid()
        state = sessions.get(sid)
        if state.first_global == state.global_word_pos:
            emit('tajweed_error', {'message': 'No words recited to analyze.'})
            return
        target_words = engine.all_words[state.first_global : state.global_word_pos]
        uthmani_ref = " ".join([w.text for w in target_words])

    if not uthmani_ref:
        emit('tajweed_error', {'message': 'Target words string (uthmani_ref) is empty.'})
        return

    try:
        emit('tajweed_progress', {'progress': 10})
        
        emit('tajweed_progress', {'progress': 30})
        
        # 2. Write audio to a temp file and load via librosa
        import tempfile, os, librosa
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes if isinstance(audio_bytes, bytes) else bytes(audio_bytes))
            tmp_path = tmp.name
            
        wave, _ = librosa.load(tmp_path, sr=16000, mono=True)
        os.remove(tmp_path)
        
        emit('tajweed_progress', {'progress': 50})
        
        # 3. Process the reference text
        sid = getattr(request, 'sid', None)
        state = sessions.get(sid) if sid else None
        
        # Merge session settings with defaults
        current_settings = {
            "rewaya": "hafs",
            "madd_monfasel_len": 4,
            "madd_mottasel_len": 4,
            "madd_mottasel_waqf": 4,
            "madd_aared_len": 4
        }
        if state and state.moshaf_settings:
            current_settings.update(state.moshaf_settings)
            
        current_moshaf = MoshafAttributes(**current_settings)

        phonetizer_out = quran_phonetizer(
            uthmani_ref, current_moshaf, remove_spaces=True
        )
        
        emit('tajweed_progress', {'progress': 70})
        
        # 4. Run inference
        outs = muaalem(
            [wave],
            [phonetizer_out],
            sampling_rate=16000,
        )
        
        emit('tajweed_progress', {'progress': 90})

        # 5. Format results into HTML table (same as Gradio UI)
        explanation_html = explain_for_gradio(
            outs[0].phonemes.text,
            phonetizer_out.phonemes,
            outs[0].sifat,
            phonetizer_out.sifat,
            lang="arabic",
        )
        
        # 6. Map phoneme errors back to Uthmani Words boundaries
        import diff_match_patch as dmp
        from quran_muaalem.explain import expalin_sifat, segment_groups
        dmp_obj = dmp.diff_match_patch()
        exp_phonemes = phonetizer_out.phonemes
        pronounced_phonemes = outs[0].phonemes.text
        diffs = dmp_obj.diff_main(exp_phonemes, pronounced_phonemes)
        
        # Sifat Table
        sifat_table = expalin_sifat(outs[0].sifat, phonetizer_out.sifat, diffs)
        
        # Pre-compute phoneme index -> list of uthmani indices
        ph_to_uthmani = [[] for _ in range(len(exp_phonemes))]
        for u_idx, m in enumerate(phonetizer_out.mappings):
            if m is not None and not m.deleted:
                for p_idx in range(m.pos[0], m.pos[1]):
                    if p_idx < len(exp_phonemes):
                        ph_to_uthmani[p_idx].append(u_idx)
                        
        # Map Diff Ops to Uthmani Characters
        chars_out = [{'char': c, 'error': False, 'inserts': [], 'deletes': []} for c in uthmani_ref]
        ph_error_mapping = [False] * len(exp_phonemes)

        curr_ph_idx = 0
        for op, text in diffs:
            if op == dmp_obj.DIFF_EQUAL:
                curr_ph_idx += len(text)
            elif op == dmp_obj.DIFF_DELETE:
                # We do NOT mark Uthmani character as error here because string diffs produce severe false positives.
                # All true pronunciation errors will be captured by the Sifat Matrix cross-referencing below.
                curr_ph_idx += len(text)
            elif op == dmp_obj.DIFF_INSERT:
                # We completely ignore strict string diff bounds.
                # If an insertion is musically significant, the Sifat Matrix will flag it as (row.get("tag") == "insert").
                pass
        
        # Map Sifat Matrix anomalies to the phoneme mapping
        from quran_muaalem.explain import SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS, segment_groups
        import quran_transcript.alphabet as alph
        import dataclasses
        
        chunks = [s.phonemes_group for s in outs[0].sifat]
        exp_chunks = [s.phonemes for s in phonetizer_out.sifat]
        groups = segment_groups(ref_groups=exp_chunks, groups=chunks, diffs=diffs)

        # Map group index -> list of constituent phoneme string character indices
        group_to_p_idxs = []
        curr_p = 0
        for chunk in exp_chunks:
            group_to_p_idxs.append(list(range(curr_p, curr_p + len(chunk))))
            curr_p += len(chunk)

        sifat_messages_by_ref_idx = {}
        madd_group = alph.phonetics.alif + alph.phonetics.yaa_madd + alph.phonetics.waw_madd
        keys = set(dataclasses.asdict(outs[0].sifat[0]).keys()) - {"phonemes_group"}
        last_ref_i = 0

        def resolve_u_idxs(target_group_idx):
            u_idxs = []
            if target_group_idx < len(group_to_p_idxs):
                for p_idx in group_to_p_idxs[target_group_idx]:
                    if p_idx < len(ph_to_uthmani):
                        u_idxs.extend(ph_to_uthmani[p_idx])
            if not u_idxs:
                search_down, search_up = target_group_idx - 1, target_group_idx + 1
                while not u_idxs and (search_down >= 0 or search_up < len(group_to_p_idxs)):
                    if search_down >= 0:
                        for p_idx in group_to_p_idxs[search_down]:
                            if p_idx < len(ph_to_uthmani):
                                u_idxs.extend(ph_to_uthmani[p_idx])
                        search_down -= 1
                    if not u_idxs and search_up < len(group_to_p_idxs):
                        for p_idx in group_to_p_idxs[search_up]:
                            if p_idx < len(ph_to_uthmani):
                                u_idxs.extend(ph_to_uthmani[p_idx])
                        search_up += 1
            return list(set(u_idxs))

        for group in groups:
            tag = group.get_tag()
            ref_i = group.ref_idx
            if ref_i is not None:
                last_ref_i = ref_i
            out_i = group.out_idx
            
            # Map EXACT matches but check for detailed Sifat mismatch
            if (tag == "exact") or (tag == "partial" and group.ref[0] in madd_group):
                if ref_i is None or ref_i >= len(group_to_p_idxs):
                    continue
                
                has_sifat_error = False
                msgs = []
                
                # 1. Compare Phoneme texts directly
                exp_phonemes_text = getattr(phonetizer_out.sifat[ref_i], "phonemes", "")
                out_phonemes_text = getattr(outs[0].sifat[out_i], "phonemes_group", "")
                if exp_phonemes_text != out_phonemes_text:
                    has_sifat_error = True
                    msgs.append(f"تغيير في الحرف: المفروض ({exp_phonemes_text}) وأنت نطقتها ({out_phonemes_text})")
                
                # 2. Compare isolated Sifat attributes
                for key in keys:
                    exp_val_obj = getattr(phonetizer_out.sifat[ref_i], key)
                    exp_val = str(exp_val_obj) if exp_val_obj is not None else "None"
                    
                    out_val_obj = getattr(outs[0].sifat[out_i], key)
                    out_val = str(out_val_obj.text) if out_val_obj is not None else "None"
                    
                    if out_val != exp_val:
                        has_sifat_error = True
                        ar_feat = SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS.get(key, key)
                        msgs.append(f"خطأ في {ar_feat}: المفروض ({exp_val}) وأنت نطقتها ({out_val})")
                
                if has_sifat_error:
                    sifat_messages_by_ref_idx[ref_i] = msgs
                    ph_error_mapping[ref_i] = True
                    for u in resolve_u_idxs(ref_i):
                        if u < len(chars_out):
                            chars_out[u]['error'] = True
                            if '\u064B' <= chars_out[u]['char'] <= '\u065F':
                                pre = u - 1
                                while pre >= 0 and '\u064B' <= chars_out[pre]['char'] <= '\u065F':
                                    pre -= 1
                                if pre >= 0:
                                    chars_out[pre]['error'] = True

            # Map INSERTIONS
            elif tag in {"partial", "insert"} and out_i is not None:
                # Target the closest expected phoneme group index. Fallback to last_ref_i if ref_i is None.
                attach_idx = ref_i if ref_i is not None else last_ref_i
                if attach_idx is not None and attach_idx < len(group_to_p_idxs):
                    msg = f"نطق حرف أو حركة زائدة ({outs[0].sifat[out_i].phonemes_group})"
                    if attach_idx not in sifat_messages_by_ref_idx:
                        sifat_messages_by_ref_idx[attach_idx] = []
                    sifat_messages_by_ref_idx[attach_idx].append(msg)
                    ph_error_mapping[attach_idx] = True
                    for u in resolve_u_idxs(attach_idx):
                        if u < len(chars_out):
                            chars_out[u]['error'] = True

            # Also highlight DELETIONS visually inside Uthmani text 
            elif tag == "delete" and ref_i is not None and ref_i < len(group_to_p_idxs):
                msg = f"نسيت نطق ({phonetizer_out.sifat[ref_i].phonemes})"
                if ref_i not in sifat_messages_by_ref_idx:
                    sifat_messages_by_ref_idx[ref_i] = []
                sifat_messages_by_ref_idx[ref_i].append(msg)
                ph_error_mapping[ref_i] = True
                for u in resolve_u_idxs(ref_i):
                    if u < len(chars_out):
                        chars_out[u]['error'] = True

        # Split into Words Assembly
        import re
        word_details = []
        for match in re.finditer(r'\S+', uthmani_ref):
            w = match.group()
            start, end = match.span()
            w_chars = chars_out[start:end]
            has_error = any(c['error'] or len(c['inserts']) > 0 for c in w_chars)
            
            html_content = ""
            error_descriptions = set()
            
            # Map structural diff inserts mapping to textual info
            has_tashkeel_error = False
            for i, c in enumerate(w_chars):
                char_abs_idx = start + i
                if c['error'] or c['inserts']:
                    has_tashkeel_error = True
                    
                    if c['deletes'] and c['inserts']:
                        ins_str = "".join(c['inserts'])
                        del_str = "".join(c['deletes'])
                        error_descriptions.add(f"نطقت ({ins_str}) بدلاً من ({del_str})")
                    elif c['deletes']:
                        del_str = "".join(c['deletes'])
                        error_descriptions.add(f"نسيت نطق أو تجاهلت ({del_str})")
                    elif c['inserts']:
                        ins_str = "".join(c['inserts'])
                        error_descriptions.add(f"إضافة أو نطق خاطئ لـ ({ins_str})")

                for p_idx, u_list in enumerate(ph_to_uthmani):
                    if char_abs_idx in u_list and p_idx in sifat_messages_by_ref_idx:
                        for msg in sifat_messages_by_ref_idx[p_idx]:
                            error_descriptions.add(msg)
                            has_tashkeel_error = False
                            
            if has_tashkeel_error and not error_descriptions:
                error_descriptions.add("خطأ في النطق أو في نطق التشكيل")
                
            # Build HTML content with grouping to avoid breaking Arabic ligatures
            html_content = ""
            current_state = None
            current_buffer = ""
            
            def flush_buffer():
                nonlocal html_content, current_buffer
                if current_buffer:
                    if current_state == 'error':
                        html_content += f"<span style='color: #ef4444; font-weight: bold; text-decoration: underline; text-decoration-color: #ef4444;'>{current_buffer}</span>"
                    else:
                        html_content += current_buffer
                current_buffer = ""

            for c in w_chars:
                state = 'error' if c['error'] else 'normal'
                if state != current_state:
                    flush_buffer()
                    current_state = state
                current_buffer += c['char']
                
                # If there are inserts, we flush current buffer immediately, then append inserts in their own span
                # Wait, inserts shouldn't change the current state but they break the sequence
                if c['inserts']:
                    flush_buffer()
                    ins_text = "".join(c['inserts'])
                    html_content += f"<span class='text-red-500 font-bold opacity-90'>{ins_text}</span>"
                    current_state = None  # Force fresh state for the next char
                    
            flush_buffer()
                
            word_details.append({
                'text': w,
                'has_error': has_error,
                'html_content': html_content,
                'error_descriptions': list(error_descriptions)
            })

        emit('tajweed_progress', {'progress': 100})
        emit('tajweed_result', {
            'html': explanation_html,  # kept for fallback but not primarily used now
            'word_details': word_details,
            'sifat_table': sifat_table
        })
        
    except Exception as e:
        logger.exception(e)
        emit('tajweed_error', {'message': f'Tajweed analysis failed: {str(e)}'})


# ── Helper ────────────────────────────────────────────────────────────────────

def request_sid():
    from flask import request
    return request.sid


# ── Entry (used by run.py) ────────────────────────────────────────────────────


@app.route('/api/ayah/<int:sura_no>/<int:aya_no>')
def api_ayah(sura_no, aya_no):
    """Return specific ayah text and its tafsir."""
    ayah = next((a for a in raw_data if a['sura_no'] == sura_no and a['aya_no'] == aya_no), None)
    if not ayah:
        return jsonify({'error': 'Ayah not found'}), 404
        
    text = tashkeel_data[ayah['id'] - 1].get('text_uthmani', ayah.get('aya_text_emlaey', ''))
    tafsir_text = tafsir_cache.get(sura_no, {}).get(aya_no, "")
        
    return jsonify({
        'sura_no': sura_no,
        'aya_no': aya_no,
        'text': text,
        'name_en': ayah.get('sura_name_en', ''),
        'name_ar': ayah.get('sura_name_ar', ''),
        'tafsir': tafsir_text
    })

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5050, debug=True)
