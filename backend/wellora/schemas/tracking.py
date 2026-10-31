"""Schemas for sleep, habits and weight tracking."""

from __future__ import annotations

from datetime import date as Date

from pydantic import BaseModel, Field, model_validator

from wellora.schemas.common import HHMM, HabitCategory, NonEmptyStr, UserId


class SleepLogCreate(BaseModel):
    user_id: UserId = "default_user"
    date: Date | None = None
    hours: float = Field(..., ge=0.5, le=24.0)
    quality: int = Field(..., ge=1, le=5)
    deep_sleep_hours: float = Field(default=0.0, ge=0.0, le=24.0)
    bed_time: HHMM | None = None
    wake_time: HHMM | None = None
    notes: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def _deep_le_total(self) -> SleepLogCreate:
        if self.deep_sleep_hours > self.hours:
            raise ValueError("Deep sleep cannot exceed total sleep hours.")
        return self


class HabitCreate(BaseModel):
    user_id: UserId = "default_user"
    title: NonEmptyStr = Field(..., min_length=2, max_length=100)
    category: HabitCategory = HabitCategory.mindfulness
    icon: str = Field(default="checkmark-circle", max_length=50)


class HabitToggle(BaseModel):
    habit_id: int
    user_id: UserId = "default_user"
    date: Date | None = None


class WeightLogCreate(BaseModel):
    user_id: UserId = "default_user"
    weight: float = Field(..., ge=20.0, le=400.0)
    date: Date | None = None
    notes: str = Field(default="", max_length=300)
