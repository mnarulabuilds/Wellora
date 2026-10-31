"""Vitals classification against widely used adult reference ranges.

These ranges are for general guidance only (AHA blood-pressure categories, ADA
glucose thresholds, typical resting heart rate / SpO2 / body temperature). The
app always tells users to consult a clinician about abnormal readings.
"""

from __future__ import annotations

from typing import Any

from wellora.core.dates import now_iso
from wellora.repositories import vitals as vitals_repo

UNITS = {
    "blood_pressure": "mmHg",
    "heart_rate": "bpm",
    "blood_glucose": "mg/dL",
    "spo2": "%",
    "temperature": "°C",
}

LABELS = {
    "blood_pressure": "Blood Pressure",
    "heart_rate": "Resting Heart Rate",
    "blood_glucose": "Blood Glucose",
    "spo2": "Blood Oxygen (SpO₂)",
    "temperature": "Body Temperature",
}

# severity: normal < elevated < high/low < critical
SEVERITY_ORDER = ["normal", "elevated", "low", "high", "critical"]


def classify(
    vital_type: str, value: float, secondary: float | None = None, context: str | None = None
) -> dict[str, str]:
    if vital_type == "blood_pressure":
        return _blood_pressure(value, secondary or 0)
    if vital_type == "heart_rate":
        if value < 40:
            return _r(
                "critical", "Very low", "Very low heart rate. Seek medical advice if you feel dizzy or faint."
            )
        if value < 60:
            return _r(
                "low",
                "Below typical range",
                "Common in fit people; mention it to your doctor if you have symptoms.",
            )
        if value <= 100:
            return _r("normal", "Normal", "Healthy resting heart rate.")
        if value <= 130:
            return _r(
                "high",
                "Elevated (tachycardia)",
                "Rest and re-measure. Persistently high readings warrant a check-up.",
            )
        return _r("critical", "Very high", "Very high resting heart rate — seek medical care promptly.")
    if vital_type == "blood_glucose":
        return _glucose(value, context or "random")
    if vital_type == "spo2":
        if value >= 95:
            return _r("normal", "Normal", "Healthy oxygen saturation.")
        if value >= 91:
            return _r(
                "low", "Below normal", "Re-measure while resting. Consult a doctor if it stays below 95%."
            )
        return _r("critical", "Very low", "Low oxygen saturation — seek medical care immediately.")
    if vital_type == "temperature":
        if value < 35.0:
            return _r("critical", "Hypothermia", "Body temperature is dangerously low — seek medical care.")
        if value < 36.1:
            return _r("low", "Below normal", "Slightly low. Warm up and re-measure.")
        if value <= 37.2:
            return _r("normal", "Normal", "Healthy body temperature.")
        if value < 38.0:
            return _r("elevated", "Slightly raised", "Low-grade temperature. Rest and stay hydrated.")
        if value < 39.5:
            return _r("high", "Fever", "Fever. Rest, hydrate and consult a doctor if it lasts over 48h.")
        return _r("critical", "High fever", "High fever — seek medical care.")
    return _r("normal", "Recorded", "")


def _r(status: str, label: str, advice: str) -> dict[str, str]:
    return {"status": status, "label": label, "advice": advice}


def _blood_pressure(systolic: float, diastolic: float) -> dict[str, str]:
    if systolic > 180 or diastolic > 120:
        return _r(
            "critical",
            "Hypertensive crisis",
            "Re-measure after 5 minutes. If still this high, seek emergency care.",
        )
    if systolic < 90 or diastolic < 60:
        return _r(
            "low", "Low blood pressure", "Stay hydrated and stand up slowly. See a doctor if you feel faint."
        )
    if systolic >= 140 or diastolic >= 90:
        return _r("high", "High — Stage 2", "Consult your doctor about these readings.")
    if systolic >= 130 or diastolic >= 80:
        return _r(
            "high",
            "High — Stage 1",
            "Reduce salt, stay active and track regularly. Discuss with your doctor.",
        )
    if systolic >= 120:
        return _r("elevated", "Elevated", "Lifestyle changes (less salt, more activity) can bring this down.")
    return _r("normal", "Normal", "Healthy blood pressure.")


def _glucose(value: float, context: str) -> dict[str, str]:
    if value < 54:
        return _r("critical", "Very low", "Severe hypoglycaemia — take fast-acting sugar and seek help.")
    if value < 70:
        return _r("low", "Low", "Have 15g of fast-acting carbs and re-check in 15 minutes.")
    if context in ("fasting", "before_meal"):
        if value < 100:
            return _r("normal", "Normal (fasting)", "Healthy fasting glucose.")
        if value < 126:
            return _r("elevated", "Prediabetes range", "Talk to your doctor about an HbA1c test.")
        return _r("high", "Diabetes range", "Fasting glucose ≥126 mg/dL — please consult your doctor.")
    if value < 140:
        return _r("normal", "Normal", "Healthy post-meal / random glucose.")
    if value < 200:
        return _r(
            "elevated",
            "Elevated",
            "Higher than ideal after eating. Keep tracking and review with your doctor.",
        )
    if value < 300:
        return _r("high", "High", "Glucose ≥200 mg/dL — please consult your doctor.")
    return _r("critical", "Very high", "Very high glucose — seek medical care, especially with symptoms.")


def format_value(reading: dict[str, Any]) -> str:
    if reading["vital_type"] == "blood_pressure":
        return f"{reading['value']:g}/{reading['value_secondary']:g}"
    return f"{reading['value']:g}"


def enrich(reading: dict[str, Any]) -> dict[str, Any]:
    vital_type = reading["vital_type"]
    return {
        **reading,
        "label": LABELS.get(vital_type, vital_type),
        "unit": UNITS.get(vital_type, ""),
        "display_value": format_value(reading),
        "classification": classify(
            vital_type, reading["value"], reading.get("value_secondary"), reading.get("context")
        ),
    }


def record(payload: dict[str, Any]) -> dict[str, Any]:
    measured_at = payload.get("measured_at")
    saved = vitals_repo.insert(
        user_id=payload["user_id"],
        vital_type=payload["vital_type"],
        value=payload["value"],
        value_secondary=payload.get("value_secondary"),
        context=payload.get("context"),
        measured_at=measured_at.isoformat(timespec="seconds") if measured_at else now_iso(),
        notes=payload.get("notes", ""),
    )
    return enrich(saved)


def latest_overview(user_id: str) -> list[dict[str, Any]]:
    return [enrich(r) for r in vitals_repo.latest_per_type(user_id)]


def history(user_id: str, vital_type: str | None, limit: int) -> list[dict[str, Any]]:
    return [enrich(r) for r in vitals_repo.list_readings(user_id, vital_type, limit)]
