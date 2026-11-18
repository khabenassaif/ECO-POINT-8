import { db } from "hatchable";
import crypto from "node:crypto";
import { requireAllowedUser, getBalance } from "lib/user-access.js";

export const access="user";
export const methods=["GET","POST"];
const COST=150;

export default async function(req,res){
 const ctx=await requireAllowedUser(req,res); if(!ctx) return;
 const uid=ctx.user.id;
 if(req.method==="GET"){
  const [balance,v]=await Promise.all([
   getBalance(uid),
   db.query("SELECT id,status,created_at,used_at FROM spin_vouchers WHERE user_id=$1 ORDER BY created_at DESC",[uid])
  ]);
  return res.json({points:balance,cost:COST,available:v.rows.filter(x=>x.status==="available").length,vouchers:v.rows});
 }
 const key=String(req.body?.idempotency_key||"").trim().slice(0,120);
 if(!key) return res.status(400).json({error:"Kunci transaksi wajib diisi."});
 const prior=(await db.query("SELECT id,status,created_at FROM spin_vouchers WHERE user_id=$1 AND purchase_key=$2",[uid,key])).rows[0];
 if(prior) return res.json({voucher:prior,idempotent:true});
 if(await getBalance(uid)<COST) return res.status(409).json({error:"Poin belum cukup untuk voucher Spin Wheel (150 poin)."});
 const id=crypto.randomUUID();
 try{
  await db.transaction([
   {sql:"UPDATE eco_profiles SET updated_at=NOW() WHERE user_id=$1",params:[uid]},
   {sql:"INSERT INTO spin_vouchers (id,user_id,purchase_key) VALUES ($1,$2,$3)",params:[id,uid,key]},
   {sql:"INSERT INTO point_transactions (user_id,type,points,reason) VALUES ($1,'redemption',$2,$3)",params:[uid,-COST,"Pembelian 1 voucher Spin Wheel"]},
   {sql:"SELECT CASE WHEN (SELECT COALESCE(SUM(points),0) FROM point_transactions WHERE user_id=$1)>=0 THEN 1 ELSE 1/0 END",params:[uid]},
   {sql:"INSERT INTO notifications (user_id,title,body,type) VALUES ($1,$2,$3,$4)",params:[uid,"Voucher Spin Wheel tersedia","1 voucher berhasil dibeli dengan 150 Eco-Points. Kamu bisa memutar roda hadiah.","spin_voucher"]}
  ]);
  return res.status(201).json({voucher:{id,status:"available"},cost:COST});
 }catch(e){
  const again=(await db.query("SELECT id,status FROM spin_vouchers WHERE user_id=$1 AND purchase_key=$2",[uid,key])).rows[0];
  if(again) return res.json({voucher:again,idempotent:true});
  return res.status(409).json({error:"Voucher gagal dibuat. Periksa saldo poin dan coba lagi."});
 }
}