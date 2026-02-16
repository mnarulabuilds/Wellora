from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json
from nlp_utils import SimpleNLP
from health_model import HealthRecommender

app = FastAPI(title="Wellora Backend", description="Health Assistant API with NLP & ML")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

nlp = SimpleNLP()
recommender = HealthRecommender()

# Data Models
class UserQuery(BaseModel):
    text: str
    user_id: Optional[str] = None

class HealthReportRequest(BaseModel):
    age: int
    weight: float
    height: float
    activity_level: str
    dietary_preferences: List[str]
    health_goals: List[str]

@app.get("/")
def read_root():
    return {"message": "Welcome to Wellora Health Assistant API"}

@app.post("/analyze_query")
async def analyze_query(query: UserQuery):
    intent = nlp.detect_intent(query.text)
    entities = nlp.extract_entities(query.text)
    
    # Base response dictionary
    responses = {
        "dietary_advice": [
            "A balanced diet is key. Try focusing on lean proteins and complex carbohydrates.",
            "For optimal health, try to fill half your plate with vegetables at every meal.",
            "Hydration is often confused with hunger. Make sure you're drinking enough water alongside your meals.",
            "If you're looking to improve your diet, cutting back on processed sugars is a great first step."
        ],
        "fitness_advice": [
            "Consistency is more important than intensity. Find an activity you enjoy and stick with it.",
            "Regular exercise, especially a mix of cardio and strength training, can significantly boost your energy.",
            "Don't forget to warm up! It's essential for preventing injuries and preparing your body for a workout.",
            "Ideally, aim for 150 minutes of moderate activity per week."
        ],
        "sleep_advice": [
            "Quality sleep starts with a consistent routine. Try to go to bed and wake up at the same time every day.",
            "Avoid screens at least an hour before bed, as blue light can interfere with your sleep cycle.",
            "Make sure your sleeping environment is cool, dark, and quiet for the best rest.",
            "If you're feeling tired during the day, a short 20-minute power nap can help recharge you."
        ],
        "mental_health": [
            "Taking time for yourself is not selfish, it's necessary. Try a 5-minute deep breathing exercise.",
            "Mindfulness can help reduce stress. Even just focusing on your senses for a few minutes can make a difference.",
            "If you're feeling overwhelmed, try breaking your tasks into smaller, more manageable steps.",
            "Don't underestimate the power of a short walk outside to clear your mind."
        ],
        "hydration_advice": [
            "Aim for about 8 glasses of water a day, but listen to your body's thirst signals.",
            "Eating fruits and vegetables with high water content, like cucumber or watermelon, also helps with hydration.",
            "If you find plain water boring, try infusing it with lemon, cucumber, or mint.",
            "Being well-hydrated improves skin health and cognitive function."
        ],
        "weight_advice": [
            "Focus on how you feel and your energy levels rather than just the number on the scale.",
            "Sustainable weight management comes from small, consistent changes in both diet and activity.",
            "Muscle is denser than fat, so don't be discouraged if your weight doesn't drop quickly as you get fit.",
            "A healthy rate of weight loss is typically 0.5 to 1 kg per week."
        ],
        "general_health": [
            "I'm here to help you on your health journey. Feel free to ask about diet, sleep, or exercise!",
            "Small daily habits lead to big long-term results. What's one healthy choice you can make today?",
            "Health is a holistic journey involving mind, body, and spirit.",
            "Listening to your body is the most important skill you can develop for your health."
        ]
    }

    # Select a base response
    import random
    base_response = random.choice(responses.get(intent, responses["general_health"]))
    
    # Personalize based on entities
    personalized_note = ""
    for ent in entities:
        label = ent.get("label")
        text = ent.get("text")
        if label == "NUTRIENT":
            personalized_note += f"\n\nSpeaking of {text}, it's a vital part of a healthy lifestyle!"
        elif label == "ACTIVITY":
            personalized_note += f"\n\n{text.capitalize()} is a fantastic way to stay active!"
        elif label == "CARDINAL":
            if intent == "dietary_advice":
                personalized_note += f"\n\nTracking {text} can be useful for reaching your specific dietary goals."
            elif intent == "fitness_advice":
                personalized_note += f"\n\n{text} minutes of exercise is a great target to aim for!"

    # Personalize based on User History/State
    user_context = ""
    if query.user_id:
        user_logs = [log for log in activity_logs if log.get("user_id") == query.user_id]
        if user_logs:
            last_activity = user_logs[-1]
            if intent == "fitness_advice" and last_activity["activity_type"] == "workout":
                user_context = f"\n\nI see you recently did a {last_activity['details']} workout. Keep up that momentum!"
            elif intent == "dietary_advice" and last_activity["activity_type"] == "meal":
                user_context = f"\n\nI noticed your last logged meal was {last_activity['details']}. Great job tracking your intake!"

    final_response = base_response + personalized_note + user_context
    
    return {
        "intent": intent,
        "entities": entities,
        "response": final_response
    }

@app.post("/generate_report")
async def generate_report(data: HealthReportRequest):
    bmi_category = recommender.calculate_bmi(data.weight, data.height)
    tdee = recommender.estimate_tdee(data.weight, data.height, data.age, data.activity_level)
    recommendations = recommender.generate_recommendations(bmi_category, tdee, data.health_goals)
    charts_data = recommender.generate_chart_data(tdee)
    
    # Add dietary restrictions to recommendations
    if "vegan" in data.dietary_preferences:
         recommendations.append("Ensure adequate B12 and Iron intake through fortified foods or supplements.")
         
    return {
        "bmi": round(data.weight / ((data.height / 100) ** 2), 2),
        "bmi_category": bmi_category,
        "daily_calories": round(tdee),
        "recommendations": recommendations,
        "charts": charts_data
    }

class ActivityLog(BaseModel):
    user_id: Optional[str] = "default_user"
    activity_type: str # 'meal' or 'workout'
    details: str
    value: float # calories or duration (minutes)

# In-memory storage for activity logs (in production, use a database)
activity_logs = []

@app.post("/log_activity")
async def log_activity(log: ActivityLog):
    # Store the activity log
    activity_logs.append({
        "user_id": log.user_id,
        "activity_type": log.activity_type,
        "details": log.details,
        "value": log.value,
        "timestamp": "now"  # In production, use actual timestamp
    })
    
    unit = "kcal" if log.activity_type == 'meal' else "minutes"
    message = f"Successfully logged {log.activity_type}: {log.details} ({log.value} {unit})"
    
    # Simple logic to return instant feedback
    if log.activity_type == 'meal' and log.value > 800:
        message += ". That's a hearty meal!"
    elif log.activity_type == 'workout' and log.value > 30:
        message += ". Great job hitting that workout!"
        
    return {"status": "success", "message": message}

class HealthScoreRequest(BaseModel):
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    user_id: Optional[str] = "default_user"

@app.post("/calculate_health_score")
async def calculate_health_score(data: HealthScoreRequest):
    """
    Calculate a dynamic health score (0-100) based on:
    - Profile completeness (20 points)
    - BMI category (30 points)
    - Activity engagement (30 points)
    - Consistency (20 points)
    """
    score = 0
    feedback = []
    
    # 1. Profile Completeness (20 points)
    profile_score = 0
    if data.age:
        profile_score += 7
    if data.weight:
        profile_score += 7
    if data.height:
        profile_score += 6
    
    score += profile_score
    if profile_score < 20:
        feedback.append("Complete your profile to improve your score!")
    
    # 2. BMI Score (30 points)
    bmi_score = 0
    bmi_label = "Unknown"
    if data.weight and data.height:
        bmi = data.weight / ((data.height / 100) ** 2)
        bmi_category = recommender.calculate_bmi(data.weight, data.height)
        
        if bmi_category == "Normal":
            bmi_score = 30
            bmi_label = "Excellent"
        elif bmi_category in ["Underweight", "Overweight"]:
            bmi_score = 20
            bmi_label = "Good"
            feedback.append(f"Your BMI is {bmi_category}. Consider consulting a nutritionist.")
        else:  # Obese
            bmi_score = 10
            bmi_label = "Needs Attention"
            feedback.append("Focus on balanced nutrition and regular exercise.")
    else:
        feedback.append("Add your weight and height to track BMI.")
    
    score += bmi_score
    
    # 3. Activity Engagement (30 points)
    user_activities = [log for log in activity_logs if log.get("user_id") == data.user_id]
    activity_score = min(len(user_activities) * 5, 30)  # 5 points per activity, max 30
    score += activity_score
    
    if activity_score < 15:
        feedback.append("Log more meals and workouts to boost your score!")
    
    # 4. Consistency Bonus (20 points)
    # For now, give partial points based on activity count
    consistency_score = min(len(user_activities) * 3, 20)
    score += consistency_score
    
    # Determine overall label
    if score >= 80:
        label = "Excellent"
        color = "#4CAF50"
    elif score >= 60:
        label = "Good"
        color = "#FFC107"
    elif score >= 40:
        label = "Fair"
        color = "#FF9800"
    else:
        label = "Needs Improvement"
        color = "#F44336"
    
    return {
        "score": min(score, 100),
        "label": label,
        "color": color,
        "feedback": feedback,
        "breakdown": {
            "profile": profile_score,
            "bmi": bmi_score,
            "activity": activity_score,
            "consistency": consistency_score
        }
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
