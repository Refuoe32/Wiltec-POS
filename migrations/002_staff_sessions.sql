-- Staff sign-in / sign-out records (safe to run more than once)
CREATE TABLE IF NOT EXISTS staff_sessions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  login_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at  TIMESTAMPTZ,
  end_reason TEXT,            -- signout | timeout | locked
  ip         TEXT,
  device     TEXT
);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_user ON staff_sessions (user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_login ON staff_sessions (login_at DESC);
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;
