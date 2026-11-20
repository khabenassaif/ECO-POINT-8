-- Vercel/Neon Top 3 campaign. Non-destructive and safe to rerun.
CREATE TABLE IF NOT EXISTS eco_contest(
 id SMALLINT PRIMARY KEY CHECK(id=1),
 title TEXT NOT NULL DEFAULT 'Eco-Point Top 3 Challenge',
 starts_at TIMESTAMPTZ NOT NULL,
 ends_at TIMESTAMPTZ NOT NULL,
 announcement_at TIMESTAMPTZ NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(starts_at<ends_at AND ends_at<announcement_at)
);
INSERT INTO eco_contest(id,starts_at,ends_at,announcement_at)
VALUES(1,'2026-11-20T00:00:00+07:00','2026-12-20T23:59:59+07:00','2026-12-22T10:00:00+07:00')
ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS eco_contest_prizes(
 place SMALLINT PRIMARY KEY CHECK(place BETWEEN 1 AND 3),
 reward_id UUID NOT NULL UNIQUE REFERENCES rewards(id)
);
INSERT INTO rewards(name,description,point_cost,stock,is_active,category,pickup_instructions)
SELECT v.name,v.description,1,1,true,'contest',v.pickup FROM
 (VALUES
 ('Mouse JETE MO106','Hadiah juara pertama','Hadiah untuk peringkat 1 setelah pengumuman.'),
 ('Earphone JETE Eazy 3','Hadiah juara kedua','Hadiah untuk peringkat 2 setelah pengumuman.'),
 ('Mousepad JETE','Hadiah juara ketiga','Hadiah untuk peringkat 3 setelah pengumuman.')
 ) AS v(name,description,pickup)
WHERE NOT EXISTS(SELECT 1 FROM rewards r WHERE r.name=v.name AND r.category='contest');
INSERT INTO eco_contest_prizes(place,reward_id)
SELECT v.place,r.id FROM
 (VALUES(1,'Mouse JETE MO106'),(2,'Earphone JETE Eazy 3'),(3,'Mousepad JETE')) AS v(place,name)
JOIN rewards r ON r.name=v.name AND r.category='contest'
ON CONFLICT(place) DO NOTHING;
CREATE OR REPLACE FUNCTION eco_contest_leaderboard()
RETURNS TABLE(user_id TEXT,full_name TEXT,total_points BIGINT,approved_reports BIGINT,last_earned TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $ranking$
 SELECT t.user_id,COALESCE(p.full_name,'Member Eco-Point')::text,
 SUM(t.points)::bigint,COUNT(DISTINCT t.report_id)::bigint,MAX(t.created_at)
 FROM point_transactions t JOIN eco_contest ec ON ec.id=1
 JOIN waste_reports wr ON wr.id=t.report_id AND wr.status='approved'
 LEFT JOIN eco_profiles p ON p.user_id=t.user_id
 WHERE t.type='report_reward' AND t.points>0
 AND t.created_at BETWEEN ec.starts_at AND ec.ends_at
 AND wr.reviewed_at BETWEEN ec.starts_at AND ec.ends_at
 GROUP BY t.user_id,p.full_name
 ORDER BY SUM(t.points) DESC,COUNT(DISTINCT t.report_id) DESC,MAX(t.created_at) ASC,t.user_id ASC
$ranking$;
CREATE INDEX IF NOT EXISTS ix_eco_contest_tx_window ON point_transactions(type,created_at);
