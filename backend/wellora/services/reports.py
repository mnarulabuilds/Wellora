"""Weekly report: this 7-day window vs the previous 7 days, plus plain-language highlights."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from wellora.core.dates import day_bounds, today
from wellora.repositories import activities as activity_repo
from wellora.repositories import habits as habit_repo
from wellora.repositories import profiles as profile_repo
from wellora.repositories import sleep as sleep_repo
from wellora.repositories import weight as weight_repo
from wellora.services import medications as med_service


def _avg(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


def window_metrics(user_id: str, start: date, end: date) -> dict[str, Any]:
    from_ts, _ = day_bounds(start)
    _, to_ts = day_bounds(end)
    logs = activity_repo.list_logs(user_id, from_ts=from_ts, to_ts=to_ts, limit=5000)
    days = (end - start).days + 1

    per_day: dict[str, dict[str, float]] = {}
    for log in logs:
        bucket = per_day.setdefault(log["timestamp"][:10], {"meal": 0.0, "workout": 0.0, "water": 0.0})
        bucket[log["activity_type"]] = bucket.get(log["activity_type"], 0.0) + log["value"]

    meal_days = [v["meal"] for v in per_day.values() if v["meal"] > 0]
    water_days = [v["water"] for v in per_day.values() if v["water"] > 0]
    workout_total = sum(v["workout"] for v in per_day.values())

    sleeps = sleep_repo.list_logs(user_id, limit=100, from_date=start.isoformat(), to_date=end.isoformat())
    weights = weight_repo.history(user_id, limit=100, from_date=start.isoformat(), to_date=end.isoformat())
    weight_change = None
    if len(weights) >= 2:
        weight_change = round(weights[0]["weight"] - weights[-1]["weight"], 1)

    habits_total = len(habit_repo.list_active(user_id))
    completions = sum(habit_repo.completion_counts(user_id, start.isoformat(), end.isoformat()).values())
    habit_rate = round(completions / (habits_total * days) * 100, 1) if habits_total else None

    meds = med_service.adherence(user_id, days=days, end=end)

    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "active_days": len(per_day),
        "avg_calories": _avg(meal_days),
        "total_workout_minutes": round(workout_total, 1),
        "workout_sessions": sum(1 for log in logs if log["activity_type"] == "workout"),
        "avg_water_liters": _avg(water_days),
        "avg_sleep_hours": _avg([s["hours"] for s in sleeps]),
        "avg_sleep_quality": _avg([s["quality"] for s in sleeps]),
        "habit_completion_rate": habit_rate,
        "medication_adherence": meds["adherence"],
        "latest_weight": weights[0]["weight"] if weights else None,
        "weight_change": weight_change,
    }


def _delta(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None:
        return None
    return round(current - previous, 2)


def highlights(
    current: dict[str, Any], previous: dict[str, Any], profile: dict[str, Any] | None
) -> list[str]:
    notes: list[str] = []
    target_minutes = (profile or {}).get("target_workout_minutes") or 30
    weekly_target = target_minutes * 7

    if current["total_workout_minutes"] >= weekly_target:
        notes.append(f"🏆 You hit your weekly exercise target ({current['total_workout_minutes']:g} min)!")
    elif current["total_workout_minutes"] >= 150:
        notes.append("💪 You met the WHO guideline of 150+ active minutes this week.")
    else:
        gap = round(150 - current["total_workout_minutes"])
        notes.append(f"🏃 {gap} more active minutes would reach the 150 min/week guideline.")

    workout_delta = _delta(current["total_workout_minutes"], previous["total_workout_minutes"])
    if workout_delta and workout_delta > 0:
        notes.append(f"📈 Exercise up {workout_delta:g} min vs last week.")

    sleep = current["avg_sleep_hours"]
    if sleep is not None:
        if sleep < 7:
            notes.append(f"😴 Average sleep was {sleep:g}h — try for 7-9h.")
        else:
            notes.append(f"🌙 Solid sleep average of {sleep:g}h.")

    target_water = float((profile or {}).get("target_water") or 2.5)
    if current["avg_water_liters"] is not None and current["avg_water_liters"] < target_water * 0.8:
        notes.append(
            f"💧 Hydration averaged {current['avg_water_liters']:g}L/day — below your {target_water:g}L goal."
        )

    if current["medication_adherence"] is not None:
        rate = current["medication_adherence"]
        notes.append(
            f"💊 Medication adherence {rate:g}%."
            + (" Excellent!" if rate >= 90 else " Reminders can help close the gap.")
        )

    if current["weight_change"] is not None and current["weight_change"] != 0:
        direction = "down" if current["weight_change"] < 0 else "up"
        notes.append(f"⚖️ Weight {direction} {abs(current['weight_change']):g} kg this week.")

    if current["active_days"] == 0:
        notes = ["Nothing logged this week yet — start with a glass of water or a short walk!"]
    return notes


def weekly_report(user_id: str, end: date | None = None) -> dict[str, Any]:
    end_day = end or today()
    current = window_metrics(user_id, end_day - timedelta(days=6), end_day)
    previous = window_metrics(user_id, end_day - timedelta(days=13), end_day - timedelta(days=7))
    changes = {
        key: _delta(current[key], previous[key])
        for key in current
        if key not in ("start", "end") and isinstance(current[key], (int, float, type(None)))
    }
    return {
        "current": current,
        "previous": previous,
        "changes": changes,
        "highlights": highlights(current, previous, profile_repo.get(user_id)),
    }
