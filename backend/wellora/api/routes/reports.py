from fastapi import APIRouter

from wellora.api.deps import OptionalDate, UserIdQuery
from wellora.repositories import profiles as profile_repo
from wellora.schemas.profile import HealthReportRequest, HealthScoreRequest
from wellora.services import activity as activity_service
from wellora.services import habits as habit_service
from wellora.services import health as health_service
from wellora.services import medications as med_service
from wellora.services import reports as report_service
from wellora.services import scoring

router = APIRouter(tags=["Reports & Scores"])


@router.post("/generate_report")
def generate_report(data: HealthReportRequest):
    report = health_service.build_report(
        age=data.age,
        weight=data.weight,
        height=data.height,
        gender=data.gender.value,
        activity_level=data.activity_level.value,
        goals=data.health_goals,
        dietary_preferences=data.dietary_preferences,
    )
    return {"status": "success", **report}


@router.post("/calculate_health_score")
def calculate_health_score(data: HealthScoreRequest):
    return {"status": "success", **scoring.health_score(data.user_id, data.age, data.weight, data.height)}


@router.get("/recovery/score")
def recovery_score(user_id: UserIdQuery, date: OptionalDate = None):
    return scoring.recovery_score(user_id, date.isoformat() if date else None)


@router.get("/reports/weekly")
def weekly_report(user_id: UserIdQuery, end_date: OptionalDate = None):
    return report_service.weekly_report(user_id, end_date)


@router.get("/dashboard")
def dashboard(user_id: UserIdQuery, date: OptionalDate = None):
    """Everything the home screen needs in a single round trip (``date`` = the user's local day)."""
    profile = profile_repo.get(user_id) or {}
    day = date.isoformat() if date else None
    return {
        "status": "success",
        "health_score": scoring.health_score(
            user_id, profile.get("age"), profile.get("weight"), profile.get("height")
        ),
        "daily": activity_service.daily_summary(user_id, day),
        "weekly": activity_service.weekly_history(user_id, date),
        "recovery": scoring.recovery_score(user_id, day),
        "habits": habit_service.daily_status(user_id, day),
        "medications": med_service.schedule_for_day(user_id, day),
    }
