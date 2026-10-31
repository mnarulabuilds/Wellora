from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from wellora.schemas.common import MealSlot, NonEmptyStr, UserId


class FoodCreate(BaseModel):
    name: NonEmptyStr = Field(..., max_length=120)
    category: NonEmptyStr = Field(default="Custom", max_length=40)
    serving_size: float = Field(..., gt=0, le=5000)
    serving_unit: NonEmptyStr = Field(..., max_length=30)
    calories: float = Field(..., ge=0, le=5000)
    protein_g: float = Field(default=0, ge=0, le=500)
    carbs_g: float = Field(default=0, ge=0, le=500)
    fats_g: float = Field(default=0, ge=0, le=500)
    fiber_g: float = Field(default=0, ge=0, le=200)


class FoodLogCreate(BaseModel):
    user_id: UserId
    food_id: int = Field(..., ge=1)
    servings: float = Field(default=1.0, gt=0, le=20)
    meal_slot: MealSlot = MealSlot.snack
    timestamp: datetime | None = None
