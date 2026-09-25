"""Loads the demo CSV/JSON data used by the SkillCall prototype.

All data here is illustrative sample data for the SIH 2026 prototype (PS SIH26097).
It is NOT sourced from official PM-AJAY / PMKVY records and must not be treated
as real government data, statistics, or claims.
"""
from pathlib import Path
import json
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"


def _read_csv(name: str) -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / name)


occupations_df = _read_csv("occupations.csv")
job_roles_df = _read_csv("job_roles.csv")
competencies_df = _read_csv("competencies.csv")
courses_df = _read_csv("courses.csv")
schemes_df = _read_csv("schemes.csv")
career_paths_df = _read_csv("career_paths.csv")

with open(DATA_DIR / "rules.json", encoding="utf-8") as f:
    rules = json.load(f)
