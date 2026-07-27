-- broadcast_log — idempotency ledger for new-post broadcasts.
--
-- Sanity webhooks can fire more than once per publish (retries, edits to
-- already-published docs). We use the post slug as a natural unique key:
--  1. INSERT with a placeholder broadcast_id ('pending') acts as a lock.
--  2. If the INSERT succeeds we own the send; hit Resend, then UPDATE.
--  3. If the INSERT fails on the unique constraint, another invocation
--     already handled this slug — we skip.
--  4. If the Resend call fails we DELETE the reservation so the next
--     webhook attempt can retry cleanly.
CREATE TABLE IF NOT EXISTS broadcast_log (
  slug          TEXT    PRIMARY KEY NOT NULL,
  broadcast_id  TEXT    NOT NULL,
  sent_at       INTEGER NOT NULL
);
