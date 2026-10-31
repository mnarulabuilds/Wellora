from __future__ import annotations

from enum import Enum
from typing import Annotated

from pydantic import AfterValidator, Field

UserId = Annotated[str, Field(min_length=1, max_length=128)]


def _strip_nonempty(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("cannot be empty")
    return cleaned


NonEmptyStr = Annotated[str, AfterValidator(_strip_nonempty)]

TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"
HHMM = Annotated[str, Field(pattern=TIME_PATTERN, examples=["08:00"])]


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


class HabitCategory(str, Enum):
    mindfulness = "mindfulness"
    fitness = "fitness"
    nutrition = "nutrition"
    recovery = "recovery"


class MealSlot(str, Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


class VitalType(str, Enum):
    blood_pressure = "blood_pressure"
    heart_rate = "heart_rate"
    blood_glucose = "blood_glucose"
    spo2 = "spo2"
    temperature = "temperature"


class GlucoseContext(str, Enum):
    fasting = "fasting"
    before_meal = "before_meal"
    after_meal = "after_meal"
    random = "random"


class ExportFormat(str, Enum):
    json = "json"
    csv = "csv"
