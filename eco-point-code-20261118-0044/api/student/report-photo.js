import { db, storage } from "hatchable";
import { requireAllowedUser } from "lib/user-access.js";

export const access="user";
export const methods=["GET"];

export default async function(req,res){
  const ctx=await requireAllowedUser(req,res); if(!ctx) return;
  const id=String(req.query?.id||"");
  const row=(await db.query("SELECT photo_key FROM waste_reports WHERE id=$1 AND user_id=$2",[id,ctx.user.id])).rows[0];
  if(!row) return res.status(404).send("Not found");
  res.setHeader("Cache-Control","private, max-age=60");
  res.redirect(302,await storage.url(row.photo_key,{ttl:120}));
}