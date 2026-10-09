-- Email a commenter when someone replies, if they asked to (a checkbox, only with an email).
ALTER TABLE comments ADD COLUMN notify_replies INTEGER NOT NULL DEFAULT 0;
-- A random token for the unsubscribe link in those emails; set only when notify_replies is 1.
ALTER TABLE comments ADD COLUMN unsubscribe_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS comments_unsubscribe_token ON comments (unsubscribe_token);
