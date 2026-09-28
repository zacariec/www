-- Account choices are private; only the anchor-display choice is mirrored in Sanity.
CREATE TABLE IF NOT EXISTS reader_preferences (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  reader_key TEXT NOT NULL UNIQUE,
  reply_notifications INTEGER NOT NULL DEFAULT 0 CHECK (reply_notifications IN (0, 1)),
  notification_enabled_at INTEGER,
  updated_at INTEGER NOT NULL
);

-- A stable provider idempotency key and persisted payload survive webhook retries.
CREATE TABLE IF NOT EXISTS comment_reply_delivery (
  comment_id TEXT PRIMARY KEY NOT NULL,
  recipient_key TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('sending', 'failed', 'sent')),
  first_attempt_at INTEGER NOT NULL,
  lease_until INTEGER NOT NULL,
  provider_id TEXT,
  sent_at INTEGER
);
