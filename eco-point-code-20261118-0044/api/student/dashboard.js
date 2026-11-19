import { db } from "../../../render-server/sdk.js";
import { requireAllowedUser, getBalance } from "../../lib/user-access.js";

export const access = "user";
export const methods = ["GET"];

export default async function(req,res){
  const ctx = await requireAllowedUser(req,res); if(!ctx) return;
  const uid = ctx.user.id;
  const [counts, recent, tx, rewards, unread, activity] = await Promise.all([
    db.query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='approved')::int approved, COUNT(*) FILTER (WHERE status IN ('submitted','automated_review','pending_admin'))::int pending FROM waste_reports WHERE user_id=$1",[uid]),
    db.query("SELECT r.id,r.status,r.submitted_at,c.name category,c.points FROM waste_reports r JOIN waste_categories c ON c.id=r.category_id WHERE r.user_id=$1 ORDER BY r.submitted_at DESC LIMIT 5",[uid]),
    db.query("SELECT id,type,points,reason,created_at FROM point_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5",[uid]),
    db.query("SELECT id,name,description,point_cost,stock,category,(image_key IS NOT NULL) has_image FROM rewards WHERE is_active=true AND stock>0 ORDER BY created_at DESC LIMIT 4"),
    db.query("SELECT COUNT(*)::int n FROM notifications WHERE user_id=$1 AND is_read=false",[uid]),
    db.query("SELECT DATE(submitted_at) AS report_date,COUNT(*)::int AS count FROM waste_reports WHERE user_id=$1 AND submitted_at>NOW()-INTERVAL '30 days' GROUP BY DATE(submitted_at) ORDER BY report_date",[uid])
  ]);
  res.json({
    profile:ctx.profile,
    points:await getBalance(uid),
    stats:counts.rows[0],
    recent_reports:recent.rows,
    recent_transactions:tx.rows,
    featured_rewards:rewards.rows,
    unread_notifications:unread.rows[0]?.n||0,
    activity:activity.rows
  });
}