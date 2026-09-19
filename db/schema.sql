-- ==========================================================
-- MOTIONFIT TURSO CLOUD DATABASE SCHEMA
-- Compatible with libSQL / SQLite
-- ==========================================================

-- 1. Users Table (Linked to Clerk User ID)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- Clerk User ID (e.g. user_2...)
  email TEXT,
  name TEXT,
  weekly_goal INTEGER DEFAULT 3,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'id',
  streak INTEGER DEFAULT 0,
  last_workout_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Workouts Table (Completed Workout Sessions)
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  duration INTEGER NOT NULL,
  exercises TEXT NOT NULL, -- JSON formatted array of exercises & sets
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);

-- 3. Workout Templates Table
CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  exercises TEXT NOT NULL, -- JSON formatted array of exercises & sets
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON workout_templates(user_id);

-- 4. Step History Table
CREATE TABLE IF NOT EXISTS step_history (
  id TEXT PRIMARY KEY, -- Composite key: {user_id}_{date}
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_step_history_user_date ON step_history(user_id, date);
