from __future__ import annotations

from typing import Any

from wellora.db.connection import get_connection, row_to_dict


def get(food_id: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        return row_to_dict(conn.execute("SELECT * FROM foods_library WHERE id = ?", (food_id,)).fetchone())


def search(query: str, limit: int = 25) -> list[dict[str, Any]]:
    term = query.strip()
    like = f"%{term}%"
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM foods_library
            WHERE name LIKE ? OR category LIKE ?
            ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, name
            LIMIT ?
            """,
            (like, like, f"{term}%", limit),
        ).fetchall()
    return [dict(r) for r in rows]


def popular(limit: int = 20) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM foods_library ORDER BY category, name LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def find_by_name(name: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        return row_to_dict(
            conn.execute(
                "SELECT * FROM foods_library WHERE name = ? COLLATE NOCASE", (name.strip(),)
            ).fetchone()
        )


def create(food: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO foods_library
            (name, category, serving_size, serving_unit, calories, protein_g, carbs_g, fats_g, fiber_g)
            VALUES (:name, :category, :serving_size, :serving_unit, :calories,
                    :protein_g, :carbs_g, :fats_g, :fiber_g)
            """,
            food,
        )
        return dict(conn.execute("SELECT * FROM foods_library WHERE id = ?", (cursor.lastrowid,)).fetchone())
