from fastapi import APIRouter, Query

from wellora.api.deps import OptionalDate, UserIdQuery
from wellora.core.errors import NotFoundError
from wellora.repositories import foods as food_repo
from wellora.schemas.nutrition import FoodCreate, FoodLogCreate
from wellora.services import nutrition as nutrition_service

foods_router = APIRouter(prefix="/foods", tags=["Foods & Nutrition"])
nutrition_router = APIRouter(prefix="/nutrition", tags=["Foods & Nutrition"])


@foods_router.get("/search")
def search_foods(
    q: str = Query(..., min_length=1, max_length=100), limit: int = Query(default=25, ge=1, le=50)
):
    results = food_repo.search(q, limit)
    return {"status": "success", "query": q, "results": results, "count": len(results)}


@foods_router.get("/popular")
def popular_foods(limit: int = Query(default=20, ge=1, le=100)):
    results = food_repo.popular(limit)
    return {"status": "success", "results": results, "count": len(results)}


@foods_router.get("/{food_id}")
def get_food(food_id: int):
    food = food_repo.get(food_id)
    if not food:
        raise NotFoundError("Food not found.")
    return {"status": "success", "food": food}


@foods_router.post("")
def create_food(payload: FoodCreate):
    food = nutrition_service.add_custom_food(payload.model_dump())
    return {"status": "success", "message": f"Added {food['name']} to the food library", "food": food}


@nutrition_router.post("/log")
def log_food(payload: FoodLogCreate):
    result = nutrition_service.log_food(
        payload.user_id, payload.food_id, payload.servings, payload.meal_slot.value, payload.timestamp
    )
    log = result["log"]
    return {
        "status": "success",
        "message": f"Logged {log['details']} ({result['nutrition']['calories']:g} kcal)",
        **result,
    }


@nutrition_router.get("/daily")
def daily_nutrition(user_id: UserIdQuery, date: OptionalDate = None):
    return nutrition_service.daily_nutrition(user_id, date)
