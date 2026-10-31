"""Food logging with macros, and daily nutrition progress vs. personal targets."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from wellora.core.dates import to_date
from wellora.core.errors import ConflictError, NotFoundError
from wellora.repositories import activities as activity_repo
from wellora.repositories import foods as food_repo
from wellora.repositories import profiles as profile_repo
from wellora.services import activity as activity_service
from wellora.services.health import macro_targets_for_profile

MACRO_KEYS = ("protein_g", "carbs_g", "fats_g", "fiber_g")


def scale_food(food: dict[str, Any], servings: float) -> dict[str, float]:
    return {
        "calories": round(food["calories"] * servings, 1),
        **{key: round(float(food[key] or 0) * servings, 1) for key in MACRO_KEYS},
    }


def log_food(
    user_id: str,
    food_id: int,
    servings: float,
    meal_slot: str,
    timestamp: datetime | None = None,
) -> dict[str, Any]:
    food = food_repo.get(food_id)
    if not food:
        raise NotFoundError("Food not found in library.")
    scaled = scale_food(food, servings)
    serving_label = f"{servings:g} × {food['serving_size']:g} {food['serving_unit']}"
    metadata = {
        "source": "food_library",
        "food_id": food_id,
        "servings": servings,
        "meal_slot": meal_slot,
        "serving_label": serving_label,
        **{key: scaled[key] for key in MACRO_KEYS},
    }
    log = activity_repo.insert(
        user_id=user_id,
        activity_type="meal",
        details=food["name"],
        value=max(scaled["calories"], 0.1),
        timestamp=timestamp.isoformat(timespec="seconds") if timestamp else None,
        metadata=metadata,
    )
    return {"log": log, "nutrition": scaled}


def add_custom_food(food: dict[str, Any]) -> dict[str, Any]:
    if food_repo.find_by_name(food["name"]):
        raise ConflictError(f"'{food['name']}' already exists in the food library.")
    return food_repo.create(food)


def daily_nutrition(user_id: str, day: date | str | None = None) -> dict[str, Any]:
    target_day = to_date(day)
    summary = activity_service.daily_summary(user_id, target_day)
    targets = macro_targets_for_profile(profile_repo.get(user_id))
    consumed = {"calories": summary["calories_logged"], **summary["macros"]}

    progress = {
        "calories": _ratio(consumed["calories"], targets["calories"]),
        "protein": _ratio(consumed["protein_g"], targets["protein"]),
        "carbs": _ratio(consumed["carbs_g"], targets["carbs"]),
        "fats": _ratio(consumed["fats_g"], targets["fats"]),
    }

    meals: dict[str, list[dict[str, Any]]] = {"breakfast": [], "lunch": [], "dinner": [], "snack": []}
    for log in summary["logs"]:
        if log["activity_type"] != "meal":
            continue
        slot = (log.get("metadata") or {}).get("meal_slot") or "snack"
        meals.setdefault(slot, []).append(log)

    return {
        "date": target_day.isoformat(),
        "consumed": consumed,
        "targets": targets,
        "progress": progress,
        "remaining_calories": round(max(targets["calories"] - consumed["calories"], 0), 1),
        "meals": meals,
    }


def _ratio(value: float, target: float) -> float:
    return round(value / target, 3) if target > 0 else 0.0
