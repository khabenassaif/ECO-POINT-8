import { db, storage } from "../../../render-server/sdk.js";
import { requireAllowedUser } from "../../lib/user-access.js";

export const access="user";
export const methods=["GET"];

export default async function(req,res){
  const ctx=await requireAllowedUser(req,res); if(!ctx) return;
  const id=String(req.query?.id||"");
  const row=(await db.query(
    "SELECT r.*,c.name category,c.points FROM waste_reports r JOIN waste_categories c ON c.id=r.category_id WHERE r.id=$1 AND r.user_id=$2",
    [id,ctx.user.id]
  )).rows[0];
  if(!row) return res.status(404).json({error:"Laporan tidak ditemukan."});
  const checks=(await db.query("SELECT check_type,passed,details,created_at FROM automated_checks WHERE report_id=$1 ORDER BY created_at",[id])).rows;
  const photo_url=await storage.url(row.photo_key,{ttl:300});
  res.json({report:{...row,photo_url},automated_checks:checks});
}