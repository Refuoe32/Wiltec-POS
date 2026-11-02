-- Passport photo, discount audit fields, and staff tasks (safe to run more than once)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_reason TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_approved_by UUID REFERENCES users(id);
CREATE TABLE IF NOT EXISTS tasks (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  assigned_to   UUID NOT NULL REFERENCES users(id),
  assigned_by   UUID REFERENCES users(id),
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  due_date      DATE,
  repair_job_id UUID REFERENCES repair_jobs(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (assigned_to, status);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
