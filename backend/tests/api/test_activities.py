def log(client, user_id, kind, details, value, **extra):
    return client.post(
        "/log_activity",
        json={"user_id": user_id, "activity_type": kind, "details": details, "value": value, **extra},
    )


def test_log_and_daily_summary(client, user_id):
    assert log(client, user_id, "meal", "Dal rice", 520).json()["message"].startswith("Logged meal")
    log(client, user_id, "workout", "Walk", 30)
    log(client, user_id, "water", "Glass", 0.25)
    summary = client.get("/daily_summary", params={"user_id": user_id}).json()
    assert summary["calories_logged"] == 520
    assert summary["workout_minutes"] == 30
    assert summary["water_liters"] == 0.25
    assert len(summary["logs"]) == 3


def test_validation_limits(client, user_id):
    assert log(client, user_id, "water", "Lake", 50).status_code == 422
    assert log(client, user_id, "workout", "   ", 10).status_code == 422
    assert log(client, user_id, "meal", "Air", 0).status_code == 422
    assert log(client, user_id, "dance", "x", 1).status_code == 422


def test_update_and_delete_are_scoped_to_owner(client, user_id):
    log_id = log(client, user_id, "meal", "Toast", 200).json()["log"]["id"]
    res = client.put(f"/activity_logs/{log_id}", params={"user_id": user_id}, json={"value": 250})
    assert res.json()["log"]["value"] == 250
    assert client.delete(f"/activity_logs/{log_id}", params={"user_id": "intruder"}).status_code == 404
    assert client.delete(f"/activity_logs/{log_id}", params={"user_id": user_id}).status_code == 200
    assert client.delete(f"/activity_logs/{log_id}", params={"user_id": user_id}).status_code == 404


def test_list_filter_and_weekly_and_streak(client, user_id):
    log(client, user_id, "workout", "Yoga", 20)
    log(client, user_id, "meal", "Idli", 120)
    logs = client.get("/activity_logs", params={"user_id": user_id, "activity_type": "workout"}).json()
    assert logs["count"] == 1
    weekly = client.get("/activity_history", params={"user_id": user_id}).json()
    assert sum(weekly["workout_data"]) == 20
    assert len(weekly["labels"]) == 7
    assert client.get("/streaks", params={"user_id": user_id}).json()["current_streak"] == 1


def test_custom_timestamp(client, user_id):
    res = log(client, user_id, "water", "Bottle", 0.5, timestamp="2025-01-02T09:30:00")
    assert res.json()["log"]["timestamp"] == "2025-01-02T09:30:00"
    day = client.get("/daily_summary", params={"user_id": user_id, "date": "2025-01-02"}).json()
    assert day["water_liters"] == 0.5
