import { db, storage } from "hatchable";
import { requireEcoAdmin } from "lib/admin-access.js";

export const access="public";
export const methods=["GET"];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unpack=value=>typeof value==="string"?JSON.parse(value):value;
export default async function(req,res){
 if(!await requireEcoAdmin(req,res))return;
 res.setHeader("Cache-Control","private, no-store");
 const id=String(req.query?.id||"").trim();
 if(id){
  if(!UUID.test(id))return res.status(400).json({error:"ID laporan tidak valid."});
  const result=await db.query("SELECT eco_admin_report_detail($1::uuid) AS result",[id]);
  const data=unpack(result.rows?.[0]?.result);
  if(!data?.report)return res.status(404).json({error:"Laporan tidak ditemukan."});
  const url=await storage.url(data.report.photo_key,{ttl:300});
  return res.json({...data,report:{...data.report,photo_url:url}});
 }
 const response=await db.query("SELECT eco_admin_report_feed() AS result");
 const data=unpack(response.rows?.[0]?.result)||{};
 return res.json({
  reports:Array.isArray(data.reports)?data.reports:[],
  total_count:Number(data.total_count)||0,
  pending_count:Number(data.pending_count)||0,
  approved_count:Number(data.approved_count)||0,
  rejected_count:Number(data.rejected_count)||0,
  latest_pending_at:data.latest_pending_at||null
 });
}