import { db } from "hatchable";
const encoder=new TextEncoder();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
const sha256=async value=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(String(value)))));
export function getAdminCookie(req){
 const cookies=String(req.headers?.cookie||req.headers?.Cookie||"");
 return cookies.split(";").map(x=>x.trim()).find(x=>x.startsWith("eco_admin_session="))?.slice("eco_admin_session=".length)||"";
}
export async function adminSession(req){
 const token=getAdminCookie(req);
 if(!/^[0-9a-f]{64}$/.test(token))return null;
 const row=(await db.query("SELECT username FROM eco_admin_code_sessions WHERE token_hash=$1 AND expires_at>NOW() AND revoked_at IS NULL",[await sha256(token)])).rows[0];
 return row||null;
}
export async function requireEcoAdmin(req,res){
 const session=await adminSession(req);
 if(!session){res.status(401).json({error:"Sesi admin tidak ada atau sudah berakhir. Masuk dengan kode akses admin.",code:"admin_code_required"});return false}
 req.ecoAdminUsername=session.username;
 return true;
}
export { sha256,hex };