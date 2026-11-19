import { db } from "../../../render-server/sdk.js";
import { requireEcoAdmin } from "../../lib/admin-access.js";

export const access="public";
export const methods=["GET","PUT"];

export default async function(req,res){
  if(!await requireEcoAdmin(req,res)) return;
  if(req.method==="GET"){
    const rows=(await db.query("SELECT x.id,x.user_id,x.points_cost,x.status,x.created_at,x.updated_at,r.name reward_name,p.full_name,p.email FROM redemptions x JOIN rewards r ON r.id=x.reward_id JOIN eco_profiles p ON p.user_id=x.user_id ORDER BY CASE x.status WHEN 'pending' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END,x.created_at DESC LIMIT 200")).rows;
    return res.json({redemptions:rows});
  }
  const id=String(req.body?.id||""), next=String(req.body?.status||"");
  const row=(await db.query("SELECT x.*,r.name reward_name FROM redemptions x JOIN rewards r ON r.id=x.reward_id WHERE x.id=$1",[id])).rows[0];
  if(!row) return res.status(404).json({error:"Redemption tidak ditemukan."});
  const allowed={pending:["ready","cancelled"],ready:["collected","cancelled"],collected:[],cancelled:[]};
  if(!(allowed[row.status]||[]).includes(next)) return res.status(409).json({error:"Perubahan status tidak diizinkan."});
  const wheel=(await db.query("SELECT id FROM wheel_spins WHERE redemption_id=$1",[id])).rows[0];
  const statements=[
    {sql:"UPDATE redemptions SET status=$2,updated_at=NOW() WHERE id=$1 AND status=$3",params:[id,next,row.status]}
  ];
  if(next==="cancelled"){
    statements.push({sql:"UPDATE rewards SET stock=stock+1,updated_at=NOW() WHERE id=$1",params:[row.reward_id]});
    if(wheel){
      statements.push(
        {sql:"INSERT INTO spin_vouchers (user_id,purchase_key) VALUES ($1,$2) ON CONFLICT (user_id,purchase_key) DO NOTHING",params:[row.user_id,"cancelled-spin-"+id]},
        {sql:"INSERT INTO notifications (user_id,title,body,type) VALUES ($1,$2,$3,$4)",params:[row.user_id,"Penukaran spin dibatalkan","Satu voucher Spin Wheel pengganti sudah diberikan. Poin tidak dipotong lagi.","redemption_cancelled"]}
      );
    }else{
      statements.push(
        {sql:"INSERT INTO point_transactions (user_id,type,points,redemption_id,reason) VALUES ($1,'refund',$2,$3,$4)",params:[row.user_id,Number(row.points_cost),id,"Pengembalian poin pembatalan "+row.reward_name]},
        {sql:"INSERT INTO notifications (user_id,title,body,type) VALUES ($1,$2,$3,$4)",params:[row.user_id,"Penukaran dibatalkan","Poin Anda telah dikembalikan.","redemption_cancelled"]}
      );
    }
  } else if(next==="ready"){
    statements.push({sql:"INSERT INTO notifications (user_id,title,body,type) VALUES ($1,$2,$3,$4)",params:[row.user_id,"Merchandise siap diambil",row.reward_name+" sudah siap diambil.","redemption_ready"]});
  } else if(next==="collected"){
    statements.push({sql:"INSERT INTO notifications (user_id,title,body,type) VALUES ($1,$2,$3,$4)",params:[row.user_id,"Merchandise telah diambil","Pengambilan "+row.reward_name+" telah dikonfirmasi.","redemption_collected"]});
  }
  await db.transaction(statements);
  res.json({ok:true,status:next});
}