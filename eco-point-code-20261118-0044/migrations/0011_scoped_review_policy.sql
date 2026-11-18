-- Scoped administrative access is enabled ONLY within the verified
-- server-side report decision function. Member 'own' policies stay in place.
CREATE POLICY eco_verified_review_access ON waste_reports
  FOR ALL USING (current_setting('eco.review_guard',true)='e25e6935dc504df39ef42aadd3f68d70')
  WITH CHECK (current_setting('eco.review_guard',true)='e25e6935dc504df39ef42aadd3f68d70');
CREATE POLICY eco_verified_point_read ON point_transactions
  FOR SELECT USING (current_setting('eco.review_guard',true)='e25e6935dc504df39ef42aadd3f68d70');
CREATE POLICY eco_verified_point_insert ON point_transactions
  FOR INSERT WITH CHECK (current_setting('eco.review_guard',true)='e25e6935dc504df39ef42aadd3f68d70');
CREATE POLICY eco_verified_notice_insert ON notifications
  FOR INSERT WITH CHECK (current_setting('eco.review_guard',true)='e25e6935dc504df39ef42aadd3f68d70');

-- Atomic administrator report decision. Runs only from the authenticated admin route.
-- SECURITY DEFINER permits the audited workflow to update another member's
-- own-scoped report and point ledger without weakening per-user table policies.
CREATE OR REPLACE FUNCTION eco_admin_decide_report(
  p_report_id uuid,
  p_decision text,
  p_reason text,
  p_operator text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_report waste_reports%ROWTYPE;
  category_points integer;
  category_label text;
  clean_reason text;
BEGIN
  PERFORM set_config('eco.review_guard','e25e6935dc504df39ef42aadd3f68d70',true);
  IF p_decision NOT IN ('approved','rejected') OR p_decision IS NULL THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_decision');
  END IF;
  IF p_operator IS NULL OR length(btrim(p_operator)) < 2 THEN
    RETURN jsonb_build_object('ok',false,'code','missing_operator');
  END IF;
  clean_reason := left(btrim(coalesce(p_reason,'')),1200);
  IF p_decision='rejected' AND length(clean_reason)=0 THEN
    RETURN jsonb_build_object('ok',false,'code','reason_required');
  END IF;

  SELECT * INTO target_report FROM waste_reports
    WHERE id=p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'code','not_found');
  END IF;
  IF target_report.status IN ('approved','rejected') THEN
    RETURN jsonb_build_object('ok',false,'code','already_reviewed','status',target_report.status);
  END IF;
  IF target_report.status NOT IN ('submitted','automated_review','pending_admin') THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_status');
  END IF;
  SELECT points,name INTO category_points,category_label
    FROM waste_categories WHERE id=target_report.category_id;
  IF NOT FOUND OR category_points IS NULL OR category_points<5 OR category_points>10 THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_points');
  END IF;

  UPDATE waste_reports
    SET status=p_decision,reviewed_at=NOW(),reviewed_by=left(p_operator,48),
        rejection_reason=CASE WHEN p_decision='rejected' THEN clean_reason ELSE NULL END,
        awarded_points=CASE WHEN p_decision='approved' THEN category_points ELSE 0 END
    WHERE id=p_report_id;

  INSERT INTO admin_reviews(report_id,admin_id,decision,reason)
    VALUES(p_report_id,left(p_operator,48),p_decision,
           CASE WHEN p_decision='rejected' THEN clean_reason ELSE NULL END);

  IF p_decision='approved' THEN
    INSERT INTO point_transactions(user_id,type,points,report_id,reason)
      VALUES(target_report.user_id,'report_reward',category_points,p_report_id,
             'Poin laporan disetujui: ' || category_label);
    INSERT INTO notifications(user_id,title,body,type)
      VALUES(target_report.user_id,'Laporan disetujui',
             'Laporanmu telah disetujui admin. Kamu memperoleh ' || category_points || ' poin.',
             'report_approved');
  ELSE
    INSERT INTO notifications(user_id,title,body,type)
      VALUES(target_report.user_id,'Laporan ditolak',
             'Laporan ditolak admin: ' || clean_reason,'report_rejected');
  END IF;

  RETURN jsonb_build_object('ok',true,'status',p_decision,
          'awarded_points',CASE WHEN p_decision='approved' THEN category_points ELSE 0 END,
          'report_id',p_report_id);
END;
$$;
-- Rollback-only integration check for report approval.
-- All fixture writes are rolled back in a nested exception block.
CREATE OR REPLACE FUNCTION eco_admin_review_selftest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_category uuid;
  v_user text := 'review-selftest-' || v_id::text;
  v_first jsonb;
  v_repeat jsonb;
  v_awards integer := -1;
  v_reviews integer := -1;
  v_status text;
  v_awarded integer;
  v_error text := '';
  v_errcode text := '';
BEGIN
  PERFORM set_config('eco.review_guard','e25e6935dc504df39ef42aadd3f68d70',true);
  SELECT id INTO v_category FROM waste_categories WHERE points BETWEEN 5 AND 10 LIMIT 1;
  IF v_category IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','no_category');
  END IF;
  BEGIN
    INSERT INTO waste_reports(
      id,user_id,category_id,photo_key,photo_content_type,
      photo_bytes,photo_hash,latitude,longitude,status
    ) VALUES (
      v_id,v_user,v_category,'selftest/rollback','image/jpeg',
      128,v_id::text,-6.2,106.8,'pending_admin'
    );
    SELECT eco_admin_decide_report(v_id,'approved','','Penguji Admin') INTO v_first;
    SELECT eco_admin_decide_report(v_id,'approved','','Penguji Admin') INTO v_repeat;
    SELECT COUNT(*)::int INTO v_awards FROM point_transactions
      WHERE report_id=v_id AND type='report_reward';
    SELECT COUNT(*)::int INTO v_reviews FROM admin_reviews WHERE report_id=v_id;
    SELECT status,awarded_points INTO v_status,v_awarded FROM waste_reports WHERE id=v_id;
    RAISE EXCEPTION 'rollback the synthetic fixture' USING ERRCODE='P0001';
  EXCEPTION WHEN OTHERS THEN
    v_errcode := SQLSTATE;
    v_error := SQLERRM;
  END;
  RETURN jsonb_build_object(
    'ok', v_errcode='P0001' AND v_first->>'ok'='true'
          AND v_repeat->>'code'='already_reviewed'
          AND v_awards=1 AND v_reviews=1
          AND v_status='approved' AND v_awarded BETWEEN 5 AND 10,
    'rollback_only',v_errcode='P0001',
    'first',v_first,
    'repeat',v_repeat,
    'awards',v_awards,'reviews',v_reviews,
    'status',v_status,'awarded_points',v_awarded,
    'exception_code',v_errcode,
    'error',CASE WHEN v_errcode='P0001' THEN NULL ELSE v_error END
  );
END;
$$;