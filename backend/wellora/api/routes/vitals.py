from fastapi import APIRouter, Query

from wellora.api.deps import UserIdQuery
from wellora.core.errors import NotFoundError
from wellora.repositories import vitals as vitals_repo
from wellora.schemas.common import VitalType
from wellora.schemas.vitals import VitalCreate
from wellora.services import vitals as vitals_service

router = APIRouter(prefix="/vitals", tags=["Vitals"])


@router.post("")
def record_vital(payload: VitalCreate):
    reading = vitals_service.record(
        payload.model_dump(mode="python")
        | {
            "vital_type": payload.vital_type.value,
            "context": payload.context.value if payload.context else None,
        }
    )
    return {
        "status": "success",
        "message": f"{reading['label']}: {reading['display_value']} {reading['unit']} — {reading['classification']['label']}",
        "reading": reading,
    }


@router.get("")
def list_vitals(
    user_id: UserIdQuery, vital_type: VitalType | None = None, limit: int = Query(default=30, ge=1, le=200)
):
    readings = vitals_service.history(user_id, vital_type.value if vital_type else None, limit)
    return {"status": "success", "readings": readings, "count": len(readings)}


@router.get("/latest")
def latest_vitals(user_id: UserIdQuery):
    return {"status": "success", "latest": vitals_service.latest_overview(user_id)}


@router.delete("/{reading_id}")
def delete_vital(reading_id: int, user_id: UserIdQuery):
    if not vitals_repo.delete(reading_id, user_id):
        raise NotFoundError("Reading not found.")
    return {"status": "success", "message": "Reading deleted"}
