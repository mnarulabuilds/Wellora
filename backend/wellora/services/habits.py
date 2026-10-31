from __future__ import annotations

from datetime import date
from typing import Any

from wellora.core.dates import to_date
from wellora.core.errors import NotFoundError
from wellora.repositories import habits as habit_repo


def daily_status(user_id: str, day: date | str | None = None) -> dict[str, Any]:
    target = to_date(day).isoformat()
    habits = habit_repo.list_active(user_id)
    done = habit_repo.completed_ids(user_id, target)
    items = [{**habit, "completed": habit["id"] in done} for habit in habits]
    completed = sum(1 for item in items if item["completed"])
    total = len(items)
    return {
        "date": target,
        "total_habits": total,
        "completed_habits": completed,
        "completion_rate": round(completed / total * 100, 1) if total else 0.0,
        "habits": items,
    }


def toggle(user_id: str, habit_id: int, day: date | None = None) -> dict[str, Any]:
    if not habit_repo.belongs_to(habit_id, user_id):
        raise NotFoundError("Habit not found.")
    target = to_date(day).isoformat()
    completed = habit_repo.toggle_completion(habit_id, user_id, target)
    return {"habit_id": habit_id, "date": target, "completed": completed}
