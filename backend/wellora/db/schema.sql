-- Wellora SQLite schema. Every statement is idempotent so it can run on each startup.

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
CREATE INDEX IF NOT EXISTS idx_activity_user_time ON activity_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_user_type_time ON activity_logs(user_id, activity_type, timestamp);

CREATE TABLE IF NOT EXISTS sleep_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    quality INTEGER NOT NULL,
    deep_sleep_hours REAL DEFAULT 0.0,
    bed_time TEXT,
    wake_time TEXT,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_logs(user_id, date);

CREATE TABLE IF NOT EXISTS daily_habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT DEFAULT 'checkmark-circle',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON daily_habits(user_id, is_active);

CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    UNIQUE(habit_id, user_id, date) ON CONFLICT REPLACE,
    FOREIGN KEY(habit_id) REFERENCES daily_habits(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_habit_comp_user_date ON habit_completions(user_id, date);

CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    weight REAL NOT NULL,
    bmi REAL,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_logs(user_id, date);

CREATE TABLE IF NOT EXISTS foods_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    serving_size REAL NOT NULL,
    serving_unit TEXT NOT NULL,
    calories REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fats_g REAL NOT NULL,
    fiber_g REAL DEFAULT 0.0
);

-- v3: medications & dose tracking
CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL DEFAULT '',
    times TEXT NOT NULL DEFAULT '[]',
    instructions TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_meds_user ON medications(user_id, is_active);

CREATE TABLE IF NOT EXISTS medication_doses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    taken_at TEXT NOT NULL,
    UNIQUE(medication_id, date, scheduled_time) ON CONFLICT REPLACE,
    FOREIGN KEY(medication_id) REFERENCES medications(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_doses_user_date ON medication_doses(user_id, date);

-- v3: vitals
CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    vital_type TEXT NOT NULL,
    value REAL NOT NULL,
    value_secondary REAL,
    context TEXT,
    measured_at TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_vitals_user_type_time ON vitals(user_id, vital_type, measured_at);
