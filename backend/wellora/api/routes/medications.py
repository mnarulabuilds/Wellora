from fastapi import APIRouter, Query

from wellora.api.deps import OptionalDate, UserIdQuery
from wellora.core.errors import NotFoundError
from wellora.repositories import medications as med_repo
from wellora.schemas.medications import DoseToggle, MedicationCreate, MedicationUpdate
from wellora.services import medications as med_service

router = APIRouter(prefix="/medications", tags=["Medications"])


@router.get("")
def list_medications(user_id: UserIdQuery, include_inactive: bool = False):
    meds = med_repo.list_for_user(user_id, include_inactive)
    return {"status": "success", "medications": meds, "count": len(meds)}


@router.post("")
def create_medication(payload: MedicationCreate):
    med = med_repo.create(payload.user_id, payload.name, payload.dosage, payload.times, payload.instructions)
    return {"status": "success", "message": f"Added {med['name']}", "medication": med}


@router.get("/schedule")
def schedule(user_id: UserIdQuery, date: OptionalDate = None):
    return med_service.schedule_for_day(user_id, date)


@router.get("/adherence")
def adherence(user_id: UserIdQuery, days: int = Query(default=7, ge=1, le=90)):
    return med_service.adherence(user_id, days)


@router.put("/{med_id}")
def update_medication(med_id: int, payload: MedicationUpdate, user_id: UserIdQuery):
    med = med_repo.update(med_id, user_id, payload.model_dump(exclude_none=True))
    if not med:
        raise NotFoundError("Medication not found.")
    return {"status": "success", "message": "Medication updated", "medication": med}


@router.delete("/{med_id}")
def delete_medication(med_id: int, user_id: UserIdQuery):
    if not med_repo.delete(med_id, user_id):
        raise NotFoundError("Medication not found.")
    return {"status": "success", "message": "Medication deleted"}


@router.post("/{med_id}/doses/toggle")
def toggle_dose(med_id: int, payload: DoseToggle):
    result = med_service.toggle_dose(payload.user_id, med_id, payload.scheduled_time, payload.date)
    return {
        "status": "success",
        "message": "Dose marked as taken" if result["taken"] else "Dose unmarked",
        "data": result,
    }
