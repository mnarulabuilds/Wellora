import pytest

from wellora.services.nlp import SimpleNLP

nlp = SimpleNLP()


@pytest.mark.parametrize(
    ("text", "intent"),
    [
        ("What should I eat for a high protein breakfast?", "dietary_advice"),
        ("Give me a gym workout for strength", "fitness_advice"),
        ("I can't sleep at night, insomnia is killing me", "sleep_advice"),
        ("I feel stressed and overwhelmed", "mental_health"),
        ("How much water should I drink?", "hydration_advice"),
        ("I forgot to take my pill, what about the missed dose?", "medication"),
        ("Is my blood pressure of 130/85 ok?", "vitals"),
        ("hello there", "general_health"),
    ],
)
def test_detect_intent(text, intent):
    assert nlp.detect_intent(text) == intent


def test_extract_entities_dedupes_and_finds_measurements():
    entities = nlp.extract_entities("I ran 5 km and did yoga, then yoga again, ate protein")
    labels = {(e["label"], e["text"]) for e in entities}
    assert ("MEASUREMENT", "5 km") in labels
    assert ("ACTIVITY", "yoga") in labels
    assert sum(1 for e in entities if e["text"] == "yoga") == 1
