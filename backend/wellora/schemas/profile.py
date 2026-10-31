from __future__ import annotations

from pydantic import BaseModel, Field

from wellora.schemas.common import ActivityLevel, Gender, NonEmptyStr, UserId


class BodyMetrics(BaseModel):
    age: int = Field(..., ge=10, le=120)
    weight: float = Field(..., ge=20, le=400, description="kg")
    height: float = Field(..., ge=50, le=280, description="cm")
    gender: Gender = Gender.male
    activity_level: ActivityLevel = ActivityLevel.light
    dietary_preferences: list[str] = Field(default_factory=list, max_length=20)
    health_goals: list[str] = Field(default_factory=list, max_length=20)


class HealthReportRequest(BodyMetrics):
    pass


class UserProfile(BodyMetrics):
    user_id: UserId
    name: NonEmptyStr = Field(..., max_length=100)
    target_calories: float = Field(default=2000, ge=500, le=10000)
    target_steps: int = Field(default=10000, ge=500, le=100000)
    target_water: float = Field(default=2.5, ge=0.5, le=20.0)
    target_workout_minutes: int = Field(default=30, ge=5, le=600)


class HealthScoreRequest(BaseModel):
    user_id: UserId = "default_user"
    age: int | None = Field(default=None, ge=10, le=120)
    weight: float | None = Field(default=None, ge=20, le=400)
    height: float | None = Field(default=None, ge=50, le=280)
