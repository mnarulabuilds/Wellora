from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import json
from datetime import datetime, timedelta
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
            "A balanced diet is key. Try focusing on lean proteins like lentils or chicken, and complex carbohydrates like quinoa or sweet potatoes.",
            "For optimal health, try to fill half your plate with colorful vegetables at every meal. It ensures a wide range of micronutrients.",
            "Hydration is often confused with hunger. Make sure you're drinking enough water alongside your meals to support digestion.",
            "If you're looking to improve your diet, cutting back on processed sugars and focusing on whole fruits is a great first step.",
            "Incorporate healthy fats like avocado, nuts, and olive oil for better brain health and hormone regulation."
        ],
        "fitness_advice": [
            "Consistency is more important than intensity. Find an activity you enjoy—be it swimming, dancing, or lifting—and stick with it.",
            "Regular exercise, especially a mix of cardio and resistance training, can significantly boost your metabolic rate.",
            "Don't forget to warm up! Dynamic stretching is essential for preventing injuries and preparing your body for a workout.",
            "Ideally, aim for 150 minutes of moderate activity per week. Even three 10-minute walks a day can make a massive difference.",
            "Try 'Zone 2' training (moderate intensity where you can still talk) to build a strong cardiovascular foundation."
        ],
        "sleep_advice": [
            "Quality sleep starts with a consistent routine. Try to go to bed and wake up at the same time every day, even on weekends.",
            "Avoid screens at least an hour before bed, as blue light can interfere with melatonin production.",
            "Make sure your sleeping environment is cool (around 18°C), dark, and quiet for the deepest restorative rest.",
            "If you're feeling tired during the day, a short 20-minute power nap before 3 PM can help recharge you without affecting night sleep.",
            "Magnesium-rich foods or a warm bath before bed can help relax your muscles and prepare your body for sleep."
        ],
        "mental_health": [
            "Taking time for yourself is not selfish, it's necessary. Try a 5-minute boxed breathing exercise (4-4-4-4) to calm your nervous system.",
            "Mindfulness can help reduce stress. Even just focusing on your senses for a few minutes can lower cortisol levels.",
            "If you're feeling overwhelmed, try 'brain dumping'—writing down every single thing on your mind for 5 minutes.",
            "Don't underestimate the power of 'green time'—a short walk in nature has been shown to reduce rumination and anxiety.",
            "Connect with a friend or loved one. Social connection is one of the strongest predictors of mental well-being."
        ],
        "hydration_advice": [
            "Aim for about 2-3 liters of water a day, but listen to your body's thirst signals and adjust for activity level.",
            "Eating fruits and vegetables with high water content, like cucumber, celery, or watermelon, is a delicious way to stay hydrated.",
            "If you find plain water boring, try infusing it with lemon, ginger, or mint for added antioxidants.",
            "Being well-hydrated improves skin elasticity, cognitive function, and helps your kidneys flush out toxins."
        ],
        "weight_advice": [
            "Focus on non-scale victories like increased energy, better-fitting clothes, and improved strength rather than just the number on the scale.",
            "Sustainable weight management comes from small, consistent changes. Focus on adding protein and fiber to every meal.",
            "Muscle is denser than fat. If you're lifting weights, your weight might stay the same while your body composition improves.",
            "A healthy and sustainable rate of weight loss is typically 0.5 to 1% of your body weight per week."
        ],
        "spiritual_health": [
            "Connecting with your inner self through daily gratitude can shift your perspective from lack to abundance.",
            "Spiritual wellness is about finding meaning. Take 10 minutes today to reflect on what truly matters to you.",
            "Yoga is a beautiful bridge between the physical and spiritual. Even 15 minutes of Sun Salutations can ground your energy.",
            "Deep, conscious breathing helps align your mind and body. Try inhaling peace and exhaling tension.",
            "Spend time in silence. In the quiet, you can often find the answers you've been looking for."
        ],
        "general_health": [
            "I'm here to support your holistic journey. Feel free to ask about nutrition, fitness, sleep, or spiritual wellness!",
            "Small daily habits lead to big long-term results. What's one small, healthy choice you can make in the next hour?",
            "Health is a holistic journey involving mind, body, and spirit. Treat yourself with kindness today.",
            "Listening to your body's signals is the most important skill you can develop for long-term health and fitness."
        ],
        "pain_points": [
            "If you're dealing with physical pain, remember to rest and consult a professional if it persists. Gentle yoga or stretching might help with minor back or neck tension.",
            "Low energy often stems from a combination of dehydration, poor sleep, or lack of movement. Try a 10-minute walk and a glass of water.",
            "Feeling stressed or anxious? Box breathing and 'grounding' (noticing 5 things you can see, 4 you can touch...) are powerful tools for instant relief.",
            "For headaches, ensure you're not straining your eyes at a screen. A dark room and hydration are often the first steps to recovery.",
            "If you're feeling bloated, try ginger tea or a light walk after your meal to aid digestion."
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
        low_text = text.lower()
        if label == "NUTRIENT":
            personalized_note += f"\n\nFocusing on {text} is a great choice! It's essential for your body's recovery and energy levels."
        elif label == "ACTIVITY":
            personalized_note += f"\n\n{text.capitalize()} is a fantastic way to boost your mood and cardiovascular health!"
        elif label == "PAIN_TYPE":
            personalized_note += f"\n\nI'm sorry to hear about your {text}. Please take it slow and don't push through sharp pain."
        elif label == "CARDINAL":
            if intent == "dietary_advice":
                personalized_note += f"\n\nTracking {text} units of your intake can help you stay on target with your goals."
            elif intent == "fitness_advice":
                personalized_note += f"\n\nAiming for {text} minutes is a solid plan. Consistency over intensity is the secret!"

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
activity_logs = [
    {"user_id": "default_user", "activity_type": "workout", "details": "Jogging", "value": 30, "timestamp": datetime.now() - timedelta(days=2)},
    {"user_id": "default_user", "activity_type": "workout", "details": "Yoga", "value": 45, "timestamp": datetime.now() - timedelta(days=1)},
    {"user_id": "default_user", "activity_type": "workout", "details": "Gym", "value": 60, "timestamp": datetime.now()},
]

@app.post("/log_activity")
async def log_activity(log: ActivityLog):
    # Store the activity log
    activity_logs.append({
        "user_id": log.user_id,
        "activity_type": log.activity_type,
        "details": log.details,
        "value": log.value,
        "timestamp": datetime.now()  # Store actual timestamp
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

@app.get("/activity_history")
async def get_activity_history(user_id: str = "default_user"):
    # Initialize 7 days with 0
    now = datetime.now()
    # Find the Monday of the current week
    monday = now - timedelta(days=now.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    
    daily_values = [0] * 7
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    for log in activity_logs:
        if log.get("user_id") == user_id and log.get("activity_type") == "workout":
            log_time = log.get("timestamp")
            if isinstance(log_time, datetime):
                # Check if it's within the current week
                if log_time >= monday:
                    day_idx = log_time.weekday()
                    daily_values[day_idx] += log.get("value", 0)
    
    return {
        "labels": labels,
        "data": daily_values
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
