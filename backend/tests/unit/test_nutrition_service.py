import pytest

from wellora.core.errors import ConflictError, NotFoundError
from wellora.repositories import foods as food_repo
from wellora.services import nutrition


def test_scale_food():
    food = {"calories": 100, "protein_g": 10, "carbs_g": 5, "fats_g": 2, "fiber_g": None}
    assert nutrition.scale_food(food, 1.5) == {
        "calories": 150,
        "protein_g": 15,
        "carbs_g": 7.5,
        "fats_g": 3,
        "fiber_g": 0,
    }


def test_log_food_stores_macros_and_slot(user_id):
    food = food_repo.search("Paneer")[0]
    result = nutrition.log_food(user_id, food["id"], 2, "dinner")
    meta = result["log"]["metadata"]
    assert result["log"]["activity_type"] == "meal"
    assert meta["meal_slot"] == "dinner"
    assert meta["protein_g"] == pytest.approx(food["protein_g"] * 2, abs=0.1)

    daily = nutrition.daily_nutrition(user_id)
    assert daily["consumed"]["calories"] == pytest.approx(food["calories"] * 2, abs=0.1)
    assert len(daily["meals"]["dinner"]) == 1
    assert 0 < daily["progress"]["protein"] < 1


def test_log_unknown_food(user_id):
    with pytest.raises(NotFoundError):
        nutrition.log_food(user_id, 999999, 1, "lunch")


def test_custom_food_conflict():
    payload = {
        "name": "banana",
        "category": "Fruits",
        "serving_size": 1,
        "serving_unit": "x",
        "calories": 1,
        "protein_g": 0,
        "carbs_g": 0,
        "fats_g": 0,
        "fiber_g": 0,
    }
    with pytest.raises(ConflictError):
        nutrition.add_custom_food(payload)
