from fastapi import APIRouter, Response

from wellora.api.deps import UserIdQuery
from wellora.core.errors import NotFoundError
from wellora.repositories import activities as activity_repo
from wellora.repositories import habits as habit_repo
from wellora.repositories import profiles as profile_repo
from wellora.schemas.common import ExportFormat
from wellora.schemas.profile import UserProfile
from wellora.services import activity as activity_service
from wellora.services import export as export_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/profile")
def save_profile(profile: UserProfile):
    saved = profile_repo.upsert(profile.model_dump(mode="json"))
    habit_repo.ensure_defaults(profile.user_id)
    return {"status": "success", "profile": saved}


@router.get("/profile")
def get_profile(user_id: UserIdQuery):
    profile = profile_repo.get(user_id)
    if not profile:
        raise NotFoundError("Profile not found")
    return profile


@router.get("/stats")
def get_stats(user_id: UserIdQuery):
    return {
        "profile": profile_repo.get(user_id),
        "daily": activity_service.daily_summary(user_id),
        "weekly": activity_service.weekly_history(user_id),
        "streak": activity_service.streak(user_id),
        "total_activities_logged": activity_repo.count(user_id),
    }


@router.get("/export")
def export_data(user_id: UserIdQuery, format: ExportFormat = ExportFormat.json):
    data = export_service.collect(user_id)
    if format == ExportFormat.csv:
        return Response(
            content=export_service.to_csv_zip(data),
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="wellora-export.zip"'},
        )
    return Response(
        content=export_service.to_json(data),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="wellora-export.json"'},
    )


@router.delete("/data")
def delete_all_data(user_id: UserIdQuery):
    profile_repo.delete_all_user_data(user_id)
    return {"status": "success", "message": "All of your data has been permanently deleted."}
