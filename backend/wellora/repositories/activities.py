from __future__ import annotations

import json
from typing import Any

from wellora.core.dates import now_iso
from wellora.db.connection import get_connection, loads_json


def _to_log(row) -> dict[str, Any]:
    data = dict(row)
    data["metadata"] = loads_json(data.get("metadata"), {})
    return data


def get(log_id: int, user_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM activity_logs WHERE id = ? AND user_id = ?", (log_id, user_id)
        ).fetchone()
    return _to_log(row) if row else None


def insert(
    user_id: str,
    activity_type: str,
    details: str,
    value: float,
    timestamp: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO activity_logs (user_id, activity_type, details, value, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                activity_type,
                details.strip(),
                value,
                timestamp or now_iso(),
                json.dumps(metadata or {}),
            ),
        )
        log_id = cursor.lastrowid
    return get(log_id, user_id)  # type: ignore[arg-type,return-value]


def update(log_id: int, user_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    existing = get(log_id, user_id)
    if not existing:
        return None
    merged = {**existing, **updates}
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE activity_logs SET activity_type = ?, details = ?, value = ?, metadata = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                merged["activity_type"],
                merged["details"],
                merged["value"],
                json.dumps(merged.get("metadata") or {}),
                log_id,
                user_id,
            ),
        )
    return get(log_id, user_id)


def delete(log_id: int, user_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM activity_logs WHERE id = ? AND user_id = ?", (log_id, user_id))
    return cursor.rowcount > 0


def list_logs(
    user_id: str,
    from_ts: str | None = None,
    to_ts: str | None = None,
    activity_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    query = "SELECT * FROM activity_logs WHERE user_id = ?"
    params: list[Any] = [user_id]
    if activity_type:
        query += " AND activity_type = ?"
        params.append(activity_type)
    if from_ts:
        query += " AND timestamp >= ?"
        params.append(from_ts)
    if to_ts:
        query += " AND timestamp <= ?"
        params.append(to_ts)
    query += " ORDER BY timestamp DESC, id DESC LIMIT ? OFFSET ?"
    params.extend([max(1, min(limit, 5000)), max(0, offset)])
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_to_log(row) for row in rows]


def active_days(user_id: str) -> list[str]:
    """Distinct ``YYYY-MM-DD`` days with at least one log, newest first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT DISTINCT substr(timestamp, 1, 10) AS day FROM activity_logs "
            "WHERE user_id = ? ORDER BY day DESC",
            (user_id,),
        ).fetchall()
    return [row["day"] for row in rows]


def count(user_id: str) -> int:
    with get_connection() as conn:
        return conn.execute("SELECT COUNT(*) FROM activity_logs WHERE user_id = ?", (user_id,)).fetchone()[0]
