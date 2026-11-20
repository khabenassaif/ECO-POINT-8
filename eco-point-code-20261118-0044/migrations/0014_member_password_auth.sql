-- Password login fallback for a deployment without an outbound email provider.
-- Existing OTP-authenticated member records and session tables are preserved.
ALTER TABLE eco_member_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE TABLE IF NOT EXISTS eco_member_auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  client_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('login','register')),
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS eco_member_auth_attempts_recent_idx ON eco_member_auth_attempts (client_key,created_at DESC);
CREATE INDEX IF NOT EXISTS eco_member_auth_attempts_email_idx ON eco_member_auth_attempts (email,created_at DESC);
