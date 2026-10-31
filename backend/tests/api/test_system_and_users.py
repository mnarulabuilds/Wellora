import io
import json
import zipfile


def test_root_and_health(client):
    assert client.get("/").json()["status"] == "ok"
    health = client.get("/health").json()
    assert health["status"] == "healthy"
    assert health["database"] == "connected"


def test_profile_roundtrip(client, saved_profile, user_id):
    assert saved_profile["name"] == "Asha Rao"
    fetched = client.get("/users/profile", params={"user_id": user_id}).json()
    assert fetched["dietary_preferences"] == ["vegetarian"]
    assert fetched["health_goals"] == ["weight_loss"]


def test_profile_update_overwrites(client, profile_payload, user_id):
    client.post("/users/profile", json=profile_payload)
    client.post("/users/profile", json={**profile_payload, "name": "  Asha R  ", "age": 31})
    fetched = client.get("/users/profile", params={"user_id": user_id}).json()
    assert fetched["name"] == "Asha R"
    assert fetched["age"] == 31


def test_profile_not_found_uses_error_shape(client):
    res = client.get("/users/profile", params={"user_id": "ghost"})
    assert res.status_code == 404
    assert res.json() == {"status": "error", "message": "Profile not found"}


def test_profile_validation_errors(client, profile_payload):
    res = client.post("/users/profile", json={**profile_payload, "age": 5, "name": "   "})
    assert res.status_code == 422
    body = res.json()
    assert body["status"] == "error"
    assert len(body["detail"]) == 2


def test_stats(client, saved_profile, user_id):
    client.post(
        "/log_activity",
        json={"user_id": user_id, "activity_type": "water", "details": "Glass", "value": 0.25},
    )
    stats = client.get("/users/stats", params={"user_id": user_id}).json()
    assert stats["total_activities_logged"] == 1
    assert stats["daily"]["water_liters"] == 0.25


def test_export_json_and_csv(client, saved_profile, user_id):
    client.post(
        "/log_activity", json={"user_id": user_id, "activity_type": "workout", "details": "Run", "value": 30}
    )
    res = client.get("/users/export", params={"user_id": user_id})
    assert res.headers["content-type"].startswith("application/json")
    data = json.loads(res.content)
    assert data["profile"]["name"] == "Asha Rao"
    assert len(data["activities"]) == 1

    res = client.get("/users/export", params={"user_id": user_id, "format": "csv"})
    archive = zipfile.ZipFile(io.BytesIO(res.content))
    assert {"activities.csv", "profile.csv"} <= set(archive.namelist())
    assert "Run" in archive.read("activities.csv").decode()


def test_delete_all_data(client, saved_profile, user_id):
    client.post(
        "/log_activity", json={"user_id": user_id, "activity_type": "water", "details": "x", "value": 1}
    )
    assert client.delete("/users/data", params={"user_id": user_id}).status_code == 200
    assert client.get("/users/profile", params={"user_id": user_id}).status_code == 404
    assert client.get("/users/stats", params={"user_id": user_id}).json()["total_activities_logged"] == 0
