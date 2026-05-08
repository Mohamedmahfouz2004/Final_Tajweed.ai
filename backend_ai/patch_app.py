import re

with open("/home/harb/tajweed.ai/backend/recite/app.py", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the /api/chat RAG endpoint
content = re.sub(
    r"@app\.route\('/api/chat'.*?def api_chat\(\):.*?return jsonify\(\{.*?\}\)",
    "",
    content,
    flags=re.DOTALL
)

# Load Tafsir into memory globally
mem_load = """
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
"""

# Insert mem_load under # ── Load Quran data once block
content = content.replace("logger.info(f\"Quran alignment engine ready.", mem_load + "\n\nlogger.info(f\"Quran alignment engine ready.")

# Update /api/tafsir/<sura_no>
new_api_tafsir = """@app.route("/api/tafsir/<int:sura_no>")
def api_tafsir_surah(sura_no):
    if sura_no in tafsir_cache:
        return jsonify(tafsir_cache[sura_no])
    return jsonify({"error": "Surah not found in tafsir"}), 404"""

content = re.sub(
    r"@app\.route\(\"/api/tafsir/<int:sura_no>\"\).*?def api_tafsir_surah\(sura_no\):.*?return jsonify\(\{\"error\": str\(e\)\}\), 500",
    new_api_tafsir,
    content,
    flags=re.DOTALL
)

# Update /api/ayah/<sura_no>/<aya_no>
new_api_ayah = """@app.route('/api/ayah/<int:sura_no>/<int:aya_no>')
def api_ayah(sura_no, aya_no):
    \"\"\"Return specific ayah text and its tafsir.\"\"\"
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
    })"""

content = re.sub(
    r"@app\.route\('/api/ayah/<int:sura_no>/<int:aya_no>'\).*?def api_ayah\(sura_no, aya_no\):.*?return jsonify\(\{.*?\}\)",
    new_api_ayah,
    content,
    flags=re.DOTALL
)

with open("/home/harb/tajweed.ai/backend/recite/app.py", "w", encoding="utf-8") as f:
    f.write(content)
print("done")
