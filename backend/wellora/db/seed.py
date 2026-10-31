"""Reference data (food library) and optional demo data."""

from __future__ import annotations

from datetime import datetime, timedelta

from wellora.core.config import settings
from wellora.db.connection import apply_schema, get_connection

DEMO_USER_ID = "default_user"

# name, category, serving_size, serving_unit, kcal, protein, carbs, fats, fiber
STAPLE_FOODS: list[tuple] = [
    ("Chicken Breast (Grilled)", "Proteins", 100, "g", 165, 31.0, 0.0, 3.6, 0.0),
    ("Wild Atlantic Salmon", "Proteins", 100, "g", 208, 20.0, 0.0, 13.0, 0.0),
    ("Whole Eggs (Large)", "Proteins", 1, "egg", 72, 6.3, 0.4, 4.8, 0.0),
    ("Egg Whites", "Proteins", 100, "g", 52, 11.0, 0.7, 0.2, 0.0),
    ("Non-Fat Greek Yogurt", "Proteins", 150, "g", 100, 17.0, 6.0, 0.7, 0.0),
    ("Whey Protein Isolate", "Proteins", 30, "g", 120, 25.0, 2.0, 1.0, 0.5),
    ("Organic Tofu (Firm)", "Proteins", 100, "g", 83, 10.0, 2.0, 5.0, 1.0),
    ("Lentils (Cooked)", "Proteins", 100, "g", 116, 9.0, 20.0, 0.4, 7.9),
    ("Cottage Cheese (Low Fat)", "Proteins", 100, "g", 84, 11.0, 4.3, 2.3, 0.0),
    ("Paneer", "Proteins", 100, "g", 265, 18.3, 1.2, 20.8, 0.0),
    ("Chana / Chickpeas (Cooked)", "Proteins", 100, "g", 164, 8.9, 27.4, 2.6, 7.6),
    ("Rajma / Kidney Beans (Cooked)", "Proteins", 100, "g", 127, 8.7, 22.8, 0.5, 6.4),
    ("Moong Dal (Cooked)", "Proteins", 150, "g (bowl)", 158, 10.6, 28.6, 0.6, 11.4),
    ("Rolled Oats", "Carbs", 50, "g", 190, 7.0, 34.0, 3.0, 5.0),
    ("Brown Basmati Rice", "Carbs", 100, "g (cooked)", 111, 2.6, 23.0, 0.9, 1.8),
    ("White Rice (Cooked)", "Carbs", 150, "g (bowl)", 195, 4.0, 42.0, 0.4, 0.6),
    ("Whole Wheat Roti / Chapati", "Carbs", 1, "roti (40g)", 120, 3.6, 18.0, 3.7, 2.8),
    ("Idli", "Carbs", 2, "pieces", 116, 3.8, 24.0, 0.4, 1.2),
    ("Plain Dosa", "Carbs", 1, "dosa", 168, 3.9, 29.0, 3.7, 1.0),
    ("Poha", "Carbs", 150, "g (plate)", 270, 5.0, 45.0, 8.0, 2.0),
    ("Upma", "Carbs", 150, "g (plate)", 250, 6.0, 38.0, 8.0, 3.0),
    ("Sweet Potato (Baked)", "Carbs", 150, "g", 135, 3.0, 31.0, 0.2, 4.5),
    ("Quinoa (Cooked)", "Carbs", 100, "g", 120, 4.4, 21.3, 1.9, 2.8),
    ("Whole Wheat Bread", "Carbs", 1, "slice", 80, 4.0, 14.0, 1.1, 2.0),
    ("Banana", "Fruits", 1, "medium", 105, 1.3, 27.0, 0.3, 3.1),
    ("Apple", "Fruits", 1, "medium", 95, 0.5, 25.0, 0.3, 4.4),
    ("Blueberries (Fresh)", "Fruits", 100, "g", 57, 0.7, 14.5, 0.3, 2.4),
    ("Mango", "Fruits", 1, "cup (165g)", 99, 1.4, 25.0, 0.6, 2.6),
    ("Orange", "Fruits", 1, "medium", 62, 1.2, 15.4, 0.2, 3.1),
    ("Papaya", "Fruits", 1, "cup (145g)", 62, 0.7, 15.7, 0.4, 2.5),
    ("Avocado (Hass)", "Healthy Fats", 100, "g", 160, 2.0, 8.5, 14.7, 6.7),
    ("Raw Almonds", "Healthy Fats", 30, "g", 170, 6.0, 6.0, 15.0, 3.5),
    ("Walnuts", "Healthy Fats", 30, "g", 196, 4.5, 4.0, 20.0, 2.0),
    ("Peanut Butter", "Healthy Fats", 32, "g (2 tbsp)", 190, 7.0, 7.0, 16.0, 2.0),
    ("Extra Virgin Olive Oil", "Healthy Fats", 15, "ml (tbsp)", 124, 0.0, 0.0, 14.0, 0.0),
    ("Ghee", "Healthy Fats", 5, "g (tsp)", 45, 0.0, 0.0, 5.0, 0.0),
    ("Chia Seeds", "Healthy Fats", 15, "g (tbsp)", 73, 2.5, 6.3, 4.6, 5.1),
    ("Baby Spinach", "Vegetables", 100, "g", 23, 2.9, 3.6, 0.4, 2.2),
    ("Steamed Broccoli", "Vegetables", 100, "g", 35, 2.4, 7.2, 0.4, 3.3),
    ("Mixed Greens Salad", "Vegetables", 100, "g", 17, 1.5, 3.3, 0.2, 1.9),
    ("Mixed Vegetable Sabzi", "Vegetables", 150, "g (bowl)", 150, 4.0, 15.0, 8.0, 5.0),
    ("Curd / Plain Yogurt", "Dairy", 100, "g", 61, 3.5, 4.7, 3.3, 0.0),
    ("Milk (Toned)", "Dairy", 250, "ml (glass)", 145, 8.0, 12.0, 7.5, 0.0),
    ("Masala Chai (with sugar)", "Beverages", 150, "ml (cup)", 90, 2.5, 13.0, 3.0, 0.0),
    ("Black Coffee", "Beverages", 240, "ml (cup)", 2, 0.3, 0.0, 0.0, 0.0),
]

DEFAULT_HABITS: list[tuple[str, str, str]] = [
    ("☀️ Morning Sunlight (10-15m)", "recovery", "sunny-outline"),
    ("💧 Hydration Target (2.5L+)", "nutrition", "water-outline"),
    ("🏃 8,000+ Daily Steps", "fitness", "walk-outline"),
    ("🧘 5-10m Deep Breathing / Meditation", "mindfulness", "leaf-outline"),
    ("🥗 30g+ Fiber / Nutrient Dense Foods", "nutrition", "restaurant-outline"),
    ("📵 Digital Sunset (1hr Pre-Bed)", "recovery", "moon-outline"),
]


def seed_foods() -> None:
    with get_connection() as conn:
        conn.executemany(
            """
            INSERT OR IGNORE INTO foods_library
            (name, category, serving_size, serving_unit, calories, protein_g, carbs_g, fats_g, fiber_g)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            STAPLE_FOODS,
        )


def seed_demo_activity() -> None:
    with get_connection() as conn:
        if conn.execute("SELECT COUNT(*) FROM activity_logs").fetchone()[0]:
            return
        now = datetime.now()
        rows = [
            ("workout", "Jogging", 30, 2),
            ("meal", "Grilled Chicken & Quinoa", 550, 2),
            ("water", "Mineral Water", 1.5, 2),
            ("workout", "Yoga Flow", 45, 1),
            ("meal", "Oatmeal with Berries", 400, 1),
            ("water", "Hydration Bottle", 2.0, 1),
            ("workout", "Gym Resistance Training", 60, 0),
            ("meal", "Avocado & Egg Toast", 450, 0),
            ("water", "Fresh Water", 1.25, 0),
        ]
        conn.executemany(
            "INSERT INTO activity_logs (user_id, activity_type, details, value, timestamp) VALUES (?, ?, ?, ?, ?)",
            [
                (DEMO_USER_ID, kind, details, value, (now - timedelta(days=ago)).isoformat())
                for kind, details, value, ago in rows
            ],
        )


def init_db() -> None:
    """Create tables, load reference data and (optionally) demo data."""
    apply_schema()
    seed_foods()
    if settings.seed_demo_data:
        seed_demo_activity()
