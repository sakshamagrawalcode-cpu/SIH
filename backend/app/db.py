"""Lightweight SQLite persistence for the SkillCall prototype.

Standing in for the PostgreSQL + pgvector store described in the architecture;
same schema shape, simpler engine for a runnable local prototype.
Tables: profiles (keyed by phone, for first-time check), cases, case_history,
followups, documents.
"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "skillcall.db"


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                phone TEXT PRIMARY KEY,
                name TEXT,
                age INTEGER,
                gender TEXT,
                education TEXT,
                location TEXT,
                travel_distance_km INTEGER,
                occupation TEXT,
                years_experience INTEGER,
                language TEXT,
                skill_gap_json TEXT,
                selected_option_json TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                case_id TEXT PRIMARY KEY,
                name TEXT,
                age INTEGER,
                gender TEXT,
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
                eligibility_json TEXT,
                csc TEXT,
                status TEXT DEFAULT 'submitted',
                officer_note TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS case_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT,
                stage TEXT,
                note TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS followups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT,
                milestone TEXT,
                status TEXT DEFAULT 'pending',
                outcome TEXT,
                note TEXT,
                earning_monthly INTEGER,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT,
                phone TEXT,
                doc_type TEXT,
                filename TEXT,
                content_type TEXT,
                data_url TEXT,
                uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
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


def add_case_history(conn, case_id: str, stage: str, note: str = ""):
    conn.execute(
        "INSERT INTO case_history (case_id, stage, note) VALUES (?,?,?)",
        (case_id, stage, note),
    )
