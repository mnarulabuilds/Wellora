import unittest
from fastapi.testclient import TestClient
from app import app
import db

client = TestClient(app)


class WelloraBackendTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.init_db()

    def test_root_and_health(self):
        res = client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")

        res_health = client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json()["status"], "healthy")

    def test_profile_upsert_and_get(self):
        user_id = "test_user_unit_1"
        profile_data = {
            "user_id": user_id,
            "name": "Alex Smith",
            "age": 28,
            "weight": 72.5,
            "height": 178.0,
            "gender": "male",
            "activity_level": "moderate",
            "dietary_preferences": ["vegetarian"],
            "health_goals": ["muscle_gain", "better_sleep"],
            "target_calories": 2400,
            "target_steps": 12000,
            "target_water": 3.0,
            "target_workout_minutes": 45,
        }

        res = client.post("/users/profile", json=profile_data)
        self.assertEqual(res.status_code, 200)
        resp_json = res.json()
        self.assertEqual(resp_json["status"], "success")
        self.assertEqual(resp_json["profile"]["name"], "Alex Smith")

        # Fetch profile
        get_res = client.get(f"/users/profile?user_id={user_id}")
        self.assertEqual(get_res.status_code, 200)
        retrieved = get_res.json()
        self.assertEqual(retrieved["name"], "Alex Smith")
        self.assertEqual(retrieved["age"], 28)
        self.assertIn("vegetarian", retrieved["dietary_preferences"])

    def test_profile_validation_failures(self):
        # Invalid age
        res = client.post("/users/profile", json={
            "user_id": "bad_user",
            "name": "Bad",
            "age": 5,  # age < 10
            "weight": 70,
            "height": 170,
        })
        self.assertEqual(res.status_code, 422)

        # Negative weight
        res2 = client.post("/users/profile", json={
            "user_id": "bad_user_2",
            "name": "Bad",
            "age": 25,
            "weight": -10,
            "height": 170,
        })
        self.assertEqual(res2.status_code, 422)

    def test_activity_logging_and_crud(self):
        import uuid
        user_id = f"test_user_act_{uuid.uuid4().hex[:8]}"

        # 1. Log Meal
        meal_res = client.post("/log_activity", json={
            "user_id": user_id,
            "activity_type": "meal",
            "details": "Grilled Salmon & Asparagus",
            "value": 650.0,
        })
        self.assertEqual(meal_res.status_code, 200)
        meal_log = meal_res.json()["log"]
        self.assertEqual(meal_log["activity_type"], "meal")
        self.assertEqual(meal_log["value"], 650.0)
        log_id = meal_log["id"]

        # 2. Log Workout
        workout_res = client.post("/log_activity", json={
            "user_id": user_id,
            "activity_type": "workout",
            "details": "HIIT Intervals",
            "value": 45.0,
        })
        self.assertEqual(workout_res.status_code, 200)

        # 3. Log Water
        water_res = client.post("/log_activity", json={
            "user_id": user_id,
            "activity_type": "water",
            "details": "Electrolyte Water",
            "value": 1.0,
        })
        self.assertEqual(water_res.status_code, 200)

        # 4. List logs
        list_res = client.get(f"/activity_logs?user_id={user_id}")
        self.assertEqual(list_res.status_code, 200)
        logs = list_res.json()["logs"]
        self.assertGreaterEqual(len(logs), 3)

        # 5. Update log
        update_res = client.put(f"/activity_logs/{log_id}?user_id={user_id}", json={
            "details": "Baked Salmon & Sweet Potato",
            "value": 700.0,
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["log"]["details"], "Baked Salmon & Sweet Potato")

        # 6. Delete log
        del_res = client.delete(f"/activity_logs/{log_id}?user_id={user_id}")
        self.assertEqual(del_res.status_code, 200)

    def test_activity_logging_validation_bounds(self):
        # Exceeding meal calories (e.g. 15000 kcal)
        res = client.post("/log_activity", json={
            "user_id": "test_bounds",
            "activity_type": "meal",
            "details": "Giant Feast",
            "value": 15000.0,
        })
        self.assertEqual(res.status_code, 422)

        # Zero or negative workout duration
        res2 = client.post("/log_activity", json={
            "user_id": "test_bounds",
            "activity_type": "workout",
            "details": "None",
            "value": 0,
        })
        self.assertEqual(res2.status_code, 422)

    def test_daily_summary_and_stats(self):
        import uuid
        user_id = f"test_user_summary_{uuid.uuid4().hex[:8]}"
        client.post("/log_activity", json={
            "user_id": user_id,
            "activity_type": "meal",
            "details": "Morning Oats",
            "value": 350.0,
        })
        client.post("/log_activity", json={
            "user_id": user_id,
            "activity_type": "workout",
            "details": "Morning Run",
            "value": 30.0,
        })
        client.post("/log_activity", json={
            "user_id": user_id,
            "activity_type": "water",
            "details": "Hydration Glass",
            "value": 0.5,
        })

        res = client.get(f"/daily_summary?user_id={user_id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["calories_logged"], 350.0)
        self.assertEqual(data["workout_minutes"], 30.0)
        self.assertEqual(data["water_liters"], 0.5)

        stats_res = client.get(f"/users/stats?user_id={user_id}")
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()
        self.assertIn("streak", stats)
        self.assertIn("weekly", stats)

    def test_generate_report(self):
        report_req = {
            "age": 30,
            "weight": 80.0,
            "height": 180.0,
            "gender": "male",
            "activity_level": "moderate",
            "dietary_preferences": ["vegan"],
            "health_goals": ["weight_loss"],
        }
        res = client.post("/generate_report", json=report_req)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["bmi"], 24.69)
        self.assertEqual(data["bmi_category"], "Normal")
        self.assertGreater(data["daily_calories"], 1500)
        self.assertIn("charts", data)
        self.assertEqual(len(data["charts"]["weight_projection"]["weeks"]), 12)
        self.assertTrue(any("Vegan" in note for note in data["recommendations"]))

    def test_calculate_health_score(self):
        user_id = "test_score_user"
        res = client.post("/calculate_health_score", json={
            "user_id": user_id,
            "age": 26,
            "weight": 68.0,
            "height": 175.0,
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("score", data)
        self.assertIn("label", data)
        self.assertIn("color", data)
        self.assertIn("breakdown", data)
        self.assertGreaterEqual(data["score"], 0)
        self.assertLessEqual(data["score"], 100)

    def test_analyze_query_nlp(self):
        user_id = "test_nlp_user"
        # Test dietary query
        res1 = client.post("/analyze_query", json={
            "text": "How many calories and protein should I eat for breakfast?",
            "user_id": user_id,
        })
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertEqual(data1["intent"], "dietary_advice")
        self.assertTrue(len(data1["response"]) > 20)

        # Test fitness query
        res2 = client.post("/analyze_query", json={
            "text": "What is the best cardio workout for endurance?",
            "user_id": user_id,
        })
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["intent"], "fitness_advice")

        # Test sleep query
        res3 = client.post("/analyze_query", json={
            "text": "I feel tired and have insomnia at night",
            "user_id": user_id,
        })
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.json()["intent"], "sleep_advice")


if __name__ == "__main__":
    unittest.main()
