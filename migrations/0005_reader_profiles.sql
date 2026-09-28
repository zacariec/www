-- OAuth display metadata only. Existing Better Auth users, accounts and sessions are unchanged.
CREATE TABLE IF NOT EXISTS reader_profile (
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  handle TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_id)
);

-- Pin each new reader session to the OAuth identity that authenticated it.
-- Older sessions intentionally retain the existing account-based lookup.
CREATE TABLE IF NOT EXISTS reader_session (
  session_id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
);
