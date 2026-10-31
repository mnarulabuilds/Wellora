def test_sleep_log_latest_and_delete(client, user_id):
    res = client.post(
        "/sleep/log", json={"user_id": user_id, "hours": 7.5, "quality": 4, "bed_time": "23:00"}
    )
    assert res.status_code == 200
    log_id = res.json()["log"]["id"]
    assert client.get("/sleep/latest", params={"user_id": user_id}).json()["sleep"]["hours"] == 7.5
    assert client.get("/sleep/logs", params={"user_id": user_id}).json()["count"] == 1
    assert client.delete(f"/sleep/{log_id}", params={"user_id": user_id}).status_code == 200


def test_sleep_validation(client, user_id):
    assert client.post("/sleep/log", json={"user_id": user_id, "hours": 6, "quality": 9}).status_code == 422
    assert (
        client.post(
            "/sleep/log", json={"user_id": user_id, "hours": 6, "quality": 3, "deep_sleep_hours": 7}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/sleep/log", json={"user_id": user_id, "hours": 6, "quality": 3, "bed_time": "25:99"}
        ).status_code
        == 422
    )


def test_habits_defaults_toggle_create_archive(client, user_id):
    status = client.get("/habits/daily", params={"user_id": user_id}).json()["data"]
    assert status["total_habits"] == 6
    first = status["habits"][0]["id"]

    toggled = client.post("/habits/toggle", json={"user_id": user_id, "habit_id": first}).json()
    assert toggled["data"]["completed"] is True
    assert client.get("/habits/daily", params={"user_id": user_id}).json()["data"]["completion_rate"] == 16.7
    assert (
        client.post("/habits/toggle", json={"user_id": user_id, "habit_id": first}).json()["data"][
            "completed"
        ]
        is False
    )

    created = client.post(
        "/habits", json={"user_id": user_id, "title": "Read 10 pages", "category": "mindfulness"}
    )
    habit_id = created.json()["habit"]["id"]
    assert client.get("/habits", params={"user_id": user_id}).json()["count"] == 7
    assert client.delete(f"/habits/{habit_id}", params={"user_id": user_id}).status_code == 200
    assert client.get("/habits", params={"user_id": user_id}).json()["count"] == 6


def test_cannot_toggle_someone_elses_habit(client, user_id):
    other_habit = client.get("/habits", params={"user_id": "someone_else"}).json()["habits"][0]["id"]
    res = client.post("/habits/toggle", json={"user_id": user_id, "habit_id": other_habit})
    assert res.status_code == 404


def test_weight_log_updates_profile_and_bmi(client, saved_profile, user_id):
    res = client.post("/weight/log", json={"user_id": user_id, "weight": 68.0})
    assert res.json()["log"]["bmi"] == 23.53
    assert client.get("/users/profile", params={"user_id": user_id}).json()["weight"] == 68.0
    history = client.get("/weight/history", params={"user_id": user_id}).json()
    assert history["count"] == 1
    log_id = history["history"][0]["id"]
    assert client.delete(f"/weight/{log_id}", params={"user_id": user_id}).status_code == 200
