"""Health score (profile + logging consistency) and daily recovery score."""

from __future__ import annotations

from typing import Any

from wellora.core.dates import to_date
from wellora.repositories import activities as activity_repo
from wellora.repositories import profiles as profile_repo
from wellora.repositories import sleep as sleep_repo
from wellora.services import activity as activity_service
from wellora.services import habits as habit_service
from wellora.services.health import bmi_category


def _band(score: int, bands: list[tuple[int, str, str]]) -> tuple[str, str]:
    for threshold, label, color in bands:
        if score >= threshold:
            return label, color
    return bands[-1][1], bands[-1][2]


def health_score(user_id: str, age: int | None, weight: float | None, height: float | None) -> dict[str, Any]:
    feedback: list[str] = []

    profile_pts = (7 if age else 0) + (7 if weight else 0) + (6 if height else 0)
    if profile_pts < 20:
        feedback.append("Complete your profile for more tailored recommendations.")

    bmi_pts = 0
    if weight and height:
        category = bmi_category(weight, height)
        if category == "Normal":
            bmi_pts = 30
            feedback.append("Your BMI is in the healthy range — keep it up!")
        elif category in ("Underweight", "Overweight"):
            bmi_pts = 20
            feedback.append(f"Your BMI is {category}. Consistent nutrition and exercise will help.")
        else:
            bmi_pts = 10
            feedback.append("Gradual changes to nutrition and daily movement will boost your health.")
    else:
        feedback.append("Add your height and weight to track BMI.")

    activity_pts = min(activity_repo.count(user_id) * 5, 30)
    if activity_pts < 15:
        feedback.append("Log meals, water and workouts daily to boost your score.")

    streak = activity_service.streak(user_id)
    consistency_pts = min(streak["current_streak"] * 5, 20)
    if streak["current_streak"] >= 3:
        feedback.append(f"Fantastic {streak['current_streak']}-day streak! Consistency builds results.")
    elif consistency_pts < 10:
        feedback.append("Build momentum by logging at least one activity every day.")

    score = min(profile_pts + bmi_pts + activity_pts + consistency_pts, 100)
    label, color = _band(
        score,
        [
            (80, "Excellent", "#10B981"),
            (60, "Good", "#4facfe"),
            (40, "Fair", "#F59E0B"),
            (0, "Needs Improvement", "#FF6B6B"),
        ],
    )
    return {
        "score": score,
        "label": label,
        "color": color,
        "feedback": feedback,
        "breakdown": {
            "profile": profile_pts,
            "bmi": bmi_pts,
            "activity": activity_pts,
            "consistency": consistency_pts,
        },
        "streak": streak,
    }


def sleep_points(hours: float, quality: int) -> int:
    if 7.0 <= hours <= 9.0:
        duration = 25.0
    elif 6.0 <= hours < 7.0 or 9.0 < hours <= 10.0:
        duration = 19.0
    elif 5.0 <= hours < 6.0:
        duration = 12.0
    else:
        duration = 6.0
    return round(duration + quality / 5.0 * 15.0)


def workout_points(minutes: float) -> int:
    if 20 <= minutes <= 75:
        return 20
    if 0 < minutes < 20:
        return 15
    if minutes > 120:
        return 10
    return 16  # rest day or 75-120 min


def recovery_score(user_id: str, day: str | None = None) -> dict[str, Any]:
    target = to_date(day).isoformat()
    profile = profile_repo.get(user_id) or {}
    target_water = float(profile.get("target_water") or 2.5)

    sleep = sleep_repo.latest(user_id, target)
    hours = float(sleep["hours"]) if sleep else 0.0
    quality = int(sleep["quality"]) if sleep else 0
    sleep_pts = sleep_points(hours, quality) if sleep else 22

    summary = activity_service.daily_summary(user_id, target)
    water = float(summary["water_liters"])
    hydration_ratio = min(water / target_water, 1.25) if target_water > 0 else 0.5
    hydration_pts = round(min(hydration_ratio * 25.0, 25.0))

    minutes = float(summary["workout_minutes"])
    workout_pts = workout_points(minutes)

    habits = habit_service.daily_status(user_id, target)
    habit_pts = round(habits["completion_rate"] / 100.0 * 15.0)

    total = min(max(sleep_pts + hydration_pts + workout_pts + habit_pts, 10), 100)
    status, color = _band(
        total,
        [
            (82, "Optimal Recovery", "#10B981"),
            (68, "Prime Vitality", "#4facfe"),
            (50, "Moderate Recovery", "#F59E0B"),
            (0, "Rest & Recharge", "#FF6B6B"),
        ],
    )

    insights: list[str] = []
    if sleep:
        if hours < 7.0:
            insights.append(f"Only {hours:g}h of sleep — aim for a 30-45 min earlier bedtime tonight.")
        elif quality >= 4:
            insights.append(f"Great sleep quality ({quality}/5) gives your body a strong recovery boost.")
    else:
        insights.append("Log last night's sleep to unlock precise recovery tracking.")
    if hydration_ratio < 0.8:
        gap = round(max(target_water - water, 0.25), 1)
        insights.append(f"Drink {gap}L more water today to reach your hydration goal.")
    else:
        insights.append("Hydration is on target — nice work!")
    if minutes >= 60:
        insights.append("Big training day! Prioritise protein and stretching.")
    elif minutes == 0:
        insights.append("Active recovery day: a gentle 15-minute walk will boost circulation.")
    if habits["completion_rate"] >= 80:
        insights.append("Outstanding habit consistency today!")

    return {
        "score": total,
        "status": status,
        "color": color,
        "insights": insights[:3],
        "metrics": {
            "sleep_score": sleep_pts,
            "sleep_hours": hours,
            "sleep_quality": quality,
            "hydration_score": hydration_pts,
            "water_logged": water,
            "target_water": target_water,
            "workout_score": workout_pts,
            "workout_minutes": minutes,
            "habit_score": habit_pts,
            "habits_completed": habits["completed_habits"],
            "habits_total": habits["total_habits"],
        },
    }
