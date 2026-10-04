-- Fictional comments for the LOCAL test database only (npm run db:local:reset).
DELETE FROM comments;
INSERT INTO comments (page_slug, author_name, author_email, content, is_admin_reply, approved, created_at) VALUES
  ('טעמים/נוסח-אשכנז', 'קורא לדוגמה', 'reader@example.com', 'תגובת בדיקה ראשונה', 0, 1, '2024-01-01 10:00:00'),
  ('טעמים/נוסח-אשכנז', 'מנהל לדוגמה', NULL, 'תשובת מנהל לדוגמה', 1, 1, '2024-01-02 10:00:00'),
  ('טעמים/נוסח-אשכנז', 'ממתין לאישור', NULL, 'תגובה שלא אושרה ואסור שתוצג', 0, 0, '2024-01-03 10:00:00'),
  ('about', 'אורח לדוגמה', NULL, 'תגובה בעמוד אודות', 0, 1, '2024-01-04 10:00:00');
-- The admin answer is a reply to the first comment.
UPDATE comments SET parent_id = (SELECT id FROM comments WHERE author_name = 'קורא לדוגמה')
  WHERE author_name = 'מנהל לדוגמה';
