import { db, storage } from "../../../render-server/sdk.js";
import { requireEcoAdmin } from "../../lib/admin-access.js";
import crypto from "node:crypto";

export const access="public";
export const methods=["GET","POST","PUT","DELETE"];

const txt=(v,n=500)=>String(v??"").trim().slice(0,n);
const num=v=>Number(v);
const bool=v=>v===true||v==="true"||v==="on";

export default async function(req,res){
  if(!await requireEcoAdmin(req,res)) return;
  if(req.method==="GET"){
    const [domains,categories,locations,rewards,students,transactions]=await Promise.all([
      db.query("SELECT domain,created_at FROM allowed_email_domains ORDER BY domain"),
      db.query("SELECT * FROM waste_categories ORDER BY name"),
      db.query("SELECT * FROM waste_bins ORDER BY name"),
      db.query("SELECT * FROM rewards ORDER BY created_at DESC"),
      db.query("SELECT p.user_id,p.full_name,p.email,p.student_id,p.created_at,COALESCE(SUM(t.points),0)::int points FROM eco_profiles p LEFT JOIN point_transactions t ON t.user_id=p.user_id GROUP BY p.user_id ORDER BY p.created_at DESC LIMIT 200"),
      db.query("SELECT t.*,p.full_name FROM point_transactions t LEFT JOIN eco_profiles p ON p.user_id=t.user_id ORDER BY t.created_at DESC LIMIT 200")
    ]);
    return res.json({domains:domains.rows,categories:categories.rows,locations:locations.rows,rewards:rewards.rows,students:students.rows,transactions:transactions.rows});
  }
  const type=txt(req.body?.type,30);
  if(type==="domain"){
    const domain=txt(req.body?.domain,180).toLowerCase().replace(/^@/,"");
    if(!domain||!domain.includes(".")) return res.status(400).json({error:"Domain tidak valid."});
    if(req.method==="POST"){
      await db.query("INSERT INTO allowed_email_domains (domain) VALUES ($1) ON CONFLICT DO NOTHING",[domain]);
      return res.json({ok:true});
    }
    if(req.method==="DELETE"){
      await db.query("DELETE FROM allowed_email_domains WHERE domain=$1",[domain]);
      return res.json({ok:true});
    }
  }
  if(type==="category"){
    const id=txt(req.body?.id,80), name=txt(req.body?.name,160), description=txt(req.body?.description,1200)||null, points=Math.max(0,Math.round(num(req.body?.points)||0)), active=bool(req.body?.is_active);
    if(!name) return res.status(400).json({error:"Nama kategori wajib."});
    if(points<5||points>10) return res.status(400).json({error:"Poin per kategori sampah harus antara 5 dan 10."});
    if(req.method==="POST"){
      const x=await db.query("INSERT INTO waste_categories (name,description,points,is_active) VALUES ($1,$2,$3,$4) RETURNING *",[name,description,points,active]); return res.status(201).json({item:x.rows[0]});
    }
    if(req.method==="PUT"){
      const x=await db.query("UPDATE waste_categories SET name=$2,description=$3,points=$4,is_active=$5 WHERE id=$1 RETURNING *",[id,name,description,points,active]); return res.json({item:x.rows[0]});
    }
  }
  if(type==="location"){
    const id=txt(req.body?.id,80), name=txt(req.body?.name,160), description=txt(req.body?.description,1200)||null, lat=num(req.body?.latitude), lng=num(req.body?.longitude), active=bool(req.body?.is_active);
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180) return res.status(400).json({error:"Nama dan koordinat lokasi wajib valid."});
    if(req.method==="POST"){
      const x=await db.query("INSERT INTO waste_bins (name,description,latitude,longitude,is_active) VALUES ($1,$2,$3,$4,$5) RETURNING *",[name,description,lat,lng,active]); return res.status(201).json({item:x.rows[0]});
    }
    if(req.method==="PUT"){
      const x=await db.query("UPDATE waste_bins SET name=$2,description=$3,latitude=$4,longitude=$5,is_active=$6 WHERE id=$1 RETURNING *",[id,name,description,lat,lng,active]); return res.json({item:x.rows[0]});
    }
  }
  if(type==="reward"){
    const id=txt(req.body?.id,80), name=txt(req.body?.name,180), description=txt(req.body?.description,1600)||null, category=txt(req.body?.category,80)||"merchandise", pickup=txt(req.body?.pickup_instructions,1200)||null, cost=Math.round(num(req.body?.point_cost)||0), stock=Math.round(num(req.body?.stock)||0), active=bool(req.body?.is_active);
    if(!name||cost<=0||stock<0) return res.status(400).json({error:"Nama, harga poin, dan stok harus valid."});
    let imageKey=req.body?.image_key?txt(req.body.image_key,500):null;
    const file=(req.files||[]).find(f=>f.field==="image");
    if(file){
      if(!["image/jpeg","image/png","image/webp"].includes(file.contentType)) return res.status(415).json({error:"Format gambar reward tidak didukung."});
      const ext=file.contentType==="image/png"?"png":file.contentType==="image/webp"?"webp":"jpg";
      imageKey=`rewards/${crypto.randomUUID()}.${ext}`;
      await storage.put(imageKey,file.buffer,file.contentType);
    }
    if(req.method==="POST"){
      const x=await db.query("INSERT INTO rewards (name,description,image_key,point_cost,stock,is_active,category,pickup_instructions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[name,description,imageKey,cost,stock,active,category,pickup]); return res.status(201).json({item:x.rows[0]});
    }
    if(req.method==="PUT"){
      const x=await db.query("UPDATE rewards SET name=$2,description=$3,image_key=COALESCE($4,image_key),point_cost=$5,stock=$6,is_active=$7,category=$8,pickup_instructions=$9,updated_at=NOW() WHERE id=$1 RETURNING *",[id,name,description,imageKey,cost,stock,active,category,pickup]); return res.json({item:x.rows[0]});
    }
  }
  return res.status(400).json({error:"Operasi tidak dikenali."});
}