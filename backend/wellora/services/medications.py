"""Medication schedules, dose check-off and adherence."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from wellora.core.dates import date_range, to_date
from wellora.core.errors import NotFoundError
from wellora.repositories import medications as med_repo

GRACE_MINUTES = 60  # a dose counts as "overdue" this long after its scheduled time


def dose_status(scheduled: str, taken: bool, day: date, now: datetime) -> str:
    if taken:
        return "taken"
    hour, minute = map(int, scheduled.split(":"))
    due_at = datetime.combine(day, datetime.min.time()).replace(hour=hour, minute=minute)
    if now < due_at:
        return "upcoming"
    if now <= due_at + timedelta(minutes=GRACE_MINUTES):
        return "due"
    return "missed" if day < now.date() else "overdue"


def schedule_for_day(
    user_id: str, day: date | str | None = None, now: datetime | None = None
) -> dict[str, Any]:
    target = to_date(day)
    now = now or datetime.now()
    meds = med_repo.list_for_user(user_id)
    taken = {
        (d["medication_id"], d["scheduled_time"]): d["taken_at"]
        for d in med_repo.doses_between(user_id, target.isoformat(), target.isoformat())
    }

    doses = []
    for med in meds:
        for time_str in med["times"]:
            taken_at = taken.get((med["id"], time_str))
            doses.append(
                {
                    "medication_id": med["id"],
                    "name": med["name"],
                    "dosage": med["dosage"],
                    "instructions": med["instructions"],
                    "scheduled_time": time_str,
                    "taken": taken_at is not None,
                    "taken_at": taken_at,
                    "status": dose_status(time_str, taken_at is not None, target, now),
                }
            )
    doses.sort(key=lambda d: (d["scheduled_time"], d["name"].lower()))
    total = len(doses)
    done = sum(1 for d in doses if d["taken"])
    next_dose = next((d for d in doses if d["status"] in ("due", "overdue", "upcoming")), None)
    return {
        "date": target.isoformat(),
        "total": total,
        "taken": done,
        "adherence": round(done / total * 100, 1) if total else None,
        "next_dose": next_dose,
        "doses": doses,
    }


def toggle_dose(user_id: str, med_id: int, scheduled_time: str, day: date | None = None) -> dict[str, Any]:
    med = med_repo.get(med_id, user_id)
    if not med:
        raise NotFoundError("Medication not found.")
    if scheduled_time not in med["times"]:
        raise NotFoundError(f"{med['name']} has no dose scheduled at {scheduled_time}.")
    target = to_date(day).isoformat()
    taken = med_repo.toggle_dose(med_id, user_id, target, scheduled_time)
    return {"medication_id": med_id, "date": target, "scheduled_time": scheduled_time, "taken": taken}


def adherence(user_id: str, days: int = 7, end: date | None = None) -> dict[str, Any]:
    """Share of scheduled doses taken over the last ``days`` days (inclusive of today)."""
    end_day = end or date.today()
    window = date_range(end_day, days)
    meds = med_repo.list_for_user(user_id)
    doses = med_repo.doses_between(user_id, window[0].isoformat(), end_day.isoformat())
    taken_keys = {(d["medication_id"], d["date"], d["scheduled_time"]) for d in doses}

    per_day = []
    total_sched = total_taken = 0
    for day in window:
        created_cutoff = day.isoformat()
        scheduled = [(m["id"], t) for m in meds if m["created_at"][:10] <= created_cutoff for t in m["times"]]
        taken = sum(1 for med_id, t in scheduled if (med_id, day.isoformat(), t) in taken_keys)
        total_sched += len(scheduled)
        total_taken += taken
        per_day.append({"date": day.isoformat(), "scheduled": len(scheduled), "taken": taken})

    return {
        "days": days,
        "scheduled": total_sched,
        "taken": total_taken,
        "adherence": round(total_taken / total_sched * 100, 1) if total_sched else None,
        "per_day": per_day,
    }
