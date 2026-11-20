import { db } from "../../../render-server/sdk.js";
export const access="public";
export const methods=["GET"];
const prizes=[
 {place:1,name:"Mouse JETE MO106",image:"/images/jete-mouse.webp",label:"JUARA 1"},
 {place:2,name:"Earphone JETE Eazy 3",image:"/images/jete-earphone.webp",label:"JUARA 2"},
 {place:3,name:"Mousepad JETE",image:"/images/jete-mousepad.webp",label:"JUARA 3"}
];
function alias(name,number){
 const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
 const first=(parts[0]||"Peserta").slice(0,16);
 return first+(parts.length>1?" "+parts[1][0].toUpperCase()+".":"")+" #"+String(number).padStart(2,"0");
}
export default async function(req,res){
 res.setHeader("Cache-Control","public, max-age=20");
 const config=(await db.query("SELECT title,starts_at,ends_at,announcement_at FROM eco_contest WHERE id=1")).rows[0];
 if(!config)return res.status(503).json({error:"Periode kompetisi belum diatur."});
 const rankings=(await db.query("SELECT * FROM eco_contest_leaderboard()")).rows;
 const now=Date.now(), start=new Date(config.starts_at).getTime(),end=new Date(config.ends_at).getTime(),announce=new Date(config.announcement_at).getTime();
 const phase=now<start?"upcoming":now<=end?"active":now<announce?"closed":"announced";
 const leaderboard=rankings.slice(0,20).map((r,i)=>({
  rank:i+1,name:alias(r.full_name,i+1),points:Number(r.total_points)||0,reports:Number(r.approved_reports)||0
 }));
 return res.json({title:config.title,starts_at:config.starts_at,ends_at:config.ends_at,announcement_at:config.announcement_at,
  phase,server_now:new Date().toISOString(),prizes,leaderboard,
  total_participants:rankings.length,winners_revealed:phase==="announced",rules:{counted:"approved report rewards during competition",ties:"points, approved reports, earliest last point, stable ID"}});
}