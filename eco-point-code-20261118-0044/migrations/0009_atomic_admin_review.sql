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