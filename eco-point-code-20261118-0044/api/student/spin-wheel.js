import { db } from "hatchable";
import crypto from "node:crypto";
import { requireAllowedUser } from "lib/user-access.js";

export const access="user";
export const methods=["GET","POST"];
const PRIZES=[
 "Gantungan Kunci Eco-Point","Sedotan Stainless Steel",
 "Pembatas Buku Kertas Daur Ulang","Pin atau Badge Eco-Point",
 "Sachet Benih Tanaman","Pensil Ramah Lingkungan",
 "Magnet dari Material Daur Ulang","Paket Stiker Edukasi Lingkungan"
];
async function prizeList(){
 const rows=(await db.query("SELECT id,name,stock,description FROM rewards WHERE category='spin_wheel' AND is_active=true")).rows;
 return PRIZES.map(name=>rows.find(x=>x.name===name)).filter(Boolean);
}
async function alreadySpun(uid,voucher){
 return (await db.query("SELECT s.id,s.voucher_id,s.reward_id,s.redemption_id,r.name reward_name,x.status FROM wheel_spins s JOIN rewards r ON r.id=s.reward_id JOIN redemptions x ON x.id=s.redemption_id WHERE s.user_id=$1 AND s.voucher_id=$2",[uid,voucher])).rows[0];
}
export default async function(req,res){
 const ctx=await requireAllowedUser(req,res);if(!ctx)return;
 const uid=ctx.user.id;
 if(req.method==="GET"){
  const [rewards,v,history]=await Promise.all([
   prizeList(),
   db.query("SELECT id,status,created_at FROM spin_vouchers WHERE user_id=$1 ORDER BY created_at,id",[uid]),
   db.query("SELECT s.id,s.voucher_id,s.redemption_id,s.created_at,r.name AS reward_name,x.status FROM wheel_spins s JOIN rewards r ON r.id=s.reward_id JOIN redemptions x ON x.id=s.redemption_id WHERE s.user_id=$1 ORDER BY s.created_at DESC LIMIT 20",[uid])
  ]);
  return res.json({rewards,available_vouchers:v.rows.filter(x=>x.status==="available").length,vouchers:v.rows,history:history.rows});
 }
 const voucher=String(req.body?.voucher_id||"").trim().slice(0,80);
 if(!/^[0-9a-f-]{36}$/i.test(voucher)) return res.status(400).json({error:"Voucher tidak valid."});
 const existing=await alreadySpun(uid,voucher);
 if(existing) return res.json({result:existing,idempotent:true});
 const owned=(await db.query("SELECT id FROM spin_vouchers WHERE id=$1 AND user_id=$2 AND status='available'",[voucher,uid])).rows[0];
 if(!owned) return res.status(409).json({error:"Voucher sudah digunakan atau tidak tersedia."});
 const prizes=(await prizeList()).filter(r=>Number(r.stock)>0);
 if(!prizes.length) return res.status(409).json({error:"Semua hadiah sedang kosong. Voucher kamu tetap tersimpan."});
 const bound=Math.floor(4294967296/prizes.length)*prizes.length;
 let random;
 do { random=globalThis.crypto.getRandomValues(new Uint32Array(1))[0]; } while(random>=bound);
 const prize=prizes[random%prizes.length];
 const spinId=crypto.randomUUID(),redemptionId=crypto.randomUUID();
 try{
  await db.transaction([
   {sql:"UPDATE spin_vouchers SET status='used',used_at=NOW() WHERE id=$1 AND user_id=$2 AND status='available'",params:[voucher,uid]},
   {sql:"SELECT CASE WHEN (SELECT status FROM spin_vouchers WHERE id=$1 AND user_id=$2)='used' THEN 1 ELSE 1/0 END",params:[voucher,uid]},
   {sql:"UPDATE rewards SET stock=stock-1,updated_at=NOW() WHERE id=$1",params:[prize.id]},
   {sql:"INSERT INTO redemptions (id,user_id,reward_id,points_cost,status,idempotency_key) VALUES ($1,$2,$3,150,'pending',$4)",params:[redemptionId,uid,prize.id,"wheel-"+voucher]},
   {sql:"INSERT INTO wheel_spins (id,user_id,voucher_id,reward_id,redemption_id) VALUES ($1,$2,$3,$4,$5)",params:[spinId,uid,voucher,prize.id,redemptionId]},
   {sql:"INSERT INTO notifications (user_id,title,body,type) VALUES ($1,$2,$3,$4)",params:[uid,"Yeay! Kamu mendapat hadiah",prize.name+". Lihat status pengambilan di halaman Penukaran.","wheel_win"]}
  ]);
  return res.status(201).json({result:{id:spinId,reward_id:prize.id,redemption_id:redemptionId,reward_name:prize.name,voucher_id:voucher,status:"pending"}});
 }catch(e){
  const previous=await alreadySpun(uid,voucher);
  if(previous) return res.json({result:previous,idempotent:true});
  return res.status(409).json({error:"Spin tidak berhasil. Voucher aman dan belum digunakan jika transaksi dibatalkan. Silakan coba lagi."});
 }
}