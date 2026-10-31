from __future__ import annotations

from typing import Any

from wellora.core.dates import now_iso
from wellora.db.connection import get_connection, row_to_dict


def insert(
    user_id: str,
    date: str,
    hours: float,
    quality: int,
    deep_sleep_hours: float = 0.0,
    bed_time: str | None = None,
    wake_time: str | None = None,
    notes: str = "",
) -> dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO sleep_logs
            (user_id, date, hours, quality, deep_sleep_hours, bed_time, wake_time, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, date, hours, quality, deep_sleep_hours, bed_time, wake_time, notes, now_iso()),
        )
        row = conn.execute("SELECT * FROM sleep_logs WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def list_logs(
    user_id: str, limit: int = 14, from_date: str | None = None, to_date: str | None = None
) -> list[dict[str, Any]]:
    query = "SELECT * FROM sleep_logs WHERE user_id = ?"
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


def latest(user_id: str, date: str | None = None) -> dict[str, Any] | None:
    with get_connection() as conn:
        if date:
            row = conn.execute(
                "SELECT * FROM sleep_logs WHERE user_id = ? AND date = ? ORDER BY id DESC LIMIT 1",
                (user_id, date),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT * FROM sleep_logs WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT 1",
                (user_id,),
            ).fetchone()
    return row_to_dict(row)


def delete(log_id: int, user_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM sleep_logs WHERE id = ? AND user_id = ?", (log_id, user_id))
    return cursor.rowcount > 0
