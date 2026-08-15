import logging
import os
import random
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import db
from health_model import HealthRecommender
from models import (
    ActivityLog,
    ActivityLogUpdate,
    HealthReportRequest,
    HealthScoreRequest,
    UserProfile,
    UserQuery,
)
from nlp_utils import SimpleNLP

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("wellora")

raw_origins = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]

nlp = SimpleNLP()
recommender = HealthRecommender()

recent_responses: Dict[str, List[str]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    db.init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down Wellora backend.")


app = FastAPI(
    title="Wellora Backend",
    description="Production-grade AI Health Assistant API with NLP & Health ML calculations",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err["loc"] if l != "body")
        errors.append(f"{loc}: {err['msg']}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"status": "error", "message": "Validation error", "detail": errors},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "message": exc.detail},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled Exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "error", "message": "Internal server error occurred. Please try again."},
    )


def _select_response(intent: str, responses: Dict[str, List[str]]) -> str:
    pool = responses.get(intent, responses.get("general_health", ["Here to help you stay healthy!"]))
    used = recent_responses.get(intent, [])
    available = [r for r in pool if r not in used[-3:]] or pool
    choice = random.choice(available)
    recent_responses.setdefault(intent, []).append(choice)
    recent_responses[intent] = recent_responses[intent][-5:]
    return choice


@app.get("/")
def read_root():
    return {
        "message": "Welcome to Wellora Health Assistant API",
        "version": "2.0.0",
        "status": "ok",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected",
    }


@app.post("/users/profile")
async def save_profile(profile: UserProfile):
    try:
        saved = db.upsert_profile(profile.model_dump())
        return {"status": "success", "profile": saved}
    except Exception as exc:
        logger.error("Failed to save profile: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save profile.") from exc


@app.get("/users/profile")
async def get_user_profile(user_id: str = Query(..., min_length=1)):
    profile = db.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.get("/users/stats")
async def get_user_stats(user_id: str = Query(..., min_length=1)):
    profile = db.get_profile(user_id)
    daily = db.get_daily_summary(user_id)
    weekly = db.get_weekly_history(user_id)
    streak = db.calculate_streak(user_id)
    total_logs = db.get_user_activity_count(user_id)

    return {
        "profile": profile,
        "daily": daily,
        "weekly": weekly,
        "streak": streak,
        "total_activities_logged": total_logs,
    }


@app.post("/analyze_query")
async def analyze_query(query: UserQuery):
    try:
        intent = nlp.detect_intent(query.text)
        entities = nlp.extract_entities(query.text)

        responses = {
            "dietary_advice": [
                "A balanced plate combines high-quality lean protein, complex carbohydrates, and fiber-rich vegetables to maintain stable blood glucose and sustained energy.",
                "For sustained energy and optimal recovery, prioritize whole, unprocessed foods and keep refined sugars to a minimum.",
                "Thirst is frequently misinterpreted as hunger. Drinking a glass of water before meals supports healthy digestion and portion awareness.",
                "Incorporate nutrient-dense fats like extra virgin olive oil, avocados, chia seeds, and walnuts to support cellular membrane integrity and brain function.",
                "Distributing your daily protein evenly across 3-4 meals maximizes muscle protein synthesis and keeps you satiated.",
            ],
            "fitness_advice": [
                "Consistency and progressive adaptation consistently outperform sporadic intensity. Find activities you enjoy and build sustainable movement habits.",
                "Combining resistance training (for bone density and metabolic rate) with Zone 2 aerobic base building delivers comprehensive cardiovascular longevity.",
                "Always dedicate 5-8 minutes to dynamic mobility before high-intensity workouts and gentle static stretches during post-workout cool downs.",
                "Aim for at least 150 minutes of moderate aerobic activity or 75 minutes of vigorous exercise each week, supplemented by 2 full-body resistance sessions.",
                "Listen closely to joint and tendon sensations — rest and active recovery days are where strength and tissue adaptation truly happen.",
            ],
            "sleep_advice": [
                "Circadian alignment starts with consistent wake times and getting natural sunlight in your eyes within 30 minutes of waking.",
                "Establish a digital sunset: turn off blue-light emitting screens 60 minutes before bed to allow natural melatonin synthesis.",
                "Optimize your sleep environment by keeping the bedroom dark, quiet, and cool (around 18-20°C / 65-68°F).",
                "A 20-minute power nap before 2 PM can restore alertness without disrupting nocturnal sleep pressure.",
                "Consider evening relaxation rituals such as a warm magnesium bath, light fiction reading, or gentle diaphragmatic breathing.",
            ],
            "mental_health": [
                "Box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) directly stimulates the parasympathetic nervous system to down-regulate acute stress.",
                "Mindful presence — taking 3 deep breaths while noting 3 things you can see and hear — rapidly lowers elevated cortisol.",
                "A 15-minute walk outdoors, especially amidst green or blue spaces, has clinically proven benefits for reducing anxiety and mental fatigue.",
                "Writing a quick 'brain dump' of thoughts before starting your day helps declutter cognitive load and sharpens focus.",
                "Never hesitate to reach out to loved ones or a mental health professional when stress feels overwhelming.",
            ],
            "hydration_advice": [
                "Aim for 2.5 to 3.5 liters of total fluid daily, increasing intake alongside physical exertion or warmer ambient temperatures.",
                "Infusing water with fresh lemon, cucumber slices, or mint makes reaching daily hydration goals refreshing and effortless.",
                "Monitor urine color as an intuitive hydration gauge: a pale straw color indicates optimal cellular hydration.",
                "Replenishing key electrolytes (sodium, potassium, magnesium) is crucial when engaging in intense sweating or following low-carb diets.",
            ],
            "weight_advice": [
                "Focus on body composition, strength milestones, and daily vitality rather than fixating solely on scale fluctuations.",
                "A gradual deficit of 300-500 kcal/day preserves lean muscle tissue while promoting sustainable, long-term adipose fat loss.",
                "Prioritize dietary protein (1.6 - 2.0g/kg) during caloric deficits to preserve metabolically active muscle tissue.",
                "Consistency over weeks and months beats aggressive, short-lived crash diets every single time.",
            ],
            "spiritual_health": [
                "Daily gratitude journaling rewires cognitive attention toward abundance, calm, and grounded purpose.",
                "Spending 15-20 minutes in nature connects us to natural rhythms and quiets internal mental chatter.",
                "Gentle yoga and conscious breathwork cultivate harmony between physiological sensations and emotional awareness.",
                "Reflect periodically on core values and align daily micro-actions with what genuinely brings you meaning.",
            ],
            "pain_points": [
                "If experiencing acute or sharp pain, rest immediately and consult a healthcare professional. Gentle range-of-motion work helps minor stiffness.",
                "Persistent tension or headaches often relate to eye strain, postural fatigue, or subtle dehydration.",
                "Alternating gentle movement with proper rest and adequate sleep is crucial for reducing inflammation and accelerating tissue repair.",
                "For localized muscle soreness (DOMS), light walking, foam rolling, and adequate hydration accelerate metabolic waste clearance.",
            ],
            "habit_and_streak": [
                "Habit loops thrive on small, friction-free actions done consistently. Every logged activity reinforces your healthy identity.",
                "Streaks represent your dedication to long-term wellness. Celebrate every consecutive day you prioritize your health!",
                "Even on busy days, logging a simple glass of water or 10-minute walk keeps your momentum alive.",
            ],
            "general_health": [
                "I am your holistic wellness companion — ask me anything about nutrition, workouts, sleep, stress, or healthy daily habits!",
                "Small, repeatable micro-habits consistently create extraordinary long-term transformations in health and vitality.",
                "True health honors the interconnectedness of mind, body, and spirit — take a moment today to breathe and appreciate your body.",
            ],
        }

        base_response = _select_response(intent, responses)

        personalized_notes = []
        for ent in entities:
            label = ent.get("label")
            text = ent.get("text", "")
            if label == "NUTRIENT":
                personalized_notes.append(f"Focusing on {text} is a smart choice for tissue recovery and metabolic function.")
            elif label == "ACTIVITY":
                personalized_notes.append(f"{text.capitalize()} is an excellent stimulus for cardiovascular stamina and mental clarity!")
            elif label == "PAIN_TYPE":
                personalized_notes.append(f"Regarding your {text}: take it easy, listen to your body, and do not push through sharp pain.")
            elif label == "MEASUREMENT":
                personalized_notes.append(f"Tracking {text} gives you measurable data to refine your progress.")

        user_context_parts = []
        if query.user_id:
            profile = db.get_profile(query.user_id)
            if profile:
                if profile.get("weight") and profile.get("height"):
                    bmi_cat = recommender.calculate_bmi(profile["weight"], profile["height"])
                    user_context_parts.append(f"Based on your profile, your BMI is categorized as {bmi_cat}.")

                goals = profile.get("health_goals", [])
                if goals:
                    readable_goals = ", ".join(g.replace("_", " ") for g in goals)
                    user_context_parts.append(f"Your focus goals: {readable_goals}.")

            summary = db.get_daily_summary(query.user_id)
            logged_items = []
            if summary["calories_logged"] > 0:
                logged_items.append(f"{int(summary['calories_logged'])} kcal")
            if summary["workout_minutes"] > 0:
                logged_items.append(f"{int(summary['workout_minutes'])} min exercise")
            if summary["water_liters"] > 0:
                logged_items.append(f"{summary['water_liters']}L water")

            if logged_items:
                user_context_parts.append(f"Today you've logged: {', '.join(logged_items)}.")

            streak_info = db.calculate_streak(query.user_id)
            if streak_info["current_streak"] >= 2:
                user_context_parts.append(f"You're currently on a {streak_info['current_streak']}-day activity streak! 🔥")

        final_sections = [base_response]
        if personalized_notes:
            final_sections.append(" ".join(personalized_notes))
        if user_context_parts:
            final_sections.append(" ".join(user_context_parts))

        final_response = "\n\n".join(final_sections)

        return {
            "status": "success",
            "intent": intent,
            "entities": entities,
            "response": final_response,
        }
    except Exception as exc:
        logger.error("Error analyzing query: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to process query.") from exc


@app.post("/generate_report")
async def generate_report(data: HealthReportRequest):
    try:
        bmi = recommender.calculate_bmi_value(data.weight, data.height)
        bmi_category = recommender.calculate_bmi(data.weight, data.height)
        tdee = recommender.estimate_tdee(
            data.weight, data.height, data.age, data.activity_level.value, data.gender.value
        )
        adjusted_calories = recommender.adjust_calories_for_goals(
            tdee, data.health_goals, data.gender.value
        )
        recommendations = recommender.generate_recommendations(
            bmi_category, tdee, data.health_goals
        )
        dietary_notes = recommender.get_dietary_notes(data.dietary_preferences)
        recommendations.extend(dietary_notes)

        charts_data = recommender.generate_chart_data(
            tdee, data.weight, data.health_goals, data.dietary_preferences
        )

        return {
            "status": "success",
            "bmi": bmi,
            "bmi_category": bmi_category,
            "daily_calories": round(adjusted_calories),
            "tdee": round(tdee),
            "recommendations": recommendations,
            "charts": charts_data,
        }
    except Exception as exc:
        logger.error("Error generating health report: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate report.") from exc


@app.post("/log_activity")
async def log_activity(log: ActivityLog):
    try:
        saved = db.insert_activity_log(log.model_dump())
        type_val = log.activity_type.value
        unit = "kcal" if type_val == "meal" else "L" if type_val == "water" else "min"
        message = f"Logged {type_val}: {log.details} ({log.value} {unit})"

        if type_val == "meal" and log.value > 800:
            message += " (Hearty meal!)"
        elif type_val == "workout" and log.value >= 45:
            message += " (Great workout session!)"
        elif type_val == "water" and log.value >= 1.0:
            message += " (Awesome hydration!)"

        return {"status": "success", "message": message, "log": saved}
    except Exception as exc:
        logger.error("Error logging activity: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.put("/activity_logs/{log_id}")
async def update_log(
    log_id: int,
    updates: ActivityLogUpdate,
    user_id: str = Query(..., min_length=1),
):
    updated = db.update_activity_log(
        log_id, user_id, updates.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Activity log not found.")
    return {"status": "success", "message": "Activity updated successfully", "log": updated}


@app.delete("/activity_logs/{log_id}")
async def delete_log(log_id: int, user_id: str = Query(..., min_length=1)):
    if not db.delete_activity_log(log_id, user_id):
        raise HTTPException(status_code=404, detail="Activity log not found.")
    return {"status": "success", "message": "Activity deleted successfully"}


@app.get("/activity_logs")
async def list_activity_logs(
    user_id: str = Query(..., min_length=1),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    activity_type: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    logs = db.get_activity_logs(user_id, from_date, to_date, activity_type, limit, offset)
    return {"status": "success", "logs": logs, "count": len(logs)}


@app.get("/daily_summary")
async def daily_summary(
    user_id: str = Query(..., min_length=1),
    date: Optional[str] = None,
):
    return db.get_daily_summary(user_id, date)


@app.post("/calculate_health_score")
async def calculate_health_score(data: HealthScoreRequest):
    try:
        user_id = data.user_id or "default_user"
        score = 0
        feedback = []

        # 1. Profile Completeness (max 20)
        profile_score = 0
        if data.age:
            profile_score += 7
        if data.weight:
            profile_score += 7
        if data.height:
            profile_score += 6
        score += profile_score
        if profile_score < 20:
            feedback.append("Complete your profile for more tailored recommendations.")

        # 2. BMI Balance (max 30)
        bmi_score = 0
        if data.weight and data.height and data.height > 0:
            bmi_category = recommender.calculate_bmi(data.weight, data.height)
            if bmi_category == "Normal":
                bmi_score = 30
                feedback.append("Your BMI is in the healthy range! Keep up the great lifestyle.")
            elif bmi_category in ["Underweight", "Overweight"]:
                bmi_score = 20
                feedback.append(f"Your BMI is {bmi_category}. Focus on consistent nutrition and exercise.")
            else:
                bmi_score = 10
                feedback.append("Gradual changes to nutrition and daily movement will boost your health.")
        else:
            feedback.append("Add your height and weight to track BMI health metrics.")
        score += bmi_score

        # 3. Activity Logging (max 30)
        activity_count = db.get_user_activity_count(user_id)
        activity_score = min(activity_count * 5, 30)
        score += activity_score
        if activity_score < 15:
            feedback.append("Log meals, hydration, and workouts daily to boost your score.")

        # 4. Consistency & Streak (max 20)
        streak_info = db.calculate_streak(user_id)
        consistency_score = min(streak_info["current_streak"] * 5, 20)
        score += consistency_score
        if streak_info["current_streak"] >= 3:
            feedback.append(f"Fantastic {streak_info['current_streak']}-day streak! Consistency builds results.")
        elif consistency_score < 10:
            feedback.append("Build momentum by logging at least one activity every day.")

        final_score = min(score, 100)
        if final_score >= 80:
            label, color = "Excellent", "#4CAF50"
        elif final_score >= 60:
            label, color = "Good", "#4facfe"
        elif final_score >= 40:
            label, color = "Fair", "#FFC107"
        else:
            label, color = "Needs Improvement", "#FF6B6B"

        return {
            "status": "success",
            "score": final_score,
            "label": label,
            "color": color,
            "feedback": feedback,
            "breakdown": {
                "profile": profile_score,
                "bmi": bmi_score,
                "activity": activity_score,
                "consistency": consistency_score,
            },
            "streak": streak_info,
        }
    except Exception as exc:
        logger.error("Error calculating health score: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to calculate health score.") from exc


@app.get("/activity_history")
async def get_activity_history(user_id: str = Query(default="default_user", min_length=1)):
    return db.get_weekly_history(user_id)


@app.get("/streaks")
async def get_streaks(user_id: str = Query(..., min_length=1)):
    return db.calculate_streak(user_id)


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
