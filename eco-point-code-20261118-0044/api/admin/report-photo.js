import { db, storage } from "../../../render-server/sdk.js";
import { requireEcoAdmin } from "../../lib/admin-access.js";
export const access="public";
export const methods=["GET"];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function(req,res){
 if(!await requireEcoAdmin(req,res))return;
 const id=String(req.query?.id||"");
 if(!UUID.test(id))return res.status(400).send("ID foto tidak valid.");
 const response=await db.query("SELECT eco_admin_report_detail($1::uuid) AS result",[id]);
 const data=response.rows?.[0]?.result;
 const detail=typeof data==="string"?JSON.parse(data):data;
 if(!detail?.report?.photo_key)return res.status(404).send("Foto tidak ditemukan.");
 res.setHeader("Cache-Control","private, no-store");
 return res.redirect(302,await storage.url(detail.report.photo_key,{ttl:120}));
}