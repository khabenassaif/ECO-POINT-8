import { db } from "../../../render-server/sdk.js";
import { requireAllowedUser } from "../../lib/user-access.js";

export const access = "user";
export const methods = ["GET","PUT"];

export default async function(req,res){
  const ctx=await requireAllowedUser(req,res); if(!ctx) return;
  if(req.method==="GET") return res.json({profile:ctx.profile});
  const fullName=String(req.body?.full_name||"").trim().slice(0,160);
  const studentId=String(req.body?.student_id||"").trim().slice(0,80)||null;
  if(fullName.length<2) return res.status(400).json({error:"Nama minimal 2 karakter."});
  const r=await db.query("UPDATE eco_profiles SET full_name=$2,student_id=$3,updated_at=NOW() WHERE user_id=$1 RETURNING *",[ctx.user.id,fullName,studentId]);
  res.json({profile:r.rows[0]});
}