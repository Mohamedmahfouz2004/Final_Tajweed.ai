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
import logging
from dotenv import load_dotenv
from flask import Flask
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
# ── Load .env ───────────────────────────────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

if asr.is_available():
    logger.info('Local FastConformer ONNX model found — offline ASR active')
else:
    logger.warning('ONNX model files missing — audio_chunk will fail. See asr_local.py for download instructions')
# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet',
                    max_http_buffer_size=5 * 1024 * 1024)  # 5 MB for audio chunks

# ── Load Quran data once ──────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), 'assets', 'hafs_smart_v8.json')
TASHKEEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'quran.json')
logger.info("Loading Quran data...")
with open(DATA_PATH, encoding='utf-8') as f:
    raw_data = json.load(f)
with open(TASHKEEL_PATH, encoding='utf-8') as f:
    tashkeel_data = json.load(f)

from config import Config as AppConfig

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

# Build surah list from raw data for the frontend
_seen = set()
SURAH_LIST = []
for aya in raw_data:
    sno = aya['sura_no']
    if sno not in _seen:
        _seen.add(sno)
        SURAH_LIST.append({
            'num': sno,
            'name': aya.get('sura_name_en', ''),
            'arabic': aya.get('sura_name_ar', ''),
        })
SURAH_LIST.sort(key=lambda s: s['num'])


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
        verse_ids = engine.get_page_verse_ids(sura)
        first_global = engine.get_surah_first_index(sura)
        sessions.set_sura(sid, sura, verse_ids, first_global)

        words = engine.get_surah_words(sura)
        emit('surah_words', {'sura': sura, 'words': words})
        logger.info(f"[{sid}] Loaded Surah {sura}: {len(words)} words, starting at global index {first_global}")
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


@socketio.on('audio_chunk')
def on_audio_chunk(data):
    """Handle binary audio from MediaRecorder → Groq Whisper → alignment."""
    sid = request_sid()
    audio_bytes = bytes(data) if not isinstance(data, bytes) else data

    if len(audio_bytes) < 200:
        return  # too small / silence

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
    state = sessions.get(sid)
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
                    db.add_recitation_mistake(
                        state.current_sura,
                        m.quran_word.aya_no,
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


@socketio.on('tajweed_analyze')
def on_tajweed_analyze(data):
    """
    Batch tajweed analysis — receives the full recording after user clicks Done.
    The tajweed model is NOT implemented yet. This is the placeholder event handler.

    Expected data:
        audio: ArrayBuffer (full WAV recording)
        sura:  int (surah number)

    Will emit:
        tajweed_progress { progress: int 0-100 }
        tajweed_result   { score, rules: [{name, name_ar, word, message, severity}] }
        tajweed_error    { message: str }
    """
    sid = request_sid()
    logger.info(f'[{sid}] tajweed_analyze received — sura={data.get("sura")}, audio={len(data.get("audio", b""))} bytes')

    # TODO: Replace this stub with actual tajweed model inference
    # For now, emit a placeholder response so the UI flow works end-to-end
    emit('tajweed_progress', {'progress': 10})
    import eventlet
    eventlet.sleep(0.5)
    emit('tajweed_progress', {'progress': 50})
    eventlet.sleep(0.5)
    emit('tajweed_progress', {'progress': 90})
    eventlet.sleep(0.3)

    # Stub result — will be replaced with real model output
    emit('tajweed_result', {
        'score': None,
        'rules': [],
        'message': 'Tajweed model not connected yet. This is a placeholder.',
    })


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
