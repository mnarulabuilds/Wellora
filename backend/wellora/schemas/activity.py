from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from wellora.schemas.common import ActivityType, NonEmptyStr, UserId

MAX_VALUE = {ActivityType.meal: 10000, ActivityType.workout: 720, ActivityType.water: 15}
LIMIT_MESSAGE = {
    ActivityType.meal: "Meal calories must be under 10,000 kcal.",
    ActivityType.workout: "Workout duration must be under 720 minutes (12 hours).",
    ActivityType.water: "Water amount must be under 15 liters.",
}


class ActivityLogCreate(BaseModel):
    user_id: UserId = "default_user"
    activity_type: ActivityType
    details: NonEmptyStr = Field(..., max_length=500)
    value: float = Field(..., gt=0)
    timestamp: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _check_range(self) -> ActivityLogCreate:
        if self.value > MAX_VALUE[self.activity_type]:
            raise ValueError(LIMIT_MESSAGE[self.activity_type])
        self.value = round(self.value, 2)
        return self


class ActivityLogUpdate(BaseModel):
    activity_type: ActivityType | None = None
    details: NonEmptyStr | None = Field(default=None, max_length=500)
    value: float | None = Field(default=None, gt=0)
    metadata: dict[str, Any] | None = None
