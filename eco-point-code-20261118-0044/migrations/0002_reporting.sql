CREATE TABLE waste_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES waste_categories(id),
  photo_key TEXT NOT NULL,
  photo_content_type TEXT NOT NULL,
  photo_bytes INTEGER NOT NULL CHECK (photo_bytes > 0),
  photo_hash TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  gps_accuracy DOUBLE PRECISION CHECK (gps_accuracy IS NULL OR gps_accuracy >= 0),
  location_captured_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_admin' CHECK (status IN ('submitted','automated_review','pending_admin','approved','rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT,
  CONSTRAINT rejection_reason_required CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL)
);

CREATE UNIQUE INDEX ux_report_reward_source ON waste_reports(id);
CREATE INDEX ix_reports_user_time ON waste_reports(user_id, submitted_at DESC);
CREATE INDEX ix_reports_status_time ON waste_reports(status, submitted_at DESC);
CREATE INDEX ix_reports_hash ON waste_reports(photo_hash);

CREATE TABLE automated_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES waste_reports(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_checks_report ON automated_checks(report_id, created_at);

CREATE TABLE admin_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES waste_reports(id),
  admin_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)