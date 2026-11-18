-- Admin email-code step-up, report points snapshot, and idempotent review decisions.
CREATE TABLE admin_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  nonce UUID NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE INDEX admin_otp_challenges_email_time ON admin_otp_challenges(email,created_at DESC);
CREATE TABLE admin_otp_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  challenge_id UUID NOT NULL REFERENCES admin_otp_challenges(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX ux_admin_otp_session_challenge ON admin_otp_sessions(challenge_id);
CREATE INDEX admin_otp_sessions_email_expiry ON admin_otp_sessions(email,expires_at);
ALTER TABLE waste_reports ADD COLUMN IF NOT EXISTS awarded_points INTEGER;
ALTER TABLE waste_reports ADD CONSTRAINT ck_report_awarded_points CHECK (awarded_points IS NULL OR awarded_points BETWEEN 0 AND 10);
CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_review_one_decision_per_report ON admin_reviews(report_id);