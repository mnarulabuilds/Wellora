from typing import Dict, List, Any
import random

class HealthRecommender:
    def __init__(self):
        # We can load pre-trained ML models here (e.g., joblib/pickle files)
        pass

    def calculate_bmi(self, weight: float, height_cm: float) -> str:
        """Calculates BMI and returns category."""
        bmi = weight / ((height_cm / 100) ** 2)
        if bmi < 18.5: return "Underweight"
        elif 18.5 <= bmi < 25: return "Normal"
        elif 25 <= bmi < 30: return "Overweight"
        else: return "Obese"

    def estimate_tdee(self, weight: float, height_cm: float, age: int, activity_level: str) -> float:
        """Estimates Total Daily Energy Expenditure using Mifflin-St Jeor equation."""
        # Simple assumption: Male BMR (can be refined with gender input)
        bmr = 10 * weight + 6.25 * height_cm - 5 * age + 5
        
        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9
        }
        return bmr * multipliers.get(activity_level, 1.2)

    def generate_recommendations(self, bmi_category: str, tdee: float, goals: List[str]) -> List[str]:
        recommendations = []
        
        # BMI-based advice
        if bmi_category in ["Overweight", "Obese"]:
            recommendations.append(f"Aim for a daily intake of {int(tdee - 500)} calories mostly from whole foods.")
            recommendations.append("Incorporate 30 minutes of moderate activity daily.")
        elif bmi_category == "Underweight":
            recommendations.append(f"Aim for a daily surplus, target {int(tdee + 300)} calories.")
            recommendations.append("Focus on strength training to build muscle mass.")
        else:
            recommendations.append(f"Maintenance calories are approximately {int(tdee)} kcal.")

        # Goal-based advice
        if "stress_reduction" in goals:
             recommendations.append("Incorporate 10-15 minutes of guided meditation or deep breathing exercises daily to lower cortisol levels.")
        if "better_sleep" in goals:
             recommendations.append("Establish a 'digital sunset'—no screens 60 minutes before bed to improve sleep architecture.")
        if "muscle_gain" in goals:
             recommendations.append("Focus on progressive overload in your strength training and ensure protein intake is around 1.6g/kg of body weight.")
        if "spiritual_growth" in goals:
             recommendations.append("Try daily journaling or spending 20 minutes in nature to connect with your inner self and find peace.")
        if "improved_flexibility" in goals:
             recommendations.append("Add a 20-minute yoga flow or dynamic stretching routine at least 3 times a week.")
             
        return recommendations

    def generate_chart_data(self, tdee: float) -> Dict[str, Any]:
        """Generates mock data for health charts."""
        # Macronutrient distribution
        macros = {
            "labels": ["Protein", "Carbs", "Fats"],
            "data": [0.3, 0.4, 0.3]  # Standard 30/40/30 split
        }
        
        # Weight projection over 12 weeks based on deficit/surplus
        weeks = list(range(1, 13))
        projected_weight_change = [-0.5 * w for w in weeks] # Losing 0.5kg per week assumption
        
        return {
            "macros": macros,
            "weight_projection": {"weeks": weeks, "change": projected_weight_change}
        }
