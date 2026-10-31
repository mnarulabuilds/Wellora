from __future__ import annotations

from typing import Any

from wellora.db.connection import get_connection


def insert(
    user_id: str,
    vital_type: str,
    value: float,
    value_secondary: float | None,
    context: str | None,
    measured_at: str,
    notes: str,
) -> dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO vitals (user_id, vital_type, value, value_secondary, context, measured_at, notes) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, vital_type, value, value_secondary, context, measured_at, notes),
        )
        return dict(conn.execute("SELECT * FROM vitals WHERE id = ?", (cursor.lastrowid,)).fetchone())


def list_readings(
    user_id: str,
    vital_type: str | None = None,
    limit: int = 50,
    from_ts: str | None = None,
) -> list[dict[str, Any]]:
    query = "SELECT * FROM vitals WHERE user_id = ?"
    params: list[Any] = [user_id]
    if vital_type:
        query += " AND vital_type = ?"
        params.append(vital_type)
    if from_ts:
        query += " AND measured_at >= ?"
        params.append(from_ts)
    query += " ORDER BY measured_at DESC, id DESC LIMIT ?"
    params.append(limit)
    with get_connection() as conn:
        return [dict(r) for r in conn.execute(query, params).fetchall()]


def latest_per_type(user_id: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT v.* FROM vitals v
            WHERE v.user_id = ? AND v.id = (
                SELECT v2.id FROM vitals v2
                WHERE v2.user_id = v.user_id AND v2.vital_type = v.vital_type
                ORDER BY v2.measured_at DESC, v2.id DESC LIMIT 1
            )
            ORDER BY v.vital_type
            """,
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def delete(reading_id: int, user_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM vitals WHERE id = ? AND user_id = ?", (reading_id, user_id))
    return cursor.rowcount > 0
