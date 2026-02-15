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
    
    response = {
        "intent": intent,
        "entities": entities,
        "response": f"I understand you are asking about: {intent.replace('_', ' ')}. Let me check my health database."
    }
    
    if intent == "dietary_advice":
        response["response"] = "For a balanced diet, incorporate more whole foods, lean proteins, and plenty of vegetables."
    elif intent == "fitness_advice":
        response["response"] = "Regular exercise (150 mins moderate activity/week) is key. Start with walking or light jogging."
    elif intent == "sleep_advice":
        response["response"] = "Quality sleep is crucial. Try to maintain a consistent sleep schedule and avoid screens before bed."
        
    return response

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
