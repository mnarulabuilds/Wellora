from datetime import date, timedelta


def test_generate_report(client):
    res = client.post(
        "/generate_report", json={"age": 30, "weight": 70, "height": 175, "health_goals": ["muscle_gain"]}
    )
    body = res.json()
    assert body["bmi_category"] == "Normal"
    assert body["daily_calories"] == body["tdee"] + 350
    assert set(body["charts"]["macros"]["grams"]) == {"protein", "carbs", "fats"}


def test_health_score(client, user_id):
    empty = client.post("/calculate_health_score", json={"user_id": user_id}).json()
    assert empty["score"] == 0
    full = client.post(
        "/calculate_health_score", json={"user_id": user_id, "age": 30, "weight": 70, "height": 175}
    ).json()
    assert full["breakdown"]["profile"] == 20 and full["breakdown"]["bmi"] == 30
    assert full["label"] == "Fair"


def test_recovery_score(client, saved_profile, user_id):
    client.post("/sleep/log", json={"user_id": user_id, "hours": 8, "quality": 5})
    client.post(
        "/log_activity", json={"user_id": user_id, "activity_type": "water", "details": "x", "value": 2.5}
    )
    client.post(
        "/log_activity", json={"user_id": user_id, "activity_type": "workout", "details": "x", "value": 40}
    )
    res = client.get("/recovery/score", params={"user_id": user_id}).json()
    assert res["metrics"]["sleep_score"] == 40
    assert res["metrics"]["hydration_score"] == 25
    assert res["score"] == 85
    assert res["status"] == "Optimal Recovery"


def test_weekly_report_compares_windows(client, saved_profile, user_id):
    today = date.today()
    last_week = (today - timedelta(days=8)).isoformat() + "T10:00:00"
    client.post(
        "/log_activity",
        json={
            "user_id": user_id,
            "activity_type": "workout",
            "details": "Run",
            "value": 30,
            "timestamp": last_week,
        },
    )
    client.post(
        "/log_activity", json={"user_id": user_id, "activity_type": "workout", "details": "Run", "value": 200}
    )
    client.post("/sleep/log", json={"user_id": user_id, "hours": 6, "quality": 3})
    client.post(
        "/weight/log",
        json={"user_id": user_id, "weight": 71, "date": (today - timedelta(days=3)).isoformat()},
    )
    client.post("/weight/log", json={"user_id": user_id, "weight": 70})

    report = client.get("/reports/weekly", params={"user_id": user_id}).json()
    assert report["current"]["total_workout_minutes"] == 200
    assert report["previous"]["total_workout_minutes"] == 30
    assert report["changes"]["total_workout_minutes"] == 170
    assert report["current"]["weight_change"] == -1.0
    text = " ".join(report["highlights"])
    assert "WHO guideline" in text and "sleep" in text and "Weight down 1 kg" in text


def test_weekly_report_empty(client, user_id):
    report = client.get("/reports/weekly", params={"user_id": user_id}).json()
    assert report["current"]["active_days"] == 0
    assert "Nothing logged" in report["highlights"][0]


def test_dashboard_aggregate(client, saved_profile, user_id):
    body = client.get("/dashboard", params={"user_id": user_id}).json()
    assert {"health_score", "daily", "weekly", "recovery", "habits", "medications"} <= set(body)
    assert body["habits"]["total_habits"] == 6


def test_dashboard_respects_client_date(client, saved_profile, user_id):
    client.post(
        "/log_activity",
        json={
            "user_id": user_id,
            "activity_type": "water",
            "details": "x",
            "value": 1,
            "timestamp": "2025-06-01T23:30:00",
        },
    )
    body = client.get("/dashboard", params={"user_id": user_id, "date": "2025-06-01"}).json()
    assert body["daily"]["date"] == "2025-06-01"
    assert body["daily"]["water_liters"] == 1
    assert body["medications"]["date"] == "2025-06-01"
