import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).parent / "wellora.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    conn = get_conn()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT '',
                age INTEGER,
                weight REAL,
                height REAL,
                gender TEXT DEFAULT 'male',
                activity_level TEXT DEFAULT 'light',
                dietary_preferences TEXT DEFAULT '[]',
                health_goals TEXT DEFAULT '[]',
                target_calories REAL DEFAULT 2000,
                target_steps INTEGER DEFAULT 10000,
                target_water REAL DEFAULT 2.5,
                target_workout_minutes INTEGER DEFAULT 30,
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                details TEXT NOT NULL,
                value REAL NOT NULL,
                timestamp TEXT NOT NULL,
                metadata TEXT DEFAULT '{}'
            );

            CREATE INDEX IF NOT EXISTS idx_activity_user_time
            ON activity_logs(user_id, timestamp);

            CREATE INDEX IF NOT EXISTS idx_activity_user_type_time
            ON activity_logs(user_id, activity_type, timestamp);
            """
        )
        conn.commit()

        # Seed initial sample data only if completely empty
        cursor = conn.execute("SELECT COUNT(*) as c FROM activity_logs")
        if cursor.fetchone()["c"] == 0:
            now = datetime.now()
            seed_logs = [
                ("default_user", "workout", "Jogging", 30, now - timedelta(days=2)),
                ("default_user", "meal", "Grilled Chicken & Quinoa", 550, now - timedelta(days=2)),
                ("default_user", "water", "Mineral Water", 1.5, now - timedelta(days=2)),
                ("default_user", "workout", "Yoga Flow", 45, now - timedelta(days=1)),
                ("default_user", "meal", "Oatmeal with Berries", 400, now - timedelta(days=1)),
                ("default_user", "water", "Hydration Bottle", 2.0, now - timedelta(days=1)),
                ("default_user", "workout", "Gym Resistance Training", 60, now),
                ("default_user", "meal", "Avocado & Egg Toast", 450, now),
                ("default_user", "water", "Fresh Water", 1.25, now),
            ]
            for user_id, activity_type, details, value, ts in seed_logs:
                conn.execute(
                    """
                    INSERT INTO activity_logs (user_id, activity_type, details, value, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user_id, activity_type, details, value, ts.isoformat()),
                )
            conn.commit()
    finally:
        conn.close()


def _parse_json_list(value: Optional[str]) -> List[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def row_to_profile(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "user_id": row["user_id"],
        "name": row["name"],
        "age": row["age"],
        "weight": row["weight"],
        "height": row["height"],
        "gender": row["gender"],
        "activity_level": row["activity_level"],
        "dietary_preferences": _parse_json_list(row["dietary_preferences"]),
        "health_goals": _parse_json_list(row["health_goals"]),
        "target_calories": row["target_calories"],
        "target_steps": row["target_steps"],
        "target_water": row["target_water"],
        "target_workout_minutes": row["target_workout_minutes"],
        "updated_at": row["updated_at"],
    }


def upsert_profile(profile: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_conn()
    try:
        now = datetime.now().isoformat()
        conn.execute(
            """
            INSERT INTO profiles (
                user_id, name, age, weight, height, gender, activity_level,
                dietary_preferences, health_goals, target_calories, target_steps,
                target_water, target_workout_minutes, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name=excluded.name,
                age=excluded.age,
                weight=excluded.weight,
                height=excluded.height,
                gender=excluded.gender,
                activity_level=excluded.activity_level,
                dietary_preferences=excluded.dietary_preferences,
                health_goals=excluded.health_goals,
                target_calories=excluded.target_calories,
                target_steps=excluded.target_steps,
                target_water=excluded.target_water,
                target_workout_minutes=excluded.target_workout_minutes,
                updated_at=excluded.updated_at
            """,
            (
                profile["user_id"],
                profile.get("name", "").strip(),
                profile.get("age"),
                profile.get("weight"),
                profile.get("height"),
                profile.get("gender", "male"),
                profile.get("activity_level", "light"),
                json.dumps(profile.get("dietary_preferences", [])),
                json.dumps(profile.get("health_goals", [])),
                profile.get("target_calories", 2000),
                profile.get("target_steps", 10000),
                profile.get("target_water", 2.5),
                profile.get("target_workout_minutes", 30),
                now,
            ),
        )
        conn.commit()
        return get_profile(profile["user_id"]) or profile
    finally:
        conn.close()


def get_profile(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
        return row_to_profile(row) if row else None
    finally:
        conn.close()


def insert_activity_log(log: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_conn()
    try:
        ts = log.get("timestamp") or datetime.now().isoformat()
        metadata = json.dumps(log.get("metadata", {}))
        cursor = conn.execute(
            """
            INSERT INTO activity_logs (user_id, activity_type, details, value, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                log["user_id"],
                log["activity_type"],
                log["details"].strip(),
                log["value"],
                ts,
                metadata,
            ),
        )
        conn.commit()
        log_id = cursor.lastrowid
        return get_activity_log(log_id)
    finally:
        conn.close()


def get_activity_log(log_id: int) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM activity_logs WHERE id = ?", (log_id,)
        ).fetchone()
        return _row_to_log(row) if row else None
    finally:
        conn.close()


def _row_to_log(row: sqlite3.Row) -> Dict[str, Any]:
    try:
        meta = json.loads(row["metadata"] or "{}")
    except (json.JSONDecodeError, TypeError):
        meta = {}
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "activity_type": row["activity_type"],
        "details": row["details"],
        "value": row["value"],
        "timestamp": row["timestamp"],
        "metadata": meta,
    }


def get_activity_logs(
    user_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    activity_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    conn = get_conn()
    try:
        query = "SELECT * FROM activity_logs WHERE user_id = ?"
        params: List[Any] = [user_id]

        if activity_type:
            query += " AND activity_type = ?"
            params.append(activity_type)
        if from_date:
            query += " AND timestamp >= ?"
            params.append(from_date)
        if to_date:
            query += " AND timestamp <= ?"
            params.append(to_date)

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([max(1, min(limit, 500)), max(0, offset)])

        rows = conn.execute(query, params).fetchall()
        return [_row_to_log(row) for row in rows]
    finally:
        conn.close()


def delete_activity_log(log_id: int, user_id: str) -> bool:
    conn = get_conn()
    try:
        cursor = conn.execute(
            "DELETE FROM activity_logs WHERE id = ? AND user_id = ?",
            (log_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def update_activity_log(log_id: int, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    try:
        existing = conn.execute(
            "SELECT * FROM activity_logs WHERE id = ? AND user_id = ?",
            (log_id, user_id),
        ).fetchone()
        if not existing:
            return None

        new_type = updates.get("activity_type", existing["activity_type"])
        new_details = updates.get("details", existing["details"])
        new_value = updates.get("value", existing["value"])
        new_meta = json.dumps(updates.get("metadata", json.loads(existing["metadata"] or "{}")))

        conn.execute(
            """
            UPDATE activity_logs
            SET activity_type = ?, details = ?, value = ?, metadata = ?
            WHERE id = ? AND user_id = ?
            """,
            (new_type, new_details, new_value, new_meta, log_id, user_id),
        )
        conn.commit()
        return get_activity_log(log_id)
    finally:
        conn.close()


def get_daily_summary(user_id: str, date_str: Optional[str] = None) -> Dict[str, Any]:
    target_date = datetime.fromisoformat(date_str).date() if date_str else datetime.now().date()
    start = datetime.combine(target_date, datetime.min.time()).isoformat()
    end = datetime.combine(target_date, datetime.max.time()).isoformat()

    logs = get_activity_logs(user_id, from_date=start, to_date=end, limit=500)

    calories_logged = sum(
        log["value"] for log in logs if log["activity_type"] == "meal"
    )
    workout_minutes = sum(
        log["value"] for log in logs if log["activity_type"] == "workout"
    )
    water_liters = sum(
        log["value"] for log in logs if log["activity_type"] == "water"
    )
    meal_count = sum(1 for log in logs if log["activity_type"] == "meal")
    workout_count = sum(1 for log in logs if log["activity_type"] == "workout")

    return {
        "date": target_date.isoformat(),
        "calories_logged": round(calories_logged, 1),
        "workout_minutes": round(workout_minutes, 1),
        "water_liters": round(water_liters, 2),
        "meal_count": meal_count,
        "workout_count": workout_count,
        "logs": logs,
    }


def get_weekly_history(user_id: str) -> Dict[str, Any]:
    now = datetime.now()
    monday = now - timedelta(days=now.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)

    workout_data = [0.0] * 7
    meal_data = [0.0] * 7
    water_data = [0.0] * 7
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    logs = get_activity_logs(
        user_id,
        from_date=monday.isoformat(),
        limit=500,
    )

    for log in logs:
        try:
            log_time = datetime.fromisoformat(log["timestamp"])
            if log_time >= monday:
                day_idx = log_time.weekday()
                if 0 <= day_idx < 7:
                    if log["activity_type"] == "workout":
                        workout_data[day_idx] += log["value"]
                    elif log["activity_type"] == "meal":
                        meal_data[day_idx] += log["value"]
                    elif log["activity_type"] == "water":
                        water_data[day_idx] += log["value"]
        except Exception:
            continue

    workout_data = [round(v, 1) for v in workout_data]
    meal_data = [round(v, 1) for v in meal_data]
    water_data = [round(v, 2) for v in water_data]

    return {
        "labels": labels,
        "workout_data": workout_data,
        "meal_data": meal_data,
        "water_data": water_data,
        "data": workout_data,  # backward compatibility default
    }


def calculate_streak(user_id: str) -> Dict[str, Any]:
    conn = get_conn()
    try:
        rows = conn.execute(
            """
            SELECT DISTINCT date(timestamp) as day
            FROM activity_logs
            WHERE user_id = ?
            ORDER BY day DESC
            """,
            (user_id,),
        ).fetchall()

        if not rows:
            return {"current_streak": 0, "longest_streak": 0, "total_active_days": 0}

        days = []
        for r in rows:
            try:
                days.append(datetime.strptime(r["day"], "%Y-%m-%d").date())
            except Exception:
                continue

        if not days:
            return {"current_streak": 0, "longest_streak": 0, "total_active_days": 0}

        today = datetime.now().date()
        day_set = set(days)

        current_streak = 0
        if today in day_set:
            check_date = today
            while check_date in day_set:
                current_streak += 1
                check_date -= timedelta(days=1)
        elif (today - timedelta(days=1)) in day_set:
            check_date = today - timedelta(days=1)
            while check_date in day_set:
                current_streak += 1
                check_date -= timedelta(days=1)
        else:
            current_streak = 0

        longest_streak = 0
        streak = 0
        sorted_days = sorted(day_set)
        for i, day in enumerate(sorted_days):
            if i == 0:
                streak = 1
            elif (day - sorted_days[i - 1]).days == 1:
                streak += 1
            else:
                streak = 1
            longest_streak = max(longest_streak, streak)

        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "total_active_days": len(day_set),
        }
    finally:
        conn.close()


def get_user_activity_count(user_id: str) -> int:
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as c FROM activity_logs WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return row["c"] if row else 0
    finally:
        conn.close()
