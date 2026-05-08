import urllib.request
import json
import sqlite3
import os
import concurrent.futures

base_dir = "/home/harb/tajweed.ai/backend/recite/tafsir_rag"
db_path = os.path.join(base_dir, "tafsir.sqlite3")

def fetch_surah(ch):
    req = urllib.request.Request(
        f'https://raw.githubusercontent.com/spa5k/tafsir_api/master/tafsir/ar-tafsir-ibn-kathir/{ch}.json',
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    try:
        data = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        return ch, data.get('ayahs', [])
    except Exception as e:
        print(f"Error surah {ch}: {e}")
        return ch, []

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("DELETE FROM tafsir")
print("Downloading clean Tafsir Ibn Kathir...")

with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    results = list(executor.map(fetch_surah, range(1, 115)))

for ch, ayahs in results:
    for t in ayahs:
        cursor.execute(
            "INSERT INTO tafsir (surah, ayah, surah_name, text) VALUES (?, ?, ?, ?)",
            (ch, t.get('ayah'), f"سورة {ch}", t.get('text', ''))
        )
conn.commit()
conn.close()
print("Done reconstructing db.")
