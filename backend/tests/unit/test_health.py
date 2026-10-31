import pytest

from wellora.services import health


@pytest.mark.parametrize(
    ("weight", "height", "expected"),
    [
        (50, 180, "Underweight"),
        (70, 175, "Normal"),
        (85, 175, "Overweight"),
        (110, 175, "Obese"),
        (0, 175, "Unknown"),
    ],
)
def test_bmi_category(weight, height, expected):
    assert health.bmi_category(weight, height) == expected


def test_bmi_value_rounds_and_guards_zero():
    assert health.bmi_value(70, 175) == 22.86
    assert health.bmi_value(70, 0) == 0.0


def test_bmr_mifflin_st_jeor():
    assert health.bmr(70, 175, 30, "male") == pytest.approx(1648.75)
    assert health.bmr(60, 165, 30, "female") == pytest.approx(1320.25)
    assert health.bmr(20, 50, 120, "female") == 800.0  # safety floor


def test_tdee_uses_activity_multiplier_and_defaults_unknown_to_sedentary():
    base = health.bmr(70, 175, 30, "male")
    assert health.tdee(70, 175, 30, "moderate", "male") == round(base * 1.55, 1)
    assert health.tdee(70, 175, 30, "couch", "male") == round(base * 1.2, 1)


def test_goal_calories_deficit_surplus_and_floor():
    assert health.goal_calories(2500, ["weight_loss"]) == 2000
    assert health.goal_calories(2500, ["muscle_gain"]) == 2850
    assert health.goal_calories(1500, ["weight_loss"], "female") == 1200
    assert health.goal_calories(1700, ["weight_loss"], "male") == 1500


def test_macro_split_sums_to_one_and_respects_keto():
    split = health.macro_split(["muscle_gain"], ["vegan"])
    assert sum(split.values()) == pytest.approx(1.0, abs=0.02)
    assert health.macro_split([], ["keto"])["carbs"] == 0.05


def test_macro_grams_conversion():
    grams = health.macro_grams(2000, {"protein": 0.3, "carbs": 0.4, "fats": 0.3})
    assert grams == {"protein": 150.0, "carbs": 200.0, "fats": 66.7}


def test_weight_projection_direction():
    loss = health.weight_projection(80, ["weight_loss"])
    assert loss["weights"][-1] < 80 and len(loss["weeks"]) == 12
    assert health.weight_projection(80, [])["change"] == [0.0] * 12


def test_build_report_includes_goal_tips_and_diet_notes():
    report = health.build_report(
        age=30,
        weight=90,
        height=175,
        gender="male",
        activity_level="light",
        goals=["weight_loss", "better_sleep"],
        dietary_preferences=["vegan"],
    )
    assert report["bmi_category"] == "Overweight"
    assert report["daily_calories"] == report["tdee"] - 500
    assert any("Vegan" in r for r in report["recommendations"])
    assert any("wake time" in r for r in report["recommendations"])


def test_macro_targets_for_profile_defaults():
    targets = health.macro_targets_for_profile(None)
    assert targets["calories"] == 2000
    assert targets["protein"] > 0
