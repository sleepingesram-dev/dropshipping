-- DropshipOS Postgres schema. Applied by `npm run migrate` when DATABASE_URL
-- is set. Metric history comes from the integration adapters; these tables
-- hold operator state and the append-only automation/alert records.

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INT NOT NULL DEFAULT 60,
  last_run_at TIMESTAMPTZ,
  last_status TEXT
);

CREATE TABLE IF NOT EXISTS automation_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  automation_id TEXT,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS automation_log_at_idx ON automation_log (at DESC);

CREATE TABLE IF NOT EXISTS research_candidates (
  id BIGSERIAL PRIMARY KEY,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  category TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb, -- costs, signals, criteria, score
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  severity TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS alerts_open_key_idx ON alerts (key) WHERE resolved_at IS NULL;

-- Daily performance snapshots so history survives ad-platform data windows.
CREATE TABLE IF NOT EXISTS metric_snapshots (
  day DATE NOT NULL,
  scope TEXT NOT NULL, -- 'store' | campaign id
  data JSONB NOT NULL,
  PRIMARY KEY (day, scope)
);
