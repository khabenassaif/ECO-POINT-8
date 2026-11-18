-- Read-only admin report inbox and detail.
-- Called only after the server checks eco_admin_session; no end-user own policy is removed.
CREATE POLICY eco_verified_profile_read ON eco_profiles
  FOR SELECT USING (current_setting('eco.review_guard',true)='e25e6935dc504df39ef42aadd3f68d70');
CREATE POLICY eco_verified_redemptions_read ON redemptions
  FOR SELECT USING (current_setting('eco.review_guard',true)='e25e6935dc504df39ef42aadd3f68d70');

CREATE OR REPLACE FUNCTION eco_admin_report_feed()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_reports jsonb;
  v_total integer;
  v_pending integer;
  v_approved integer;
  v_rejected integer;
  v_latest timestamptz;
BEGIN
  PERFORM set_config('eco.review_guard','e25e6935dc504df39ef42aadd3f68d70',true);
  SELECT count(*)::int,
         count(*) FILTER (WHERE status IN ('pending_admin','submitted','automated_review'))::int,
         count(*) FILTER (WHERE status='approved')::int,
         count(*) FILTER (WHERE status='rejected')::int,
         max(submitted_at) FILTER (WHERE status IN ('pending_admin','submitted','automated_review'))
    INTO v_total,v_pending,v_approved,v_rejected,v_latest FROM waste_reports;
  SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)
    INTO v_reports FROM (
      SELECT r.id,r.user_id,r.status,r.latitude,r.longitude,r.submitted_at,
             coalesce(p.full_name,'Member Eco-Point') AS full_name,
             coalesce(p.email,'') AS email,
             c.name AS category
      FROM waste_reports r
      LEFT JOIN eco_profiles p ON p.user_id=r.user_id
      JOIN waste_categories c ON c.id=r.category_id
      ORDER BY CASE WHEN r.status IN ('pending_admin','submitted','automated_review')
                    THEN 0 ELSE 1 END, r.submitted_at DESC
      LIMIT 200
    ) x;
  RETURN jsonb_build_object('reports',v_reports,'total_count',v_total,
     'pending_count',v_pending,'approved_count',v_approved,
     'rejected_count',v_rejected,'latest_pending_at',v_latest);
END $$;

CREATE OR REPLACE FUNCTION eco_admin_report_detail(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
 v_report jsonb;
 v_checks jsonb;
 v_reviews jsonb;
 v_history jsonb;
 v_uid text;
BEGIN
 PERFORM set_config('eco.review_guard','e25e6935dc504df39ef42aadd3f68d70',true);
 SELECT to_jsonb(r) || jsonb_build_object(
          'full_name',coalesce(p.full_name,'Member Eco-Point'),
          'email',coalesce(p.email,''),
          'category',c.name,
          'category_points',c.points)
  INTO v_report
 FROM waste_reports r
 LEFT JOIN eco_profiles p ON p.user_id=r.user_id
 JOIN waste_categories c ON c.id=r.category_id
 WHERE r.id=p_id;
 IF v_report IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
 v_uid := v_report->>'user_id';
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_checks
 FROM (
   SELECT check_type,passed,details,created_at
   FROM automated_checks WHERE report_id=p_id ORDER BY created_at
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_reviews
 FROM (
   SELECT admin_id,decision,reason,created_at
   FROM admin_reviews WHERE report_id=p_id ORDER BY created_at
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO v_history
 FROM (
   SELECT r.id,r.status,r.submitted_at,c.name AS category
   FROM waste_reports r JOIN waste_categories c ON c.id=r.category_id
   WHERE r.user_id=v_uid AND r.id<>p_id
   ORDER BY r.submitted_at DESC LIMIT 5
 ) x;
 RETURN jsonb_build_object('report',v_report,'automated_checks',v_checks,
    'reviews',v_reviews,'user_history',v_history);
END $$;

CREATE OR REPLACE FUNCTION eco_admin_dashboard_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
 v_stats jsonb;
 v_statuses jsonb;
 v_categories jsonb;
 v_trend jsonb;
 v_redemptions jsonb;
 v_recent jsonb;
BEGIN
 PERFORM set_config('eco.review_guard','e25e6935dc504df39ef42aadd3f68d70',true);
 SELECT jsonb_build_object(
    'students',(SELECT count(*) FROM eco_profiles),
    'reports',(SELECT count(*) FROM waste_reports),
    'approved',(SELECT count(*) FROM waste_reports WHERE status='approved'),
    'rejected',(SELECT count(*) FROM waste_reports WHERE status='rejected'),
    'pending',(SELECT count(*) FROM waste_reports WHERE status IN ('pending_admin','submitted','automated_review')),
    'active_users',(SELECT count(DISTINCT user_id) FROM waste_reports WHERE submitted_at>now()-INTERVAL '30 days'),
    'points_distributed',(SELECT coalesce(sum(points),0) FROM point_transactions WHERE type='report_reward'),
    'redemptions',(SELECT count(*) FROM redemptions),
    'pending_pickups',(SELECT count(*) FROM redemptions WHERE status='ready')
 ) INTO v_stats;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO v_statuses
 FROM (SELECT status,count(*)::int AS count FROM waste_reports GROUP BY status ORDER BY status) t;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO v_categories
 FROM (SELECT c.name,count(r.id)::int AS count FROM waste_categories c
       LEFT JOIN waste_reports r ON r.category_id=c.id
       GROUP BY c.id,c.name ORDER BY count DESC,c.name) t;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO v_trend
 FROM (SELECT date(submitted_at) AS report_date,count(*)::int AS count
       FROM waste_reports WHERE submitted_at>now()-INTERVAL '30 days'
       GROUP BY date(submitted_at) ORDER BY report_date) t;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO v_redemptions
 FROM (SELECT status,count(*)::int AS count FROM redemptions GROUP BY status ORDER BY status) t;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO v_recent
 FROM (SELECT r.id,r.status,r.submitted_at,
         coalesce(p.full_name,'Member Eco-Point') AS full_name,c.name AS category
       FROM waste_reports r
       LEFT JOIN eco_profiles p ON p.user_id=r.user_id
       JOIN waste_categories c ON c.id=r.category_id
       ORDER BY r.submitted_at DESC LIMIT 6) t;
 RETURN jsonb_build_object('stats',v_stats,'report_statuses',v_statuses,
  'category_distribution',v_categories,'report_trend',v_trend,
  'redemption_statuses',v_redemptions,'recent_reports',v_recent);
END $$;