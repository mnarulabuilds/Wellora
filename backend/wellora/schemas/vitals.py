from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from wellora.schemas.common import GlucoseContext, UserId, VitalType

# Physiologically plausible input bounds (not health ranges) to reject typos.
BOUNDS: dict[VitalType, tuple[float, float]] = {
    VitalType.blood_pressure: (50, 260),  # systolic mmHg
    VitalType.heart_rate: (25, 250),  # bpm
    VitalType.blood_glucose: (20, 600),  # mg/dL
    VitalType.spo2: (50, 100),  # %
    VitalType.temperature: (34, 43),  # °C
}


class VitalCreate(BaseModel):
    user_id: UserId
    vital_type: VitalType
    value: float = Field(..., description="Systolic for blood pressure")
    value_secondary: float | None = Field(default=None, description="Diastolic for blood pressure")
    context: GlucoseContext | None = None
    measured_at: datetime | None = None
    notes: str = Field(default="", max_length=300)

    @model_validator(mode="after")
    def _validate(self) -> VitalCreate:
        low, high = BOUNDS[self.vital_type]
        if not low <= self.value <= high:
            raise ValueError(f"{self.vital_type.value} value must be between {low} and {high}.")
        if self.vital_type == VitalType.blood_pressure:
            if self.value_secondary is None:
                raise ValueError("Diastolic (value_secondary) is required for blood pressure.")
            if not 30 <= self.value_secondary <= 160:
                raise ValueError("Diastolic must be between 30 and 160 mmHg.")
            if self.value_secondary >= self.value:
                raise ValueError("Diastolic must be lower than systolic.")
        else:
            self.value_secondary = None
        if self.vital_type != VitalType.blood_glucose:
            self.context = None
        return self
