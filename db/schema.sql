BEGIN;
CREATE TABLE IF NOT EXISTS bdm_shared_state (
  id integer PRIMARY KEY CHECK (id=1),
  revision integer NOT NULL DEFAULT 0 CHECK (revision>=0),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bdm_shared_backups (
  revision integer PRIMARY KEY,
  data jsonb NOT NULL,
  clerk_user_id text NOT NULL,
  bdm_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO bdm_shared_state(id) VALUES(1) ON CONFLICT DO NOTHING;
COMMIT;
