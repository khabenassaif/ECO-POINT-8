CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('report_reward','redemption','adjustment','refund')),
  points INTEGER NOT NULL,
  report_id UUID REFERENCES waste_reports(id),
  redemption_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (points <> 0)
);

CREATE UNIQUE INDEX ux_point_report_reward ON point_transactions(report_id) WHERE type = 'report_reward';
CREATE INDEX ix_points_user_time ON point_transactions(user_id, created_at DESC);

CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_key TEXT,
  point_cost INTEGER NOT NULL CHECK (point_cost > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  reward_id UUID NOT NULL REFERENCES rewards(id),
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','collected','cancelled')),
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, idempotency_key)
);

ALTER TABLE point_transactions ADD CONSTRAINT fk_point_redemption FOREIGN KEY (redemption_id) REFERENCES redemptions(id);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_notifications_user ON notifications(user_id, is_read, created_at DESC)