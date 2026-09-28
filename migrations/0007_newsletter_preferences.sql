ALTER TABLE subscriber ADD COLUMN preference TEXT NOT NULL DEFAULT 'all'
  CHECK (preference IN ('all', 'tapes', 'none'));
UPDATE subscriber SET preference = 'none' WHERE status = 'unsubscribed';
