"""Conversational coach: intent → curated advice + entity notes + the user's own data."""

from __future__ import annotations

import random
from collections import defaultdict, deque
from typing import Any

from wellora.repositories import profiles as profile_repo
from wellora.repositories import sleep as sleep_repo
from wellora.services import activity as activity_service
from wellora.services import medications as med_service
from wellora.services import nutrition as nutrition_service
from wellora.services import vitals as vitals_service
from wellora.services.assistant_responses import RESPONSES
from wellora.services.health import bmi_category
from wellora.services.nlp import SimpleNLP

SAFETY_NOTE = "⚕️ I'm a wellness coach, not a doctor — for symptoms or medication changes, please consult a healthcare professional."
SAFETY_INTENTS = {"pain_points", "medication", "vitals"}

SUGGESTIONS = {
    "dietary_advice": ["How much protein do I need?", "Healthy Indian breakfast ideas", "Log a meal"],
    "fitness_advice": ["Suggest a 20-minute home workout", "How do I start running?"],
    "sleep_advice": ["How can I fall asleep faster?", "Is napping good for me?"],
    "mental_health": ["Quick breathing exercise", "How do I handle burnout?"],
    "hydration_advice": ["How much water should I drink?", "Signs of dehydration"],
    "weight_advice": ["How fast should I lose weight?", "What is a healthy BMI?"],
    "medication": ["What if I miss a dose?", "How do I set medicine reminders?"],
    "vitals": ["What is a normal blood pressure?", "How to measure BP correctly"],
    "general_health": ["What should I eat today?", "How can I sleep better?", "Show my progress"],
}


class Assistant:
    def __init__(self, nlp: SimpleNLP | None = None, rng: random.Random | None = None):
        self.nlp = nlp or SimpleNLP()
        self.rng = rng or random.Random()
        self._recent: dict[str, deque[str]] = defaultdict(lambda: deque(maxlen=3))

    def _pick(self, intent: str) -> str:
        pool = RESPONSES.get(intent) or RESPONSES["general_health"]
        recent = self._recent[intent]
        choice = self.rng.choice([r for r in pool if r not in recent] or pool)
        recent.append(choice)
        return choice

    @staticmethod
    def entity_notes(entities: list[dict[str, str]]) -> list[str]:
        notes = []
        for ent in entities:
            text = ent.get("text", "")
            label = ent.get("label")
            if label == "NUTRIENT":
                notes.append(f"Focusing on {text} is a smart choice for recovery and metabolic health.")
            elif label == "ACTIVITY":
                notes.append(f"{text.capitalize()} is an excellent choice for stamina and mental clarity!")
            elif label == "PAIN_TYPE":
                notes.append(f"Regarding your {text}: take it easy and don't push through sharp pain.")
        return notes[:2]

    @staticmethod
    def user_context(user_id: str, intent: str) -> list[str]:
        parts: list[str] = []
        profile = profile_repo.get(user_id)
        if (
            profile
            and profile.get("weight")
            and profile.get("height")
            and intent in ("weight_advice", "dietary_advice")
        ):
            parts.append(f"Your BMI category is {bmi_category(profile['weight'], profile['height'])}.")

        if intent == "dietary_advice":
            nutrition = nutrition_service.daily_nutrition(user_id)
            consumed, targets = nutrition["consumed"], nutrition["targets"]
            parts.append(
                f"Today: {consumed['calories']:g}/{targets['calories']:g} kcal and "
                f"{consumed['protein_g']:g}/{targets['protein']:g} g protein."
            )
        elif intent == "medication":
            schedule = med_service.schedule_for_day(user_id)
            if schedule["total"]:
                parts.append(
                    f"You've taken {schedule['taken']} of {schedule['total']} scheduled doses today."
                )
                nxt = schedule["next_dose"]
                if nxt:
                    parts.append(f"Next: {nxt['name']} at {nxt['scheduled_time']}.")
        elif intent == "vitals":
            for reading in vitals_service.latest_overview(user_id)[:3]:
                cls = reading["classification"]
                parts.append(
                    f"Latest {reading['label']}: {reading['display_value']} {reading['unit']} ({cls['label']})."
                )
        elif intent == "sleep_advice":
            latest = sleep_repo.latest(user_id)
            if latest:
                parts.append(f"Last recorded sleep: {latest['hours']:g}h ({latest['quality']}/5).")
        else:
            summary = activity_service.daily_summary(user_id)
            logged = []
            if summary["calories_logged"]:
                logged.append(f"{summary['calories_logged']:g} kcal")
            if summary["workout_minutes"]:
                logged.append(f"{summary['workout_minutes']:g} min exercise")
            if summary["water_liters"]:
                logged.append(f"{summary['water_liters']:g}L water")
            if logged:
                parts.append(f"Today you've logged {', '.join(logged)}.")

        streak = activity_service.streak(user_id)
        if streak["current_streak"] >= 2:
            parts.append(f"You're on a {streak['current_streak']}-day streak! 🔥")
        return parts

    def reply(self, text: str, user_id: str | None = None) -> dict[str, Any]:
        intent = self.nlp.detect_intent(text)
        entities = self.nlp.extract_entities(text)
        sections = [self._pick(intent)]
        notes = self.entity_notes(entities)
        if notes:
            sections.append(" ".join(notes))
        if user_id:
            context = self.user_context(user_id, intent)
            if context:
                sections.append(" ".join(context))
        if intent in SAFETY_INTENTS:
            sections.append(SAFETY_NOTE)
        return {
            "intent": intent,
            "entities": entities,
            "response": "\n\n".join(sections),
            "suggestions": SUGGESTIONS.get(intent, SUGGESTIONS["general_health"]),
        }


assistant = Assistant()
