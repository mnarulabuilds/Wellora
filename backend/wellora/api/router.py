from fastapi import APIRouter

from wellora.api.routes import (
    activities,
    assistant,
    medications,
    nutrition,
    reports,
    system,
    tracking,
    users,
    vitals,
)

api_router = APIRouter()
for router in (
    system.router,
    users.router,
    activities.router,
    tracking.sleep_router,
    tracking.habits_router,
    tracking.weight_router,
    nutrition.foods_router,
    nutrition.nutrition_router,
    medications.router,
    vitals.router,
    reports.router,
    assistant.router,
):
    api_router.include_router(router)
