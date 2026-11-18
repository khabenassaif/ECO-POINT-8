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