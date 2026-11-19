import { db, storage, config } from "../../../render-server/sdk.js";
import crypto from "node:crypto";
import { requireAllowedUser } from "../../lib/user-access.js";

export const access = "user";
export const methods = ["GET","POST"];

const MIME=new Set(["image/jpeg","image/png","image/webp"]);

function num(v){ const n=Number(v); return Number.isFinite(n)?n:null; }

export default async function(req,res){
  const ctx=await requireAllowedUser(req,res); if(!ctx) return;
  const uid=ctx.user.id;

  if(req.method==="GET"){
    const rows=await db.query(
      "SELECT r.id,r.status,r.latitude,r.longitude,r.gps_accuracy,r.submitted_at,r.reviewed_at,r.rejection_reason,c.name category,c.points FROM waste_reports r JOIN waste_categories c ON c.id=r.category_id WHERE r.user_id=$1 ORDER BY r.submitted_at DESC LIMIT 100",
      [uid]
    );
    return res.json({reports:rows.rows});
  }

  const file=(req.files||[]).find(f=>f.field==="photo");
  const categoryId=String(req.body?.category_id||"");
  const description=String(req.body?.description||"").trim().slice(0,1200);
  const notes=String(req.body?.notes||"").trim().slice(0,1200)||null;
  const latitude=num(req.body?.latitude), longitude=num(req.body?.longitude), accuracy=num(req.body?.gps_accuracy);
  const capturedAt=req.body?.location_captured_at?new Date(req.body.location_captured_at):null;
  if(description.length<3) return res.status(400).json({error:"Deskripsi aktivitas wajib diisi."});
  if(!file) return res.status(400).json({error:"Foto bukti wajib diunggah."});
  if(!MIME.has(file.contentType)) return res.status(415).json({error:"Gunakan JPG, PNG, atau WEBP."});
  const maxMb=Number((await config.get("max_upload_mb"))||8);
  if(file.buffer.length>maxMb*1024*1024) return res.status(413).json({error:`Ukuran foto maksimal ${maxMb} MB.`});
  if(latitude===null||longitude===null||latitude<-90||latitude>90||longitude<-180||longitude>180) return res.status(400).json({error:"Koordinat GPS tidak valid."});
  const cat=(await db.query("SELECT id FROM waste_categories WHERE id=$1 AND is_active=true",[categoryId])).rows[0];
  if(!cat) return res.status(400).json({error:"Kategori sampah tidak tersedia."});

  const hash=crypto.createHash("sha256").update(file.buffer).digest("hex");
  const [duplicate,recentCount]=await Promise.all([
    db.query("SELECT COUNT(*)::int n FROM waste_reports WHERE user_id=$1 AND photo_hash=$2",[uid,hash]),
    db.query("SELECT COUNT(*)::int n FROM waste_reports WHERE user_id=$1 AND submitted_at>NOW()-INTERVAL '1 hour'",[uid])
  ]);
  const ext=file.contentType==="image/png"?"png":file.contentType==="image/webp"?"webp":"jpg";
  const reportId=crypto.randomUUID();
  const key=`reports/${uid}/${reportId}.${ext}`;
  await storage.put(key,file.buffer,file.contentType);

  const r=await db.query(
    "INSERT INTO waste_reports (id,user_id,category_id,photo_key,photo_content_type,photo_bytes,photo_hash,latitude,longitude,gps_accuracy,location_captured_at,description,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_admin') RETURNING id,status,submitted_at",
    [reportId,uid,categoryId,key,file.contentType,file.buffer.length,hash,latitude,longitude,accuracy,capturedAt&&Number.isFinite(capturedAt.getTime())?capturedAt.toISOString():null,description,notes]
  );
  const checks=[
    ["required_fields",true,"Field wajib lengkap"],
    ["file_type",true,file.contentType],
    ["file_size",true,`${file.buffer.length} bytes`],
    ["gps_range",true,`${latitude},${longitude}`],
    ["duplicate_photo",Number(duplicate.rows[0]?.n||0)===0,Number(duplicate.rows[0]?.n||0)?"Hash foto pernah digunakan":"Tidak ditemukan duplikasi"],
    ["frequency",Number(recentCount.rows[0]?.n||0)<6,`${recentCount.rows[0]?.n||0} laporan dalam 1 jam terakhir`]
  ];
  for(const c of checks){
    await db.query("INSERT INTO automated_checks (report_id,check_type,passed,details) VALUES ($1,$2,$3,$4)",[reportId,c[0],c[1],c[2]]);
  }
  await db.query("INSERT INTO notifications (user_id,title,body,type) VALUES ($1,$2,$3,$4)",[uid,"Laporan berhasil dikirim","Laporan Anda masuk antrean verifikasi administrator.","report_submitted"]);
  res.status(201).json({report:r.rows[0],automated_checks:checks.map(c=>({type:c[0],passed:c[1],details:c[2]}))});
}