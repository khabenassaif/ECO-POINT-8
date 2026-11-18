-- One shared admin access code (stored as a salted PBKDF2 verifier, never plaintext).
-- Usernames are labels only, not an authorization factor.
CREATE TABLE eco_admin_credentials (
  id SMALLINT PRIMARY KEY CHECK (id=1),
  salt_hex TEXT NOT NULL,
  verifier_hex TEXT NOT NULL,
  iterations INTEGER NOT NULL CHECK (iterations BETWEEN 100000 AND 1000000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO eco_admin_credentials(id,salt_hex,verifier_hex,iterations)
VALUES (1,'4bad7d292cbdbd669f77e5550c347fd8','354616e8b4963e514ec8c8a2faf9e5e054ffeb19d7c377c26c55de1438dbe58a',260000);
CREATE TABLE eco_admin_code_sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX ix_eco_admin_code_sessions_expiry ON eco_admin_code_sessions(expires_at);
CREATE TABLE eco_admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_eco_admin_attempts_client_time ON eco_admin_login_attempts(client_key,created_at DESC);