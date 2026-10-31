from __future__ import annotations

import json
from typing import Any

from wellora.core.dates import now_iso
from wellora.db.connection import get_connection, loads_json


def _to_profile(row) -> dict[str, Any]:
    data = dict(row)
    data["dietary_preferences"] = loads_json(data.get("dietary_preferences"), [])
    data["health_goals"] = loads_json(data.get("health_goals"), [])
    return data


def get(user_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    return _to_profile(row) if row else None


def upsert(profile: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO profiles (
                user_id, name, age, weight, height, gender, activity_level,
                dietary_preferences, health_goals, target_calories, target_steps,
                target_water, target_workout_minutes, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name=excluded.name, age=excluded.age, weight=excluded.weight,
                height=excluded.height, gender=excluded.gender,
                activity_level=excluded.activity_level,
                dietary_preferences=excluded.dietary_preferences,
                health_goals=excluded.health_goals,
                target_calories=excluded.target_calories,
                target_steps=excluded.target_steps,
                target_water=excluded.target_water,
                target_workout_minutes=excluded.target_workout_minutes,
                updated_at=excluded.updated_at
            """,
            (
                profile["user_id"],
                profile.get("name", "").strip(),
                profile.get("age"),
                profile.get("weight"),
                profile.get("height"),
                profile.get("gender", "male"),
                profile.get("activity_level", "light"),
                json.dumps(profile.get("dietary_preferences", [])),
                json.dumps(profile.get("health_goals", [])),
                profile.get("target_calories", 2000),
                profile.get("target_steps", 10000),
                profile.get("target_water", 2.5),
                profile.get("target_workout_minutes", 30),
                now_iso(),
            ),
        )
    return get(profile["user_id"])  # type: ignore[return-value]


def update_weight(user_id: str, weight: float) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE profiles SET weight = ?, updated_at = ? WHERE user_id = ?",
            (weight, now_iso(), user_id),
        )


def delete_all_user_data(user_id: str) -> None:
    """Right-to-erasure: wipe everything stored for a user."""
    tables = [
        "medication_doses",
        "medications",
        "vitals",
        "habit_completions",
        "daily_habits",
        "weight_logs",
        "sleep_logs",
        "activity_logs",
        "profiles",
    ]
    with get_connection() as conn:
        for table in tables:
            conn.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
