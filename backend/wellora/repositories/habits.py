from __future__ import annotations

from typing import Any

from wellora.core.dates import now_iso
from wellora.db.connection import get_connection
from wellora.db.seed import DEFAULT_HABITS


def ensure_defaults(user_id: str) -> None:
    """Give brand-new users a starter set of habits (only once)."""
    with get_connection() as conn:
        exists = conn.execute("SELECT 1 FROM daily_habits WHERE user_id = ? LIMIT 1", (user_id,)).fetchone()
        if exists:
            return
        now = now_iso()
        conn.executemany(
            "INSERT INTO daily_habits (user_id, title, category, icon, is_active, created_at) "
            "VALUES (?, ?, ?, ?, 1, ?)",
            [(user_id, title, cat, icon, now) for title, cat, icon in DEFAULT_HABITS],
        )


def list_active(user_id: str) -> list[dict[str, Any]]:
    ensure_defaults(user_id)
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM daily_habits WHERE user_id = ? AND is_active = 1 ORDER BY id",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def create(user_id: str, title: str, category: str, icon: str) -> dict[str, Any]:
    ensure_defaults(user_id)
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO daily_habits (user_id, title, category, icon, is_active, created_at) "
            "VALUES (?, ?, ?, ?, 1, ?)",
            (user_id, title.strip(), category, icon, now_iso()),
        )
        row = conn.execute("SELECT * FROM daily_habits WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def archive(habit_id: int, user_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute(
            "UPDATE daily_habits SET is_active = 0 WHERE id = ? AND user_id = ?",
            (habit_id, user_id),
        )
    return cursor.rowcount > 0


def belongs_to(habit_id: int, user_id: str) -> bool:
    with get_connection() as conn:
        return (
            conn.execute(
                "SELECT 1 FROM daily_habits WHERE id = ? AND user_id = ?", (habit_id, user_id)
            ).fetchone()
            is not None
        )


def toggle_completion(habit_id: int, user_id: str, date: str) -> bool:
    """Flip completion for ``date``. Returns the new completed state."""
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM habit_completions WHERE habit_id = ? AND user_id = ? AND date = ?",
            (habit_id, user_id, date),
        ).fetchone()
        if existing:
            conn.execute("DELETE FROM habit_completions WHERE id = ?", (existing["id"],))
            return False
        conn.execute(
            "INSERT INTO habit_completions (habit_id, user_id, date, completed_at) VALUES (?, ?, ?, ?)",
            (habit_id, user_id, date, now_iso()),
        )
        return True


def completed_ids(user_id: str, date: str) -> set[int]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT habit_id FROM habit_completions WHERE user_id = ? AND date = ?",
            (user_id, date),
        ).fetchall()
    return {r["habit_id"] for r in rows}


def completion_counts(user_id: str, from_date: str, to_date: str) -> dict[str, int]:
    """Map of date -> completions (for active habits) in the range."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT hc.date AS date, COUNT(*) AS n FROM habit_completions hc
            JOIN daily_habits h ON h.id = hc.habit_id AND h.is_active = 1
            WHERE hc.user_id = ? AND hc.date BETWEEN ? AND ?
            GROUP BY hc.date
            """,
            (user_id, from_date, to_date),
        ).fetchall()
    return {r["date"]: r["n"] for r in rows}
