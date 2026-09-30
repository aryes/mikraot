-- Baseline: the schema as it exists in production (mikraot-db, created by hand in Sept 2026).
-- IF NOT EXISTS lets this be recorded as applied on the production database without changes.

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  is_admin_reply INTEGER DEFAULT 0,
  approved INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Course progress and quiz results: empty, reserved for the deferred LearnPress migration.
CREATE TABLE IF NOT EXISTS user_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  lesson_id INTEGER NOT NULL,
  lesson_slug TEXT,
  completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  quiz_id INTEGER NOT NULL,
  quiz_slug TEXT,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers TEXT,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
