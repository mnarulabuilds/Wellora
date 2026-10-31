def test_assistant_personalises_nutrition(client, saved_profile, user_id):
    res = client.post(
        "/analyze_query", json={"text": "How much protein should I eat?", "user_id": user_id}
    ).json()
    assert res["intent"] == "dietary_advice"
    assert "g protein" in res["response"]
    assert res["suggestions"]


def test_assistant_medication_context_and_safety(client, user_id):
    client.post("/medications", json={"user_id": user_id, "name": "Vitamin D", "times": ["23:59"]})
    res = client.post(
        "/analyze_query", json={"text": "Did I take my medicine dose?", "user_id": user_id}
    ).json()
    assert res["intent"] == "medication"
    assert "0 of 1" in res["response"]
    assert "not a doctor" in res["response"]


def test_assistant_vitals_context(client, user_id):
    client.post("/vitals", json={"user_id": user_id, "vital_type": "heart_rate", "value": 72})
    res = client.post("/analyze_query", json={"text": "what is a good heart rate", "user_id": user_id}).json()
    assert res["intent"] == "vitals"
    assert "72" in res["response"]


def test_assistant_rejects_blank(client):
    assert client.post("/analyze_query", json={"text": "   "}).status_code == 422
