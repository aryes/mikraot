-- Comments are always read per page and approval state.
CREATE INDEX IF NOT EXISTS comments_page_approved ON comments (page_slug, approved);
