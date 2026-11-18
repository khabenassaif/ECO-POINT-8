import { db, storage } from "hatchable";

export const access="public";
export const methods=["GET"];

export default async function(req,res){
  const id=String(req.query?.id||"");
  const row=(await db.query("SELECT image_key FROM rewards WHERE id=$1 AND is_active=true",[id])).rows[0];
  if(!row?.image_key) return res.status(404).send("No image");
  res.setHeader("Cache-Control","public, max-age=300");
  res.redirect(302,await storage.url(row.image_key,{ttl:300}));
}