import { db } from "hatchable";
import { requireEcoAdmin } from "lib/admin-access.js";
export const access="public";
export const methods=["GET"];
export default async function(req,res){
 if(!await requireEcoAdmin(req,res))return;
 res.setHeader("Cache-Control","private, no-store");
 const response=await db.query("SELECT eco_admin_dashboard_snapshot() AS result");
 const data=response.rows?.[0]?.result;
 const result=typeof data==="string"?JSON.parse(data):data;
 if(!result)return res.status(500).json({error:"Data dashboard admin belum tersedia."});
 return res.json(result);
}