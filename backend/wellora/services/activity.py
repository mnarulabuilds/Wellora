"""Daily summaries, weekly charts and streaks built on top of activity logs."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from wellora.core.dates import day_bounds, to_date, today
from wellora.repositories import activities as activity_repo

UNITS = {"meal": "kcal", "workout": "min", "water": "L"}
WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def summarise_logs(logs: list[dict[str, Any]]) -> dict[str, Any]:
    def total(kind: str) -> float:
        return sum(log["value"] for log in logs if log["activity_type"] == kind)

    macros = {"protein_g": 0.0, "carbs_g": 0.0, "fats_g": 0.0, "fiber_g": 0.0}
    for log in logs:
        if log["activity_type"] == "meal":
            for key in macros:
                macros[key] += float((log.get("metadata") or {}).get(key, 0) or 0)

    return {
        "calories_logged": round(total("meal"), 1),
        "workout_minutes": round(total("workout"), 1),
        "water_liters": round(total("water"), 2),
        "meal_count": sum(1 for log in logs if log["activity_type"] == "meal"),
        "workout_count": sum(1 for log in logs if log["activity_type"] == "workout"),
        "macros": {key: round(value, 1) for key, value in macros.items()},
    }


def daily_summary(user_id: str, day: date | str | None = None) -> dict[str, Any]:
    target = to_date(day)
    start, end = day_bounds(target)
    logs = activity_repo.list_logs(user_id, from_ts=start, to_ts=end, limit=1000)
    return {"date": target.isoformat(), **summarise_logs(logs), "logs": logs}


def weekly_history(user_id: str, reference: date | None = None) -> dict[str, Any]:
    """Totals per weekday for the calendar week (Mon-Sun) containing ``reference``."""
    ref = reference or today()
    monday = ref - timedelta(days=ref.weekday())
    start, _ = day_bounds(monday)
    _, end = day_bounds(monday + timedelta(days=6))
    logs = activity_repo.list_logs(user_id, from_ts=start, to_ts=end, limit=5000)

    series = {"workout": [0.0] * 7, "meal": [0.0] * 7, "water": [0.0] * 7}
    for log in logs:
        try:
            idx = datetime.fromisoformat(log["timestamp"]).weekday()
        except ValueError:
            continue
        if log["activity_type"] in series:
            series[log["activity_type"]][idx] += log["value"]

    workout = [round(v, 1) for v in series["workout"]]
    return {
        "labels": WEEKDAY_LABELS,
        "workout_data": workout,
        "meal_data": [round(v, 1) for v in series["meal"]],
        "water_data": [round(v, 2) for v in series["water"]],
        "data": workout,
    }


def compute_streak(days: list[date], reference: date) -> dict[str, int]:
    """Current streak (allowing today to be not-yet-logged) and longest streak."""
    day_set = set(days)
    if not day_set:
        return {"current_streak": 0, "longest_streak": 0, "total_active_days": 0}

    cursor = reference if reference in day_set else reference - timedelta(days=1)
    current = 0
    while cursor in day_set:
        current += 1
        cursor -= timedelta(days=1)

    longest = run = 0
    previous: date | None = None
    for day in sorted(day_set):
        run = run + 1 if previous and (day - previous).days == 1 else 1
        longest = max(longest, run)
        previous = day

    return {"current_streak": current, "longest_streak": longest, "total_active_days": len(day_set)}


def streak(user_id: str) -> dict[str, int]:
    days = []
    for raw in activity_repo.active_days(user_id):
        try:
            days.append(date.fromisoformat(raw))
        except ValueError:
            continue
    return compute_streak(days, today())


def log_message(activity_type: str, details: str, value: float) -> str:
    message = f"Logged {activity_type}: {details} ({value:g} {UNITS[activity_type]})"
    if activity_type == "meal" and value > 800:
        message += " — hearty meal!"
    elif activity_type == "workout" and value >= 45:
        message += " — great session!"
    elif activity_type == "water" and value >= 1.0:
        message += " — awesome hydration!"
    return message
