import { db } from "hatchable";
import crypto from "node:crypto";
import { requireAllowedUser } from "lib/user-access.js";

export const access="user";
export const methods=["GET","POST"];

export default async function(req,res){
 const ctx=await requireAllowedUser(req,res); if(!ctx)return;
 const uid=ctx.user.id;
 if(req.method==="GET"){
  const rows=(await db.query("SELECT x.id,x.status,x.points_cost,x.created_at,x.updated_at,r.name reward_name,r.category,r.pickup_instructions FROM redemptions x JOIN rewards r ON r.id=x.reward_id WHERE x.user_id=$1 ORDER BY x.created_at DESC",[uid])).rows;
  return res.json({redemptions:rows});
 }
 const rewardId=String(req.body?.reward_id||"");
 const idem=String(req.body?.idempotency_key||"").trim().slice(0,120);
 if(!idem)return res.status(400).json({error:"idempotency_key wajib."});
 const prior=(await db.query("SELECT * FROM redemptions WHERE user_id=$1 AND idempotency_key=$2",[uid,idem])).rows[0];
 if(prior)return res.json({redemption:prior,idempotent:true});
 const reward=(await db.query("SELECT * FROM rewards WHERE id=$1 AND is_active=true",[rewardId])).rows[0];
 if(!reward)return res.status(404).json({error:"Reward tidak tersedia."});
 if(reward.category==="spin_wheel")return res.status(409).json({error:"Hadiah ini hanya bisa didapat melalui voucher dan Spin Wheel."});
 if(Number(reward.stock)<=0)return res.status(409).json({error:"Stok habis."});
 const balance=(await db.query("SELECT COALESCE(SUM(points),0)::int AS balance FROM point_transactions WHERE user_id=$1",[uid])).rows[0];
 if(Number(balance?.balance||0)<Number(reward.point_cost))return res.status(409).json({error:"Poin tidak mencukupi."});
 const rid=crypto.randomUUID();
 try{
  await db.transaction([
   {sql:"UPDATE rewards SET stock=stock-1,updated_at=NOW() WHERE id=$1",params:[rewardId]},
   {sql:"INSERT INTO redemptions (id,user_id,reward_id,points_cost,status,idempotency_key) VALUES ($1,$2,$3,$4,'pending',$5)",params:[rid,uid,rewardId,Number(reward.point_cost),idem]},
   {sql:"INSERT INTO point_transactions (user_id,type,points,redemption_id,reason) VALUES ($1,'redemption',$2,$3,$4)",params:[uid,-Number(reward.point_cost),rid,"Penukaran "+reward.name]},
   {sql:"SELECT CASE WHEN (SELECT COALESCE(SUM(points),0) FROM point_transactions WHERE user_id=$1) >= 0 THEN 1 ELSE 1/0 END",params:[uid]},
   {sql:"INSERT INTO notifications (user_id,title,body,type) VALUES ($1,$2,$3,$4)",params:[uid,"Penukaran dibuat","Permintaan penukaran "+reward.name+" sedang diproses.","redemption_created"]}
  ]);
  return res.status(201).json({redemption:{id:rid,status:"pending",points_cost:Number(reward.point_cost)}});
 }catch(e){
  const again=(await db.query("SELECT * FROM redemptions WHERE user_id=$1 AND idempotency_key=$2",[uid,idem])).rows[0];
  if(again)return res.json({redemption:again,idempotent:true});
  return res.status(409).json({error:"Penukaran gagal. Poin atau stok mungkin sudah berubah."});
 }
}