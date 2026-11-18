import { db } from "hatchable";
import { requireAllowedUser } from "lib/user-access.js";

export const access="user";
export const methods=["GET","PUT"];

export default async function(req,res){
  const ctx=await requireAllowedUser(req,res); if(!ctx) return;
  if(req.method==="PUT"){
    const id=String(req.body?.notification_id||"");
    await db.query("UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",[id,ctx.user.id]);
  }
  const [leaders,notes,tx]=await Promise.all([
    db.query("SELECT p.user_id,p.full_name,COALESCE(pt.total_points,0)::int total_points,COALESCE(wr.approved_reports,0)::int approved_reports FROM eco_profiles p LEFT JOIN (SELECT user_id,SUM(points)::int total_points FROM point_transactions GROUP BY user_id) pt ON pt.user_id=p.user_id LEFT JOIN (SELECT user_id,COUNT(*) FILTER (WHERE status='approved')::int approved_reports FROM waste_reports GROUP BY user_id) wr ON wr.user_id=p.user_id WHERE COALESCE(pt.total_points,0)>0 ORDER BY total_points DESC,approved_reports DESC LIMIT 50"),
    db.query("SELECT id,title,body,type,is_read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[ctx.user.id]),
    db.query("SELECT id,type,points,reason,created_at FROM point_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",[ctx.user.id])
  ]);
  res.json({leaderboard:leaders.rows,notifications:notes.rows,transactions:tx.rows});
}