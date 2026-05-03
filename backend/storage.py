from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


DB_PATH = Path(__file__).with_name("database.json")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}"


def empty_data() -> dict:
    return {
        "schools": [],
        "classes": [],
        "students": [],
        "teachers": [],
        "challenges": [],
        "assignments": [],
        "codes": [],
        "achievements": [],
        "notifs": [],
    }


def normalize_db(db: dict) -> dict:
    base = empty_data()
    for key, value in base.items():
        if key not in db or not isinstance(db[key], list):
            db[key] = value
    return db


def load_db() -> dict:
    if not DB_PATH.exists():
        save_db(empty_data())
    with DB_PATH.open("r", encoding="utf-8") as file:
        return normalize_db(json.load(file))


def save_db(db: dict) -> None:
    DB_PATH.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")


def reset_db() -> dict:
    db = empty_data()
    save_db(db)
    return deepcopy(db)
