"""Lightweight SQLite persistence for cases and follow-ups.

Standing in for the PostgreSQL store described in the architecture doc;
same schema shape, simpler engine for a runnable local prototype.
"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "skillcall.db"


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                case_id TEXT PRIMARY KEY,
                name TEXT,
                age INTEGER,
                education TEXT,
                location TEXT,
                phone TEXT,
                language TEXT,
                occupation TEXT,
                years_experience INTEGER,
                skill_gap_json TEXT,
                selected_option_json TEXT,
                career_path_json TEXT,
                satya_checks_json TEXT,
                csc TEXT,
                status TEXT DEFAULT 'submitted',
                officer_note TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS followups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT,
                milestone TEXT,
                status TEXT DEFAULT 'pending',
                note TEXT,
                earning_monthly INTEGER,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
