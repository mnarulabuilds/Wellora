from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"
    very_active = "very_active"


class Gender(str, Enum):
    male = "male"
    female = "female"


class ActivityType(str, Enum):
    meal = "meal"
    workout = "workout"
    water = "water"


class UserQuery(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    user_id: Optional[str] = Field(default=None, max_length=128)

    @field_validator("text")
    @classmethod
    def clean_text(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Query text cannot be empty or just whitespace.")
        return cleaned


class HealthReportRequest(BaseModel):
    age: int = Field(..., ge=10, le=120)
    weight: float = Field(..., ge=20, le=400)
    height: float = Field(..., ge=50, le=280)
    gender: Gender = Gender.male
    activity_level: ActivityLevel = ActivityLevel.light
    dietary_preferences: List[str] = Field(default_factory=list)
    health_goals: List[str] = Field(default_factory=list)


class UserProfile(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=10, le=120)
    weight: float = Field(..., ge=20, le=400)
    height: float = Field(..., ge=50, le=280)
    gender: Gender = Gender.male
    activity_level: ActivityLevel = ActivityLevel.light
    dietary_preferences: List[str] = Field(default_factory=list)
    health_goals: List[str] = Field(default_factory=list)
    target_calories: float = Field(default=2000, ge=500, le=10000)
    target_steps: int = Field(default=10000, ge=500, le=100000)
    target_water: float = Field(default=2.5, ge=0.5, le=20.0)
    target_workout_minutes: int = Field(default=30, ge=5, le=600)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Name cannot be empty.")
        return cleaned


class ActivityLog(BaseModel):
    user_id: Optional[str] = Field(default="default_user", max_length=128)
    activity_type: ActivityType
    details: str = Field(..., min_length=1, max_length=500)
    value: float = Field(..., gt=0)
    timestamp: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("details")
    @classmethod
    def clean_details(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Details cannot be empty.")
        return cleaned

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: float, info):
        activity_type = info.data.get("activity_type")
        if activity_type == ActivityType.meal and v > 10000:
            raise ValueError("Meal calories must be under 10,000 kcal.")
        if activity_type == ActivityType.workout and v > 720:
            raise ValueError("Workout duration must be under 720 minutes (12 hours).")
        if activity_type == ActivityType.water and v > 15:
            raise ValueError("Water amount must be under 15 liters.")
        return round(v, 2)


class ActivityLogUpdate(BaseModel):
    activity_type: Optional[ActivityType] = None
    details: Optional[str] = Field(default=None, min_length=1, max_length=500)
    value: Optional[float] = Field(default=None, gt=0)
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("details")
    @classmethod
    def clean_details(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if not cleaned:
                raise ValueError("Details cannot be empty.")
            return cleaned
        return v


class HealthScoreRequest(BaseModel):
    age: Optional[int] = Field(default=None, ge=10, le=120)
    weight: Optional[float] = Field(default=None, ge=20, le=400)
    height: Optional[float] = Field(default=None, ge=50, le=280)
    user_id: Optional[str] = Field(default="default_user", max_length=128)
