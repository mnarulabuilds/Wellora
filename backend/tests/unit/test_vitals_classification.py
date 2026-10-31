import pytest

from wellora.services.vitals import classify, format_value


@pytest.mark.parametrize(
    ("sys", "dia", "status", "label"),
    [
        (115, 75, "normal", "Normal"),
        (125, 78, "elevated", "Elevated"),
        (132, 82, "high", "High — Stage 1"),
        (145, 85, "high", "High — Stage 2"),
        (185, 100, "critical", "Hypertensive crisis"),
        (85, 55, "low", "Low blood pressure"),
    ],
)
def test_blood_pressure(sys, dia, status, label):
    result = classify("blood_pressure", sys, dia)
    assert (result["status"], result["label"]) == (status, label)


@pytest.mark.parametrize(
    ("value", "context", "status"),
    [
        (90, "fasting", "normal"),
        (110, "fasting", "elevated"),
        (130, "fasting", "high"),
        (130, "after_meal", "normal"),
        (180, "random", "elevated"),
        (65, "random", "low"),
        (50, "fasting", "critical"),
    ],
)
def test_glucose(value, context, status):
    assert classify("blood_glucose", value, context=context)["status"] == status


@pytest.mark.parametrize(
    ("vital", "value", "status"),
    [
        ("heart_rate", 72, "normal"),
        ("heart_rate", 55, "low"),
        ("heart_rate", 110, "high"),
        ("spo2", 98, "normal"),
        ("spo2", 92, "low"),
        ("spo2", 88, "critical"),
        ("temperature", 36.8, "normal"),
        ("temperature", 38.5, "high"),
        ("temperature", 37.5, "elevated"),
    ],
)
def test_other_vitals(vital, value, status):
    assert classify(vital, value)["status"] == status


def test_format_value():
    assert format_value({"vital_type": "blood_pressure", "value": 120.0, "value_secondary": 80.0}) == "120/80"
    assert format_value({"vital_type": "heart_rate", "value": 64.0, "value_secondary": None}) == "64"
