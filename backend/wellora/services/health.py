"""Pure biometric calculations (no I/O) — easy to unit test.

BMR uses Mifflin-St Jeor; TDEE uses standard activity multipliers.
"""

from __future__ import annotations

from typing import Any

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

GOAL_TIPS = {
    "weight_loss": "Aim for a steady, sustainable 0.5 kg (1 lb) loss per week to preserve metabolic rate.",
    "muscle_gain": "Target 1.6 - 2.2g of protein per kg of body weight distributed across 3-4 meals.",
    "better_sleep": "Keep a consistent wake time and stop screen time 60 minutes before bed.",
    "stress_reduction": "Practice 5-10 minutes of box breathing (4s in, 4s hold, 4s out, 4s hold) daily.",
    "improved_flexibility": "Include a 15-20 minute mobility or yoga session at least 3 times per week.",
    "spiritual_growth": "Dedicate 15 minutes each morning to reflection, gratitude journaling or a nature walk.",
}

DIET_NOTES = {
    "vegan": "Vegan: ensure adequate Vitamin B12, iron, zinc and omega-3 (algae) intake.",
    "vegetarian": "Vegetarian: pair plant proteins (dal + rice, legumes + grains) for complete amino acids.",
    "gluten_free": "Gluten-free: emphasise millets, quinoa, buckwheat and brown rice.",
    "keto": "Keto: keep net carbs under 30-50g and replenish sodium, potassium and magnesium.",
    "dairy_free": "Dairy-free: source calcium from leafy greens, sesame/tahini and fortified plant milks.",
}


def bmi_value(weight: float, height_cm: float) -> float:
    if height_cm <= 0 or weight <= 0:
        return 0.0
    return round(weight / ((height_cm / 100) ** 2), 2)


def bmi_category(weight: float, height_cm: float) -> str:
    bmi = bmi_value(weight, height_cm)
    if bmi == 0:
        return "Unknown"
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25.0:
        return "Normal"
    if bmi < 30.0:
        return "Overweight"
    return "Obese"


def bmr(weight: float, height_cm: float, age: int, gender: str = "male") -> float:
    value = 10.0 * weight + 6.25 * height_cm - 5.0 * age
    value += 5.0 if gender.lower() == "male" else -161.0
    return max(value, 800.0)


def tdee(weight: float, height_cm: float, age: int, activity_level: str, gender: str = "male") -> float:
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level.lower(), 1.2)
    return round(bmr(weight, height_cm, age, gender) * multiplier, 1)


def goal_calories(tdee_value: float, goals: list[str], gender: str = "male") -> float:
    adjusted = tdee_value
    if "weight_loss" in goals:
        adjusted -= 500.0
    elif "muscle_gain" in goals:
        adjusted += 350.0
    floor = 1500.0 if gender.lower() == "male" else 1200.0
    return max(adjusted, floor)


def macro_split(goals: list[str], dietary_preferences: list[str]) -> dict[str, float]:
    protein, carbs, fats = 0.30, 0.45, 0.25
    if "keto" in dietary_preferences:
        protein, carbs, fats = 0.25, 0.05, 0.70
    elif "muscle_gain" in goals:
        protein, carbs, fats = 0.35, 0.40, 0.25
    elif "weight_loss" in goals:
        protein, carbs, fats = 0.35, 0.35, 0.30

    plant_based = "vegan" in dietary_preferences or "vegetarian" in dietary_preferences
    if plant_based and "keto" not in dietary_preferences:
        protein = min(protein + 0.05, 0.40)
        carbs = max(carbs - 0.05, 0.30)

    total = protein + carbs + fats
    return {
        "protein": round(protein / total, 2),
        "carbs": round(carbs / total, 2),
        "fats": round(fats / total, 2),
    }


def macro_grams(calories: float, split: dict[str, float]) -> dict[str, float]:
    return {
        "protein": round(calories * split["protein"] / 4.0, 1),
        "carbs": round(calories * split["carbs"] / 4.0, 1),
        "fats": round(calories * split["fats"] / 9.0, 1),
    }


def recommendations(category: str, target_calories: float, goals: list[str]) -> list[str]:
    kcal = int(target_calories)
    if category in ("Overweight", "Obese"):
        recs = [
            f"Target ~{kcal} kcal/day with whole, unprocessed foods and high-satiety fibre.",
            "Add 30-45 minutes of brisk walking or other moderate cardio daily.",
        ]
    elif category == "Underweight":
        recs = [
            f"Aim for a gentle surplus of ~{kcal} kcal/day with nutrient-dense foods.",
            "Focus on progressive resistance training to build lean muscle.",
        ]
    else:
        recs = [
            f"Your estimated daily energy target is ~{kcal} kcal.",
            "Maintain consistency with regular movement, quality sleep and hydration.",
        ]
    recs.extend(GOAL_TIPS[g] for g in goals if g in GOAL_TIPS)
    return recs


def dietary_notes(preferences: list[str]) -> list[str]:
    return [DIET_NOTES[p] for p in preferences if p in DIET_NOTES]


def weight_projection(weight: float, goals: list[str], weeks: int = 12) -> dict[str, list[float]]:
    weekly_change = -0.45 if "weight_loss" in goals else 0.20 if "muscle_gain" in goals else 0.0
    week_numbers = list(range(1, weeks + 1))
    weights = [round(weight + weekly_change * w, 1) for w in week_numbers]
    return {
        "weeks": week_numbers,
        "weights": weights,
        "change": [round(w - weight, 1) for w in weights],
    }


def build_report(
    *,
    age: int,
    weight: float,
    height: float,
    gender: str,
    activity_level: str,
    goals: list[str],
    dietary_preferences: list[str],
) -> dict[str, Any]:
    category = bmi_category(weight, height)
    tdee_value = tdee(weight, height, age, activity_level, gender)
    calories = goal_calories(tdee_value, goals, gender)
    split = macro_split(goals, dietary_preferences)
    return {
        "bmi": bmi_value(weight, height),
        "bmi_category": category,
        "tdee": round(tdee_value),
        "daily_calories": round(calories),
        "recommendations": recommendations(category, calories, goals) + dietary_notes(dietary_preferences),
        "charts": {
            "macros": {
                "labels": ["Protein", "Carbs", "Fats"],
                "data": [split["protein"], split["carbs"], split["fats"]],
                "grams": macro_grams(calories, split),
            },
            "weight_projection": weight_projection(weight, goals),
        },
    }


def macro_targets_for_profile(profile: dict[str, Any] | None) -> dict[str, float]:
    """Daily macro gram targets from the user's calorie target and goals."""
    profile = profile or {}
    calories = float(profile.get("target_calories") or 2000)
    split = macro_split(profile.get("health_goals") or [], profile.get("dietary_preferences") or [])
    return {"calories": calories, **macro_grams(calories, split)}
