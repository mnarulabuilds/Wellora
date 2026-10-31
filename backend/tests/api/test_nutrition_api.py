def test_search_and_popular(client):
    res = client.get("/foods/search", params={"q": "roti"}).json()
    assert res["count"] >= 1
    assert "Roti" in res["results"][0]["name"]
    assert client.get("/foods/popular", params={"limit": 5}).json()["count"] == 5


def test_custom_food_and_log(client, saved_profile, user_id):
    food = client.post(
        "/foods",
        json={
            "name": "Homemade Khichdi",
            "serving_size": 1,
            "serving_unit": "bowl",
            "calories": 300,
            "protein_g": 11,
            "carbs_g": 50,
            "fats_g": 6,
            "fiber_g": 5,
        },
    )
    assert food.status_code == 200
    food_id = food.json()["food"]["id"]
    assert client.post("/foods", json={**food.json()["food"], "id": None}).status_code == 409

    res = client.post(
        "/nutrition/log", json={"user_id": user_id, "food_id": food_id, "servings": 1.5, "meal_slot": "lunch"}
    )
    assert res.status_code == 200
    assert res.json()["nutrition"]["calories"] == 450

    daily = client.get("/nutrition/daily", params={"user_id": user_id}).json()
    assert daily["consumed"]["protein_g"] == 16.5
    assert daily["targets"]["calories"] == 1800
    assert daily["remaining_calories"] == 1350
    assert daily["meals"]["lunch"][0]["details"] == "Homemade Khichdi"


def test_log_missing_food(client, user_id):
    res = client.post("/nutrition/log", json={"user_id": user_id, "food_id": 99999})
    assert res.status_code == 404
