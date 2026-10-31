from __future__ import annotations

from datetime import date as Date

from pydantic import BaseModel, Field, field_validator

from wellora.schemas.common import HHMM, NonEmptyStr, UserId


def _normalise_times(times: list[str]) -> list[str]:
    unique = sorted(set(times))
    if not unique:
        raise ValueError("Add at least one reminder time.")
    return unique


class MedicationCreate(BaseModel):
    user_id: UserId
    name: NonEmptyStr = Field(..., max_length=100)
    dosage: str = Field(default="", max_length=60, examples=["500 mg", "1 tablet"])
    times: list[HHMM] = Field(..., min_length=1, max_length=8)
    instructions: str = Field(default="", max_length=300, examples=["After food"])

    _times = field_validator("times")(_normalise_times)


class MedicationUpdate(BaseModel):
    name: NonEmptyStr | None = Field(default=None, max_length=100)
    dosage: str | None = Field(default=None, max_length=60)
    times: list[HHMM] | None = Field(default=None, min_length=1, max_length=8)
    instructions: str | None = Field(default=None, max_length=300)
    is_active: bool | None = None

    @field_validator("times")
    @classmethod
    def _times(cls, value: list[str] | None) -> list[str] | None:
        return _normalise_times(value) if value is not None else None


class DoseToggle(BaseModel):
    user_id: UserId
    scheduled_time: HHMM
    date: Date | None = None
