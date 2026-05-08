import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), 'progress.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Lessons table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            video_url TEXT,
            description TEXT
        )
    ''')
    
    # Questions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lesson_id INTEGER,
            question_text TEXT NOT NULL,
            options TEXT NOT NULL, -- JSON string of options
            correct_answer TEXT NOT NULL,
            FOREIGN KEY (lesson_id) REFERENCES lessons (id)
        )
    ''')
    
    # User Progress table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lesson_id INTEGER,
            completed BOOLEAN DEFAULT 0,
            last_score INTEGER DEFAULT 0,
            total_attempts INTEGER DEFAULT 0,
            FOREIGN KEY (lesson_id) REFERENCES lessons (id)
        )
    ''')
    
    # Mistakes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mistakes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER,
            count INTEGER DEFAULT 0,
            FOREIGN KEY (question_id) REFERENCES questions (id)
        )
    ''')

    # Recitation Mistakes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recitation_mistakes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sura_no INTEGER,
            aya_no INTEGER,
            word_text TEXT,
            count INTEGER DEFAULT 0
        )
    ''')
    
    conn.commit()
    conn.close()

def seed_data(lessons_data):
    """
    Expects lessons_data in the format:
    [
        {
            "category": "...",
            "title": "...",
            "video_url": "...",
            "questions": [
                {"text": "...", "options": ["A", "B", ...], "answer": "A"},
                ...
            ]
        },
        ...
    ]
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    for lesson in lessons_data:
        # Insert lesson
        cursor.execute(
            'INSERT INTO lessons (category, title, video_url) VALUES (?, ?, ?)',
            (lesson['category'], lesson['title'], lesson['video_url'])
        )
        lesson_id = cursor.lastrowid
        
        # Insert questions
        for q in lesson['questions']:
            cursor.execute(
                'INSERT INTO questions (lesson_id, question_text, options, correct_answer) VALUES (?, ?, ?, ?)',
                (lesson_id, q['text'], json.dumps(q['options']), q['answer'])
            )
            
    conn.commit()
    conn.close()

def get_lessons():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT l.*, p.completed, p.last_score, p.total_attempts 
        FROM lessons l
        LEFT JOIN user_progress p ON l.id = p.lesson_id
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_quiz(lesson_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM questions WHERE lesson_id = ?', (lesson_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{
        'id': row['id'],
        'question_text': row['question_text'],
        'options': json.loads(row['options']),
        'correct_answer': row['correct_answer']
    } for row in rows]

def update_progress(lesson_id, score, mistakes):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Update or insert progress
    is_completed = 1 if score >= 70 else 0
    
    cursor.execute('SELECT id FROM user_progress WHERE lesson_id = ?', (lesson_id,))
    row = cursor.fetchone()
    if row:
        cursor.execute('''
            UPDATE user_progress 
            SET completed = ?, last_score = ?, total_attempts = total_attempts + 1 
            WHERE lesson_id = ?
        ''', (is_completed, score, lesson_id))
    else:
        cursor.execute('''
            INSERT INTO user_progress (lesson_id, completed, last_score, total_attempts)
            VALUES (?, ?, ?, 1)
        ''', (lesson_id, is_completed, score))
        
    # Update mistakes
    for q_id in mistakes:
        cursor.execute('SELECT id FROM mistakes WHERE question_id = ?', (q_id,))
        m_row = cursor.fetchone()
        if m_row:
            cursor.execute('UPDATE mistakes SET count = count + 1 WHERE question_id = ?', (q_id,))
        else:
            cursor.execute('INSERT INTO mistakes (question_id, count) VALUES (?, 1)', (q_id,))
            
    conn.commit()
    conn.close()

def add_recitation_mistake(sura_no, aya_no, word_text):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id FROM recitation_mistakes 
        WHERE sura_no = ? AND aya_no = ? AND word_text = ?
    ''', (sura_no, aya_no, word_text))
    row = cursor.fetchone()
    if row:
        cursor.execute('UPDATE recitation_mistakes SET count = count + 1 WHERE id = ?', (row['id'],))
    else:
        cursor.execute('''
            INSERT INTO recitation_mistakes (sura_no, aya_no, word_text, count)
            VALUES (?, ?, ?, 1)
        ''', (sura_no, aya_no, word_text))
    conn.commit()
    conn.close()

def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Lesson completion
    cursor.execute('SELECT COUNT(*) as total FROM lessons')
    total_lessons = cursor.fetchone()['total']
    cursor.execute('SELECT COUNT(*) as completed FROM user_progress WHERE completed = 1')
    completed_lessons = cursor.fetchone()['completed']
    
    # 2. Accuracy by category
    cursor.execute('''
        SELECT l.category, AVG(p.last_score) as avg_score
        FROM lessons l
        LEFT JOIN user_progress p ON l.id = p.lesson_id
        WHERE l.category != 'Comprehensive'
        GROUP BY l.category
    ''')
    category_avg = cursor.fetchall()
    
    # 3. Top quiz mistakes
    cursor.execute('''
        SELECT q.question_text, m.count, l.category
        FROM mistakes m
        JOIN questions q ON m.question_id = q.id
        JOIN lessons l ON q.lesson_id = l.id
        ORDER BY m.count DESC
        LIMIT 5
    ''')
    top_mistakes = [dict(row) for row in cursor.fetchall()]

    # 4. Top recitation mistakes
    cursor.execute('''
        SELECT word_text, sura_no, aya_no, count
        FROM recitation_mistakes
        ORDER BY count DESC
        LIMIT 5
    ''')
    recitation_mistakes = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {
        'completion': {
            'total': total_lessons,
            'completed': completed_lessons
        },
        'accuracy': [dict(row) for row in category_avg],
        'mistakes': top_mistakes,
        'recitation_mistakes': recitation_mistakes
    }

if __name__ == '__main__':
    init_db()
