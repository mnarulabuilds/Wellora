import re
from typing import Any, Dict, List, Optional

try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        nlp = None
except Exception:
    spacy = None
    nlp = None


class SimpleNLP:
    def __init__(self):
        self.intents: Dict[str, List[str]] = {
            "dietary_advice": [
                "diet", "food", "nutrition", "eat", "meal", "protein", "calories", "fat",
                "carbs", "sugar", "vitamin", "recipe", "healthy", "snack", "breakfast",
                "lunch", "dinner", "keto", "vegan", "vegetarian", "fiber", "nutrient",
                "fasting", "supplement", "portion", "macro", "macros"
            ],
            "fitness_advice": [
                "exercise", "workout", "fitness", "run", "running", "gym", "cardio",
                "strength", "training", "walk", "walking", "jog", "jogging", "lift",
                "lifting", "squat", "pushup", "muscle", "hiit", "aerobic", "stretching",
                "mobility", "cycling", "swimming", "endurance", "crossfit", "sets", "reps"
            ],
            "sleep_advice": [
                "sleep", "tired", "insomnia", "rest", "nap", "bedtime", "night", "awake",
                "exhausted", "dream", "snore", "melatonin", "circadian", "wake", "bed",
                "sleepy", "grogginess", "rem", "deep sleep"
            ],
            "mental_health": [
                "stress", "anxiety", "meditation", "relaxed", "mental", "mood", "happy",
                "sad", "unmotivated", "depressed", "therapy", "peace", "calm", "focus",
                "mindfulness", "burnout", "overwhelmed", "nervous", "breathing", "gratitude"
            ],
            "hydration_advice": [
                "water", "drink", "hydration", "thirsty", "dehydration", "liquid", "bottle",
                "fluid", "electrolytes", "ounces", "liters", "thirst"
            ],
            "weight_advice": [
                "weight", "fat", "lose weight", "gain weight", "muscle mass", "bmi", "heavy",
                "thin", "scale", "obese", "overweight", "underweight", "body fat", "deficit", "surplus"
            ],
            "spiritual_health": [
                "spirit", "spiritual", "soul", "purpose", "meaning", "connection", "inner peace",
                "universe", "yoga", "breathe", "gratitude", "nature", "meditation", "presence",
                "stillness", "harmony", "journaling", "reflection"
            ],
            "pain_points": [
                "pain", "hurt", "headache", "backache", "sore", "soreness", "fatigue",
                "injury", "inflammation", "bloated", "bloating", "cramp", "cramps",
                "stiff", "stiffness", "ache", "aching", "migraine", "strain"
            ],
            "habit_and_streak": [
                "streak", "habit", "consistency", "progress", "score", "history",
                "routine", "motivation", "discipline", "goal", "track", "tracking"
            ],
        }

    def detect_intent(self, text: str) -> str:
        text_lower = text.lower()

        scores: Dict[str, float] = {}
        for intent, keywords in self.intents.items():
            score = 0.0
            for kw in keywords:
                if " " in kw:
                    if kw in text_lower:
                        score += 2.5
                else:
                    pattern = rf"\b{re.escape(kw)}\b"
                    if re.search(pattern, text_lower):
                        score += 1.0

            if score > 0:
                scores[intent] = score

        if not scores:
            return "general_health"

        return max(scores, key=scores.get)

    def extract_entities(self, text: str) -> List[Dict[str, str]]:
        entities: List[Dict[str, str]] = []
        text_lower = text.lower()

        # Use spaCy for NER if available
        if nlp:
            try:
                doc = nlp(text)
                for ent in doc.ents:
                    entities.append({"label": ent.label_, "text": ent.text})
            except Exception:
                pass

        # Targeted entity extractors
        nutrient_keywords = ["protein", "carbs", "fats", "sugar", "fiber", "vitamin", "creatine", "omega-3", "magnesium"]
        for nut in nutrient_keywords:
            if nut in text_lower:
                entities.append({"label": "NUTRIENT", "text": nut})

        activity_keywords = ["cardio", "running", "walking", "cycling", "swimming", "yoga", "gym", "hiit", "weightlifting", "pilates"]
        for act in activity_keywords:
            if act in text_lower:
                entities.append({"label": "ACTIVITY", "text": act})

        pain_keywords = ["headache", "backache", "back pain", "neck pain", "knee pain", "shoulder pain", "soreness", "bloating", "cramps", "insomnia", "migraine"]
        for pain in pain_keywords:
            if pain in text_lower:
                entities.append({"label": "PAIN_TYPE", "text": pain})

        # Extract quantities with units (e.g., "500 kcal", "30 mins", "2 liters", "5 km")
        quantity_matches = re.findall(
            r"(\d+(?:\.\d+)?)\s*(kcal|cal|calories|min|mins|minutes|hour|hours|l|liter|liters|ml|kg|lbs|steps|km|miles)\b",
            text_lower,
        )
        for val, unit in quantity_matches:
            entities.append({"label": "MEASUREMENT", "text": f"{val} {unit}"})

        # Deduplicate entities
        seen = set()
        unique_entities = []
        for e in entities:
            key = (e["label"], e["text"].lower())
            if key not in seen:
                seen.add(key)
                unique_entities.append(e)

        return unique_entities
