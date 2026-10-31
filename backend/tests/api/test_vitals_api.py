def test_record_bp_and_latest(client, user_id):
    res = client.post(
        "/vitals",
        json={"user_id": user_id, "vital_type": "blood_pressure", "value": 135, "value_secondary": 85},
    )
    assert res.status_code == 200
    reading = res.json()["reading"]
    assert reading["display_value"] == "135/85"
    assert reading["classification"]["label"] == "High — Stage 1"

    client.post("/vitals", json={"user_id": user_id, "vital_type": "heart_rate", "value": 64})
    client.post(
        "/vitals",
        json={
            "user_id": user_id,
            "vital_type": "heart_rate",
            "value": 70,
            "measured_at": "2020-01-01T08:00:00",
        },
    )
    latest = client.get("/vitals/latest", params={"user_id": user_id}).json()["latest"]
    by_type = {r["vital_type"]: r for r in latest}
    assert by_type["heart_rate"]["value"] == 64  # newest wins, not last inserted
    assert len(latest) == 2


def test_validation(client, user_id):
    no_dia = {"user_id": user_id, "vital_type": "blood_pressure", "value": 120}
    assert client.post("/vitals", json=no_dia).status_code == 422
    inverted = {**no_dia, "value_secondary": 130}
    assert client.post("/vitals", json=inverted).status_code == 422
    assert (
        client.post("/vitals", json={"user_id": user_id, "vital_type": "spo2", "value": 120}).status_code
        == 422
    )


def test_glucose_context_and_filter_and_delete(client, user_id):
    res = client.post(
        "/vitals",
        json={"user_id": user_id, "vital_type": "blood_glucose", "value": 110, "context": "fasting"},
    )
    assert res.json()["reading"]["classification"]["status"] == "elevated"
    listing = client.get("/vitals", params={"user_id": user_id, "vital_type": "blood_glucose"}).json()
    assert listing["count"] == 1
    reading_id = listing["readings"][0]["id"]
    assert client.delete(f"/vitals/{reading_id}", params={"user_id": user_id}).status_code == 200
