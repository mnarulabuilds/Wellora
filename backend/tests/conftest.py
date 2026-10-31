"""Shared fixtures: every test gets its own throwaway SQLite database."""

import uuid

import pytest
from fastapi.testclient import TestClient

from wellora.core.config import settings
from wellora.db.seed import init_db
from wellora.main import app


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "db_path", tmp_path / "test.db")
    monkeypatch.setattr(settings, "seed_demo_data", False)
    init_db()
    yield settings.db_path


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def user_id() -> str:
    return f"user_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def profile_payload(user_id):
    return {
        "user_id": user_id,
        "name": "Asha Rao",
        "age": 30,
        "weight": 70.0,
        "height": 170.0,
        "gender": "female",
        "activity_level": "moderate",
        "dietary_preferences": ["vegetarian"],
        "health_goals": ["weight_loss"],
        "target_calories": 1800,
        "target_steps": 9000,
        "target_water": 2.5,
        "target_workout_minutes": 30,
    }


@pytest.fixture
def saved_profile(client, profile_payload):
    res = client.post("/users/profile", json=profile_payload)
    assert res.status_code == 200
    return res.json()["profile"]
