"""Curated, evidence-informed response bank for the rule-based coach."""

RESPONSES: dict[str, list[str]] = {
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

RESPONSES["medication"] = [
    "Taking medicines at the same time every day builds a routine — set reminders in the Medications tracker so you never miss a dose.",
    "If you miss a dose, check the leaflet or ask your pharmacist; never double up unless your doctor tells you to.",
    "Keep an up-to-date list of everything you take (including supplements) to share with your doctor at each visit.",
]
RESPONSES["vitals"] = [
    "Measure blood pressure seated, after 5 minutes of rest, with your arm supported at heart level — and log two readings a minute apart.",
    "A healthy resting heart rate for adults is usually 60-100 bpm; regular aerobic exercise tends to lower it over time.",
    "Track fasting glucose first thing in the morning before eating; a reading under 100 mg/dL is generally considered normal.",
]
