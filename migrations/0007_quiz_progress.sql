-- Quiz results kept in a learner's account (src/server/quiz-results.ts), so they follow the learner
-- to every device. Each browser (`device`, a random name it keeps) has its own row per quiz with
-- its own results; the account's are the sum of its rows, so a browser that sends its results
-- again replaces its row and nothing is counted twice. `stats` is the browser's JSON
-- (src/lib/quiz-stats.ts). A reset (`quiz_resets`) deletes a quiz's rows; each browser, seeing a
-- newer reset than it knew, clears its own results of that quiz.

CREATE TABLE quiz_progress (
  user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  quiz TEXT NOT NULL,
  device TEXT NOT NULL,
  stats TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, quiz, device)
);

CREATE TABLE quiz_resets (
  user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  quiz TEXT NOT NULL,
  reset_at TEXT NOT NULL,
  PRIMARY KEY (user_id, quiz)
);
