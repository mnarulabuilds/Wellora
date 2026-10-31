from __future__ import annotations

import json
from typing import Any

from wellora.core.dates import now_iso
from wellora.db.connection import get_connection, loads_json


def _to_med(row) -> dict[str, Any]:
    data = dict(row)
    data["times"] = loads_json(data.get("times"), [])
    data["is_active"] = bool(data["is_active"])
    return data


def get(med_id: int, user_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM medications WHERE id = ? AND user_id = ?", (med_id, user_id)
        ).fetchone()
    return _to_med(row) if row else None


def list_for_user(user_id: str, include_inactive: bool = False) -> list[dict[str, Any]]:
    query = "SELECT * FROM medications WHERE user_id = ?"
    if not include_inactive:
        query += " AND is_active = 1"
    query += " ORDER BY name COLLATE NOCASE"
    with get_connection() as conn:
        return [_to_med(r) for r in conn.execute(query, (user_id,)).fetchall()]


def create(user_id: str, name: str, dosage: str, times: list[str], instructions: str) -> dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO medications (user_id, name, dosage, times, instructions, is_active, created_at) "
            "VALUES (?, ?, ?, ?, ?, 1, ?)",
            (user_id, name, dosage, json.dumps(times), instructions, now_iso()),
        )
        med_id = cursor.lastrowid
    return get(med_id, user_id)  # type: ignore[arg-type,return-value]


def update(med_id: int, user_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    existing = get(med_id, user_id)
    if not existing:
        return None
    merged = {**existing, **updates}
    with get_connection() as conn:
        conn.execute(
            "UPDATE medications SET name = ?, dosage = ?, times = ?, instructions = ?, is_active = ? "
            "WHERE id = ? AND user_id = ?",
            (
                merged["name"],
                merged["dosage"],
                json.dumps(merged["times"]),
                merged["instructions"],
                int(bool(merged["is_active"])),
                med_id,
                user_id,
            ),
        )
    return get(med_id, user_id)


def delete(med_id: int, user_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM medications WHERE id = ? AND user_id = ?", (med_id, user_id))
    return cursor.rowcount > 0


def doses_between(user_id: str, from_date: str, to_date: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM medication_doses WHERE user_id = ? AND date BETWEEN ? AND ?",
            (user_id, from_date, to_date),
        ).fetchall()
    return [dict(r) for r in rows]


def toggle_dose(med_id: int, user_id: str, date: str, scheduled_time: str) -> bool:
    """Flip a dose between taken / not taken. Returns the new taken state."""
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM medication_doses WHERE medication_id = ? AND date = ? AND scheduled_time = ?",
            (med_id, date, scheduled_time),
        ).fetchone()
        if existing:
            conn.execute("DELETE FROM medication_doses WHERE id = ?", (existing["id"],))
            return False
        conn.execute(
            "INSERT INTO medication_doses (medication_id, user_id, date, scheduled_time, taken_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (med_id, user_id, date, scheduled_time, now_iso()),
        )
        return True
