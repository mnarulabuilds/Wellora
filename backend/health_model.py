from typing import Any, Dict, List


class HealthRecommender:
    def calculate_bmi(self, weight: float, height_cm: float) -> str:
        if height_cm <= 0 or weight <= 0:
            return "Normal"
        bmi = weight / ((height_cm / 100) ** 2)
        if bmi < 18.5:
            return "Underweight"
        if bmi < 25.0:
            return "Normal"
        if bmi < 30.0:
            return "Overweight"
        return "Obese"

    def calculate_bmi_value(self, weight: float, height_cm: float) -> float:
        if height_cm <= 0 or weight <= 0:
            return 22.0
        return round(weight / ((height_cm / 100) ** 2), 2)

    def estimate_bmr(
        self,
        weight: float,
        height_cm: float,
        age: int,
        gender: str = "male",
    ) -> float:
        # Mifflin-St Jeor Equation
        bmr = (10.0 * weight) + (6.25 * height_cm) - (5.0 * age)
        bmr += 5.0 if gender.lower() == "male" else -161.0
        return max(bmr, 800.0)

    def estimate_tdee(
        self,
        weight: float,
        height_cm: float,
        age: int,
        activity_level: str,
        gender: str = "male",
    ) -> float:
        bmr = self.estimate_bmr(weight, height_cm, age, gender)
        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9,
        }
        multiplier = multipliers.get(activity_level.lower(), 1.2)
        return round(bmr * multiplier, 1)

    def adjust_calories_for_goals(
        self, tdee: float, goals: List[str], gender: str = "male"
    ) -> float:
        adjusted = tdee
        if "weight_loss" in goals:
            adjusted = tdee - 500.0
        elif "muscle_gain" in goals:
            adjusted = tdee + 350.0

        # Safety caloric floor
        min_safe = 1500.0 if gender.lower() == "male" else 1200.0
        return max(adjusted, min_safe)

    def generate_macro_split(
        self, goals: List[str], dietary_preferences: List[str]
    ) -> Dict[str, float]:
        # Default balanced: 30% protein, 45% carbs, 25% fats
        protein, carbs, fats = 0.30, 0.45, 0.25

        if "keto" in dietary_preferences:
            protein, carbs, fats = 0.25, 0.05, 0.70
        elif "muscle_gain" in goals:
            protein, carbs, fats = 0.35, 0.40, 0.25
        elif "weight_loss" in goals:
            protein, carbs, fats = 0.35, 0.35, 0.30

        if "vegan" in dietary_preferences or "vegetarian" in dietary_preferences:
            if "keto" not in dietary_preferences:
                protein = round(min(protein + 0.05, 0.40), 2)
                carbs = round(max(carbs - 0.05, 0.30), 2)

        # Normalize to ensure exactly 1.0 sum
        total = protein + carbs + fats
        return {
            "protein": round(protein / total, 2),
            "carbs": round(carbs / total, 2),
            "fats": round(fats / total, 2),
        }

    def generate_recommendations(
        self, bmi_category: str, tdee: float, goals: List[str]
    ) -> List[str]:
        recommendations = []
        target_calories = int(self.adjust_calories_for_goals(tdee, goals))

        if bmi_category in ["Overweight", "Obese"]:
            recommendations.append(
                f"Target ~{target_calories} kcal/day with whole, unprocessed foods and high-satiety fiber."
            )
            recommendations.append("Incorporate 30-45 minutes of moderate aerobic or brisk walking daily.")
        elif bmi_category == "Underweight":
            recommendations.append(
                f"Aim for a gentle caloric surplus of ~{target_calories} kcal/day with nutrient-dense foods."
            )
            recommendations.append("Focus on progressive resistance training to build lean muscle mass.")
        else:
            recommendations.append(
                f"Your estimated daily energy balance is ~{target_calories} kcal."
            )
            recommendations.append("Maintain consistency with regular movement, quality sleep, and hydration.")

        if "weight_loss" in goals:
            recommendations.append(
                "Aim for a steady, sustainable 0.5 kg (1 lb) loss per week to preserve metabolic rate."
            )
        if "muscle_gain" in goals:
            recommendations.append(
                "Target 1.6 - 2.2g of protein per kg of body weight distributed across 3-4 meals."
            )
        if "better_sleep" in goals:
            recommendations.append(
                "Establish a consistent circadian routine: dim overhead lights and stop screen time 60 minutes before bed."
            )
        if "stress_reduction" in goals:
            recommendations.append(
                "Practice 5-10 minutes of box breathing (4s in, 4s hold, 4s out, 4s hold) to reduce cortisol."
            )
        if "improved_flexibility" in goals:
            recommendations.append(
                "Include a 15-20 minute dynamic mobility or yoga session at least 3 times per week."
            )
        if "spiritual_growth" in goals:
            recommendations.append(
                "Dedicate 15 minutes each morning to mindful reflection, gratitude journaling, or walking in nature."
            )

        return recommendations

    def get_dietary_notes(self, dietary_preferences: List[str]) -> List[str]:
        notes = []
        if "vegan" in dietary_preferences:
            notes.append("Vegan: Ensure adequate Vitamin B12, Iron, Zinc, and Omega-3 (algae) intake.")
        if "vegetarian" in dietary_preferences:
            notes.append("Vegetarian: Pair plant proteins (legumes + grains) for complete amino acid profiles.")
        if "gluten_free" in dietary_preferences:
            notes.append("Gluten-Free: Emphasize whole ancient grains like quinoa, buckwheat, and brown rice.")
        if "keto" in dietary_preferences:
            notes.append("Keto: Keep net carbohydrates under 30-50g and replenish essential electrolytes (sodium, potassium, magnesium).")
        if "dairy_free" in dietary_preferences:
            notes.append("Dairy-Free: Source calcium from dark leafy greens, sesame/tahini, and fortified plant milks.")
        return notes

    def generate_chart_data(
        self,
        tdee: float,
        weight: float,
        goals: List[str],
        dietary_preferences: List[str],
    ) -> Dict[str, Any]:
        macros_split = self.generate_macro_split(goals, dietary_preferences)
        adjusted_calories = self.adjust_calories_for_goals(tdee, goals)

        protein_cal = adjusted_calories * macros_split["protein"]
        carbs_cal = adjusted_calories * macros_split["carbs"]
        fats_cal = adjusted_calories * macros_split["fats"]

        protein_grams = round(protein_cal / 4.0, 1)
        carbs_grams = round(carbs_cal / 4.0, 1)
        fats_grams = round(fats_cal / 9.0, 1)

        macros = {
            "labels": ["Protein", "Carbs", "Fats"],
            "data": [macros_split["protein"], macros_split["carbs"], macros_split["fats"]],
            "grams": {
                "protein": protein_grams,
                "carbs": carbs_grams,
                "fats": fats_grams,
            },
        }

        weekly_change = 0.0
        if "weight_loss" in goals:
            weekly_change = -0.45
        elif "muscle_gain" in goals:
            weekly_change = 0.20

        weeks = list(range(1, 13))
        projected_weights = [round(weight + (weekly_change * w), 1) for w in weeks]
        projected_changes = [round(w - weight, 1) for w in projected_weights]

        return {
            "macros": macros,
            "weight_projection": {
                "weeks": weeks,
                "change": projected_changes,
                "weights": projected_weights,
            },
        }
