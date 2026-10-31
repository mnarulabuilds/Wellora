"""Sleep, habits and weight tracking."""

from fastapi import APIRouter, Query

from wellora.api.deps import OptionalDate, UserIdQuery
from wellora.core.dates import to_date
from wellora.core.errors import NotFoundError
from wellora.repositories import habits as habit_repo
from wellora.repositories import profiles as profile_repo
from wellora.repositories import sleep as sleep_repo
from wellora.repositories import weight as weight_repo
from wellora.schemas.tracking import HabitCreate, HabitToggle, SleepLogCreate, WeightLogCreate
from wellora.services import habits as habit_service
from wellora.services.health import bmi_value

sleep_router = APIRouter(prefix="/sleep", tags=["Sleep"])
habits_router = APIRouter(prefix="/habits", tags=["Habits"])
weight_router = APIRouter(prefix="/weight", tags=["Weight"])


@sleep_router.post("/log")
def log_sleep(payload: SleepLogCreate):
    saved = sleep_repo.insert(
        user_id=payload.user_id,
        date=to_date(payload.date).isoformat(),
        hours=payload.hours,
        quality=payload.quality,
        deep_sleep_hours=payload.deep_sleep_hours,
        bed_time=payload.bed_time,
        wake_time=payload.wake_time,
        notes=payload.notes,
    )
    return {
        "status": "success",
        "message": f"Logged {payload.hours:g}h sleep ({payload.quality}/5)",
        "log": saved,
    }


@sleep_router.get("/logs")
def list_sleep(user_id: UserIdQuery, limit: int = Query(default=14, ge=1, le=100)):
    logs = sleep_repo.list_logs(user_id, limit=limit)
    return {"status": "success", "logs": logs, "count": len(logs)}


@sleep_router.get("/latest")
def latest_sleep(user_id: UserIdQuery, date: OptionalDate = None):
    return {"status": "success", "sleep": sleep_repo.latest(user_id, date.isoformat() if date else None)}


@sleep_router.delete("/{log_id}")
def delete_sleep(log_id: int, user_id: UserIdQuery):
    if not sleep_repo.delete(log_id, user_id):
        raise NotFoundError("Sleep log not found.")
    return {"status": "success", "message": "Sleep log deleted"}


@habits_router.get("")
def list_habits(user_id: UserIdQuery):
    habits = habit_repo.list_active(user_id)
    return {"status": "success", "habits": habits, "count": len(habits)}


@habits_router.post("")
def create_habit(payload: HabitCreate):
    habit = habit_repo.create(payload.user_id, payload.title, payload.category.value, payload.icon)
    return {"status": "success", "message": "Habit created", "habit": habit}


@habits_router.post("/toggle")
def toggle_habit(payload: HabitToggle):
    result = habit_service.toggle(payload.user_id, payload.habit_id, payload.date)
    word = "completed" if result["completed"] else "unmarked"
    return {"status": "success", "message": f"Habit {word}", "data": result}


@habits_router.get("/daily")
def daily_habits(user_id: UserIdQuery, date: OptionalDate = None):
    return {"status": "success", "data": habit_service.daily_status(user_id, date)}


@habits_router.delete("/{habit_id}")
def archive_habit(habit_id: int, user_id: UserIdQuery):
    if not habit_repo.archive(habit_id, user_id):
        raise NotFoundError("Habit not found.")
    return {"status": "success", "message": "Habit removed"}


@weight_router.post("/log")
def log_weight(payload: WeightLogCreate):
    profile = profile_repo.get(payload.user_id)
    bmi = bmi_value(payload.weight, profile["height"]) if profile and profile.get("height") else None
    saved = weight_repo.insert(
        payload.user_id, to_date(payload.date).isoformat(), payload.weight, bmi or None, payload.notes
    )
    profile_repo.update_weight(payload.user_id, payload.weight)
    return {"status": "success", "message": f"Logged weigh-in: {payload.weight:g} kg", "log": saved}


@weight_router.get("/history")
def weight_history(user_id: UserIdQuery, limit: int = Query(default=30, ge=1, le=365)):
    history = weight_repo.history(user_id, limit=limit)
    return {"status": "success", "history": history, "count": len(history)}


@weight_router.delete("/{log_id}")
def delete_weight(log_id: int, user_id: UserIdQuery):
    if not weight_repo.delete(log_id, user_id):
        raise NotFoundError("Weight log not found.")
    return {"status": "success", "message": "Weigh-in deleted"}
