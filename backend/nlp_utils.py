import re

# Handle potential compatibility issues with newer Python versions (like 3.14)
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
        self.intents = {
            "dietary_advice": ["diet", "food", "nutrition", "eat", "meal", "protein", "calories", "fat", "carbs", "sugar", "vitamin"],
            "fitness_advice": ["exercise", "workout", "fitness", "run", "gym", "cardio", "strength", "training", "workout", "walk", "jog", "lift"],
            "sleep_advice": ["sleep", "tired", "insomnia", "rest", "nap", "bedtime", "night", "awake", "exhausted"],
            "mental_health": ["stress", "anxiety", "meditation", "relaxed", "mental", "mood", "happy", "sad", "unmotivated", "depressed"],
            "hydration_advice": ["water", "drink", "hydration", "thirsty", "dehydration", "liquid"],
            "weight_advice": ["weight", "fat", "lose", "gain", "muscle", "mass", "bmi", "heavy", "thin"]
        }

    def detect_intent(self, text: str):
        text_lower = text.lower()
        
        # Calculate scores for each intent based on keyword matches
        scores = {}
        for intent, keywords in self.intents.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[intent] = score
        
        if not scores:
            return "general_health"
        
        # Return the intent with the highest score
        return max(scores, key=scores.get)

    def extract_entities(self, text: str):
        entities = []
        
        # Use spaCy for NER if available
        if nlp:
            doc = nlp(text)
            for ent in doc.ents:
                entities.append({
                    "label": ent.label_,
                    "text": ent.text
                })
        
        # Fallback/Additional hardcoded extraction
        if "protein" in text.lower():
            entities.append({"label": "NUTRIENT", "text": "protein"})
        if "cardio" in text.lower():
            entities.append({"label": "ACTIVITY", "text": "cardio"})
        
        # Extract numbers (e.g., "I walked 5km", "I ate 2000 calories")
        numbers = re.findall(r'\d+', text)
        for num in numbers:
            entities.append({"label": "CARDINAL", "text": num})
            
        return entities
