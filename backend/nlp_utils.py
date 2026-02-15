import re

class SimpleNLP:
    def __init__(self):
        # We can expand this with spaCy later for true entity extraction
        pass

    def detect_intent(self, text: str):
        text_lower = text.lower()
        if any(kw in text_lower for kw in ["diet", "food", "nutrition", "eat", "meal"]):
            return "dietary_advice"
        elif any(kw in text_lower for kw in ["exercise", "workout", "fitness", "run", "gym"]):
            return "fitness_advice"
        elif any(kw in text_lower for kw in ["sleep", "tired", "insomnia", "rest"]):
            return "sleep_advice"
        else:
            return "general_health"

    def extract_entities(self, text: str):
        # Placeholder for NER logic
        entities = []
        if "protein" in text.lower():
            entities.append("nutrient:protein")
        if "cardio" in text.lower():
            entities.append("activity:cardio")
        return entities
