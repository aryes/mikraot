-- Replies to a specific comment (threaded, as on WordPress). NULL: a top-level comment.
ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments (id);
