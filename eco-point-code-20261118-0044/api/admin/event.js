import { db } from "../../../render-server/sdk.js";
import { requireEcoAdmin } from "../../lib/admin-access.js";
export const access="public";
export const methods=["GET","PUT"];
export default async function(req,res){
 if(!await requireEcoAdmin(req,res))return;
 res.setHeader("Cache-Control","private, no-store");
 if(req.method==="GET"){
  const config=(await db.query("SELECT * FROM eco_contest WHERE id=1")).rows[0];
  const leaderboard=(await db.query("SELECT * FROM eco_contest_leaderboard()")).rows.slice(0,30).map((r,i)=>({
    rank:i+1,full_name:r.full_name,points:Number(r.total_points),reports:Number(r.approved_reports),last_earned:r.last_earned
  }));
  return res.json({config,leaderboard});
 }
 const title=String(req.body?.title||"Eco-Point Top 3 Challenge").trim().slice(0,120);
 const start=new Date(req.body?.starts_at),end=new Date(req.body?.ends_at),announce=new Date(req.body?.announcement_at);
 const valid=[start,end,announce].every(d=>Number.isFinite(d.getTime()))&&start<end&&end<announce;
 if(!valid)return res.status(400).json({error:"Tanggal harus valid: mulai sebelum berakhir, dan pengumuman setelah berakhir."});
 if(end-start>366*86400000)return res.status(400).json({error:"Periode maksimal 366 hari."});
 const changed=(await db.query("UPDATE eco_contest SET title=$1,starts_at=$2,ends_at=$3,announcement_at=$4,updated_at=NOW() WHERE id=1 RETURNING *",
   [title||"Eco-Point Top 3 Challenge",start.toISOString(),end.toISOString(),announce.toISOString()])).rows[0];
 return res.json({ok:true,config:changed});
}