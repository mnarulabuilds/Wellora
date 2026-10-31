from __future__ import annotations

from typing import Any

from wellora.core.dates import now_iso
from wellora.db.connection import get_connection


def insert(user_id: str, date: str, weight: float, bmi: float | None, notes: str) -> dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO weight_logs (user_id, date, weight, bmi, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, date, weight, bmi, notes, now_iso()),
        )
        row = conn.execute("SELECT * FROM weight_logs WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def history(
    user_id: str, limit: int = 30, from_date: str | None = None, to_date: str | None = None
) -> list[dict[str, Any]]:
    query = "SELECT * FROM weight_logs WHERE user_id = ?"
    params: list[Any] = [user_id]
    if from_date:
        query += " AND date >= ?"
        params.append(from_date)
    if to_date:
        query += " AND date <= ?"
        params.append(to_date)
    query += " ORDER BY date DESC, id DESC LIMIT ?"
    params.append(limit)
    with get_connection() as conn:
        return [dict(r) for r in conn.execute(query, params).fetchall()]


def delete(log_id: int, user_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM weight_logs WHERE id = ? AND user_id = ?", (log_id, user_id))
    return cursor.rowcount > 0
