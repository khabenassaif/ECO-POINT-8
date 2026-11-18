import { db } from "hatchable";
import { adminSession, getAdminCookie, sha256, hex } from "lib/admin-access.js";
export const access="public";
export const methods=["GET","POST","DELETE"];
const encoder=new TextEncoder();
const secureRandom=()=>{const b=new Uint8Array(32);crypto.getRandomValues(b);return hex(b)};
function setCookie(res,value,ttl){res.setHeader("Set-Cookie","eco_admin_session="+value+"; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age="+ttl)}
function clientKey(req){
 const headers=req.headers||{};
 const ip=String(headers["cf-connecting-ip"]||headers["x-real-ip"]||headers["x-forwarded-for"]||"unknown").split(",")[0].trim().slice(0,100);
 return ip||"unknown";
}
async function checkCode(entered,saltHex,expectedHex,iterations){
 const salt=Uint8Array.from(saltHex.match(/.{2}/g),v=>parseInt(v,16));
 const key=await crypto.subtle.importKey("raw",encoder.encode(entered),"PBKDF2",false,["deriveBits"]);
 const bits=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations,hash:"SHA-256"},key,256));
 const actual=hex(bits);let diff=actual.length^expectedHex.length;
 for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expectedHex.charCodeAt(i);
 return diff===0;
}
export default async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method==="GET")return res.json({authenticated:!!(await adminSession(req))});
 if(req.method==="DELETE"){
  const token=getAdminCookie(req);
  if(token)await db.query("UPDATE eco_admin_code_sessions SET revoked_at=NOW() WHERE token_hash=$1",[await sha256(token)]);
  setCookie(res,"",0);return res.json({ok:true});
 }
 const username=String(req.body?.username||"").trim().replace(/[<>\x00-\x1F]/g,"").slice(0,48);
 const code=String(req.body?.passkey||"");
 if(!username||username.length<2||!code||code.length>150)return res.status(400).json({error:"Isi username (minimal 2 karakter) dan kode akses admin."});
 const client=await sha256(clientKey(req));
 const attempts=(await db.query("SELECT COUNT(*)::int AS count FROM eco_admin_login_attempts WHERE client_key=$1 AND success=false AND created_at>NOW()-INTERVAL '15 minutes'",[client])).rows[0];
 if(Number(attempts?.count||0)>=6)return res.status(429).json({error:"Terlalu banyak percobaan login. Coba lagi setelah 15 menit."});
 const credential=(await db.query("SELECT salt_hex,verifier_hex,iterations FROM eco_admin_credentials WHERE id=1")).rows[0];
 if(!credential)return res.status(503).json({error:"Akses admin belum siap."});
 const ok=await checkCode(code,credential.salt_hex,credential.verifier_hex,Number(credential.iterations));
 await db.query("INSERT INTO eco_admin_login_attempts(client_key,success) VALUES ($1,$2)",[client,ok]);
 if(!ok)return res.status(401).json({error:"Kode akses tidak sesuai."});
 const token=secureRandom(),ttl=8*60*60;
 await db.query("INSERT INTO eco_admin_code_sessions(token_hash,username,expires_at) VALUES ($1,$2,NOW()+INTERVAL '8 hours')",[await sha256(token),username]);
 setCookie(res,token,ttl);
 return res.json({ok:true,username,expires_in_seconds:ttl});
}