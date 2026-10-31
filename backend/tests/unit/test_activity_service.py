from datetime import date, timedelta

from wellora.services.activity import compute_streak, log_message, summarise_logs

TODAY = date(2026, 3, 10)


def days_ago(*offsets):
    return [TODAY - timedelta(days=o) for o in offsets]


def test_streak_empty():
    assert compute_streak([], TODAY) == {"current_streak": 0, "longest_streak": 0, "total_active_days": 0}


def test_streak_counts_today():
    assert compute_streak(days_ago(0, 1, 2), TODAY)["current_streak"] == 3


def test_streak_still_alive_if_only_yesterday_logged():
    assert compute_streak(days_ago(1, 2), TODAY)["current_streak"] == 2


def test_streak_broken_after_gap():
    result = compute_streak(days_ago(2, 3, 4, 5, 10), TODAY)
    assert result["current_streak"] == 0
    assert result["longest_streak"] == 4
    assert result["total_active_days"] == 5


def test_summarise_logs_totals_and_macros():
    logs = [
        {"activity_type": "meal", "value": 400, "metadata": {"protein_g": 20, "carbs_g": 50}},
        {"activity_type": "meal", "value": 300, "metadata": {}},
        {"activity_type": "workout", "value": 30, "metadata": {}},
        {"activity_type": "water", "value": 0.25, "metadata": {}},
        {"activity_type": "water", "value": 0.5, "metadata": None},
    ]
    summary = summarise_logs(logs)
    assert summary["calories_logged"] == 700
    assert summary["workout_minutes"] == 30
    assert summary["water_liters"] == 0.75
    assert summary["meal_count"] == 2
    assert summary["macros"]["protein_g"] == 20


def test_log_message_encouragement():
    assert "great session" in log_message("workout", "Run", 50)
    assert log_message("water", "Glass", 0.25) == "Logged water: Glass (0.25 L)"
