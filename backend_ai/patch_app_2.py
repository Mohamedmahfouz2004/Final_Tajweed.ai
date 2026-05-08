import re

with open("/home/harb/tajweed.ai/backend/recite/app.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
in_api_ayah_block = False
in_api_tafsir_block = False

for line in lines:
    if line.startswith("@app.route('/api/ayah/<int:sura_no>/<int:aya_no>')"):
        in_api_ayah_block = True
    elif line.startswith("@app.route(\"/api/tafsir/<int:sura_no>\")"):
        in_api_tafsir_block = True
        
    if in_api_ayah_block:
        if line.strip() == "if __name__ == '__main__':" or line.strip().startswith("@socketio.run"):
            in_api_ayah_block = False
        else:
            continue
            
    if in_api_tafsir_block:
        if line.strip() == "@app.route('/api/surah/<int:sura_no>')":
            in_api_tafsir_block = False
            new_lines.append(line)
            continue
        else:
            continue
            
    new_lines.append(line)

content = "".join(new_lines)


new_api_tafsir = """@app.route("/api/tafsir/<int:sura_no>")
def api_tafsir_surah(sura_no):
    if sura_no in tafsir_cache:
        return jsonify(tafsir_cache[sura_no])
    return jsonify({"error": "Surah not found in tafsir"}), 404

"""

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
    })

"""


content = content.replace("@app.route('/api/surah/<int:sura_no>')", new_api_tafsir + "@app.route('/api/surah/<int:sura_no>')")
content = content.replace("if __name__ == '__main__':", new_api_ayah + "if __name__ == '__main__':")


with open("/home/harb/tajweed.ai/backend/recite/app.py", "w", encoding="utf-8") as f:
    f.write(content)
print("done")
