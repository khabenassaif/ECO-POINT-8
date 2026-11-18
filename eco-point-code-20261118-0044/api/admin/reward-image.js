import { db, storage } from "hatchable";
import { requireEcoAdmin } from "lib/admin-access.js";

export const access="public";
export const methods=["GET"];

export default async function(req,res){
  if(!await requireEcoAdmin(req,res)) return;
  const id=String(req.query?.id||"");
  const row=(await db.query("SELECT image_key FROM rewards WHERE id=$1",[id])).rows[0];
  if(!row?.image_key) return res.status(404).send("No image");
  res.redirect(302,await storage.url(row.image_key,{ttl:300}));
}