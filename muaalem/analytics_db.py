import sqlite3
import json
import os
import threading

DB_PATH = os.path.join(os.path.dirname(__file__), "analytics.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            chunk_data TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            session_id TEXT PRIMARY KEY,
            report_data TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class SessionLogger:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.lock = threading.Lock()
        
    def log_chunk(self, chunk_data: dict):
        with self.lock:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('INSERT INTO chunks (session_id, chunk_data) VALUES (?, ?)',
                          (self.session_id, json.dumps(chunk_data)))
            conn.commit()
            conn.close()
            
    def end_session(self):
        pass

def get_session_chunks(session_id: str) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT chunk_data FROM chunks WHERE session_id = ? ORDER BY id ASC', (session_id,))
    rows = cursor.fetchall()
    conn.close()
    return [json.loads(row[0]) for row in rows]

def store_report(session_id: str, report: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO reports (session_id, report_data) VALUES (?, ?)',
                  (session_id, json.dumps(report)))
    conn.commit()
    conn.close()

def get_report(session_id: str) -> dict | None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT report_data FROM reports WHERE session_id = ?', (session_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return None
