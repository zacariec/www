CREATE TABLE IF NOT EXISTS subscriber (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  resend_contact_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS subscriber_status_idx ON subscriber(status);
