def create(client, user_id, **overrides):
    payload = {
        "user_id": user_id,
        "name": "Metformin",
        "dosage": "500 mg",
        "times": ["20:00", "08:00", "08:00"],
        "instructions": "After food",
    }
    return client.post("/medications", json={**payload, **overrides})


def test_create_normalises_times_and_lists(client, user_id):
    med = create(client, user_id).json()["medication"]
    assert med["times"] == ["08:00", "20:00"]
    assert client.get("/medications", params={"user_id": user_id}).json()["count"] == 1


def test_validation(client, user_id):
    assert create(client, user_id, times=[]).status_code == 422
    assert create(client, user_id, times=["8am"]).status_code == 422
    assert create(client, user_id, name=" ").status_code == 422


def test_schedule_toggle_and_adherence(client, user_id):
    med_id = create(client, user_id).json()["medication"]["id"]
    schedule = client.get("/medications/schedule", params={"user_id": user_id}).json()
    assert schedule["total"] == 2 and schedule["taken"] == 0

    res = client.post(
        f"/medications/{med_id}/doses/toggle", json={"user_id": user_id, "scheduled_time": "08:00"}
    )
    assert res.json()["data"]["taken"] is True
    schedule = client.get("/medications/schedule", params={"user_id": user_id}).json()
    assert schedule["taken"] == 1
    assert schedule["adherence"] == 50.0

    adherence = client.get("/medications/adherence", params={"user_id": user_id, "days": 7}).json()
    assert adherence["scheduled"] == 2  # medication created today, so only today counts
    assert adherence["adherence"] == 50.0

    bad = client.post(
        f"/medications/{med_id}/doses/toggle", json={"user_id": user_id, "scheduled_time": "13:00"}
    )
    assert bad.status_code == 404


def test_update_pause_and_delete(client, user_id):
    med_id = create(client, user_id).json()["medication"]["id"]
    res = client.put(
        f"/medications/{med_id}", params={"user_id": user_id}, json={"times": ["09:00"], "is_active": False}
    )
    assert res.json()["medication"]["times"] == ["09:00"]
    assert client.get("/medications", params={"user_id": user_id}).json()["count"] == 0
    assert (
        client.get("/medications", params={"user_id": user_id, "include_inactive": True}).json()["count"] == 1
    )
    assert client.delete(f"/medications/{med_id}", params={"user_id": "x"}).status_code == 404
    assert client.delete(f"/medications/{med_id}", params={"user_id": user_id}).status_code == 200
