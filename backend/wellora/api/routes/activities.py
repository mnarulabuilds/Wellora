from fastapi import APIRouter, Query

from wellora.api.deps import OptionalDate, UserIdQuery
from wellora.core.errors import NotFoundError
from wellora.repositories import activities as activity_repo
from wellora.schemas.activity import ActivityLogCreate, ActivityLogUpdate
from wellora.schemas.common import ActivityType
from wellora.services import activity as activity_service

router = APIRouter(tags=["Activities"])


@router.post("/log_activity")
def log_activity(log: ActivityLogCreate):
    saved = activity_repo.insert(
        user_id=log.user_id,
        activity_type=log.activity_type.value,
        details=log.details,
        value=log.value,
        timestamp=log.timestamp.isoformat(timespec="seconds") if log.timestamp else None,
        metadata=log.metadata,
    )
    message = activity_service.log_message(log.activity_type.value, log.details, log.value)
    return {"status": "success", "message": message, "log": saved}


@router.put("/activity_logs/{log_id}")
def update_log(log_id: int, updates: ActivityLogUpdate, user_id: UserIdQuery):
    updated = activity_repo.update(log_id, user_id, updates.model_dump(exclude_none=True, mode="json"))
    if not updated:
        raise NotFoundError("Activity log not found.")
    return {"status": "success", "message": "Activity updated", "log": updated}


@router.delete("/activity_logs/{log_id}")
def delete_log(log_id: int, user_id: UserIdQuery):
    if not activity_repo.delete(log_id, user_id):
        raise NotFoundError("Activity log not found.")
    return {"status": "success", "message": "Activity deleted"}


@router.get("/activity_logs")
def list_logs(
    user_id: UserIdQuery,
    from_date: str | None = None,
    to_date: str | None = None,
    activity_type: ActivityType | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    logs = activity_repo.list_logs(
        user_id, from_date, to_date, activity_type.value if activity_type else None, limit, offset
    )
    return {"status": "success", "logs": logs, "count": len(logs)}


@router.get("/daily_summary")
def daily_summary(user_id: UserIdQuery, date: OptionalDate = None):
    return activity_service.daily_summary(user_id, date)


@router.get("/activity_history")
def activity_history(user_id: UserIdQuery):
    return activity_service.weekly_history(user_id)


@router.get("/streaks")
def streaks(user_id: UserIdQuery):
    return activity_service.streak(user_id)
