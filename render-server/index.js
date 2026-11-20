import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, mediaSignature } from './sdk.js';
import { initializeDatabase } from './bootstrap.js';

const app=express();
const root=join(dirname(fileURLToPath(import.meta.url)),'..','eco-point-code-20261118-0044');
const publicRoot=join(root,'public');
const port=Number(process.env.PORT||10000);
const secure=process.env.NODE_ENV==='production';
const onVercel=process.env.VERCEL==='1';
const configured=Boolean(process.env.DATABASE_URL && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length>=32 && process.env.ADMIN_ACCESS_CODE);
const digest=s=>crypto.createHmac('sha256',process.env.SESSION_SECRET).update(String(s)).digest('hex');
const safeEqual=(a,b)=>{ const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length && crypto.timingSafeEqual(x,y); };
const makeToken=()=>crypto.randomBytes(32).toString('hex');
const cleanEmail=s=>String(s||'').trim().toLowerCase().slice(0,254);
const maxUpload=Math.min(25,Math.max(1,Number(process.env.MAX_UPLOAD_MB||8)))*1024*1024;
if(!onVercel && (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<32))
  throw new Error('DATABASE_URL dan SESSION_SECRET (minimal 32 karakter) wajib diisi');

app.set('trust proxy',1);
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false}));
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:false,limit:'1mb'}));
app.use(cookieParser());
// Public production launch: publish the site and catalog without exposing unfinished member/admin actions.
// Keep preview unchanged for protected end-to-end integration tests.
if(process.env.VERCEL_ENV==='production') {
  app.use(['/api/admin','/api/student','/api/auth/login'],(req,res)=>
    res.status(503).json({error:'Fitur akun, laporan, penukaran, dan admin belum dibuka untuk umum. Website informasi ECO-POINT sudah tersedia.'}));
}

// Preview may display the public site before Neon and authentication are configured.
// No mock balances, reports or login sessions are created.
if(onVercel && !configured) app.use('/api',(req,res)=>res.status(503).json({error:'ECO-POINT masih mode pratinjau: database Neon dan autentikasi belum terhubung.'}));
const multipart=multer({storage:multer.memoryStorage(),limits:{fileSize:maxUpload,files:1,fields:20}});
app.use((req,res,next)=>{
  if(['POST','PUT','PATCH','DELETE'].includes(req.method) && req.path.startsWith('/api/')){
    const origin=req.get('origin');
    if(origin) {
      try {if(new URL(origin).host!==req.get('host')) return res.status(403).json({error:'origin_not_allowed'});}
      catch {return res.status(403).json({error:'origin_not_allowed'});}
    }
  }
  next();
});
app.get('/healthz',async(req,res)=>{
  try {await db.query('SELECT 1');res.json({ok:true,service:'eco-point-render'});}
  catch {res.status(503).json({ok:false});}
});
app.use(async(req,res,next)=>{
  const raw=req.cookies?.eco_member_session;
  if(raw && /^[0-9a-f]{64}$/.test(raw)){
    try {
      const r=await db.query('SELECT a.id,a.email,a.name FROM eco_member_sessions s JOIN eco_member_accounts a ON a.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()',[digest(raw)]);
      req.user=r.rows[0]||null;
    }catch(e){return next(e);}
  }
  next();
});
async function sendLoginCode(email,code) {
  if(!process.env.EMAIL_FROM) throw Object.assign(new Error('Pengiriman email belum dikonfigurasi.'),{status:503});
  const message={from:process.env.EMAIL_FROM,to:email,subject:'Kode masuk Eco-Point',
    text:'Kode verifikasi Eco-Point: '+code+'\nBerlaku selama 10 menit. Jangan berikan kode ini kepada orang lain.'};
  if(process.env.RESEND_API_KEY){
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({...message,to:[email]}),
      signal:AbortSignal.timeout(15000)
    });
    if(!response.ok) throw Object.assign(new Error('Layanan email menolak permintaan. Periksa pengirim di Render.'),{status:503});
    return;
  }
  if(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD){
    const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),
      secure:Number(process.env.SMTP_PORT||587)===465,
      auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});
    await transport.sendMail(message);
    return;
  }
  throw Object.assign(new Error('Email belum disiapkan. Setel RESEND_API_KEY dan EMAIL_FROM di Render.'),{status:503});
}
app.get('/api/auth/session',(req,res)=>res.json({user:req.user||null}));
app.get('/api/auth/providers',(req,res)=>res.json({providers:['email']}));
app.post('/api/auth/login/start',async(req,res,next)=>{
  try{
    const email=cleanEmail(req.body?.email);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Alamat email tidak valid.'});
    const prior=(await db.query('SELECT created_at FROM eco_member_login_codes WHERE email=$1',[email])).rows[0];
    if(prior && Date.now()-new Date(prior.created_at).getTime()<60000)
      return res.status(429).json({error:'Tunggu 60 detik sebelum meminta kode baru.'});
    const code=String(crypto.randomInt(100000,1000000));
    // Send first: never publish a valid code when email delivery fails.
    await sendLoginCode(email,code);
    await db.query("INSERT INTO eco_member_login_codes (email,digest,attempts,created_at,expires_at) VALUES ($1,$2,0,NOW(),NOW()+INTERVAL '10 minutes') ON CONFLICT(email) DO UPDATE SET digest=EXCLUDED.digest,attempts=0,created_at=NOW(),expires_at=EXCLUDED.expires_at",[email,digest(email+':'+code)]);
    res.json({ok:true,has_passkey:false});
  }catch(e){next(e);}
});
app.post('/api/auth/login/verify',async(req,res,next)=>{
  try{
    const email=cleanEmail(req.body?.email),code=String(req.body?.code||'');
    if(!/^\d{6}$/.test(code))return res.status(400).json({error:'Kode harus 6 digit.'});
    const row=(await db.query('SELECT digest,attempts,expires_at FROM eco_member_login_codes WHERE email=$1',[email])).rows[0];
    if(!row || row.attempts>=5 || new Date(row.expires_at).getTime()<Date.now() || !safeEqual(row.digest,digest(email+':'+code))){
      await db.query('UPDATE eco_member_login_codes SET attempts=attempts+1 WHERE email=$1',[email]);
      return res.status(401).json({error:'Kode salah, kedaluwarsa, atau terlalu banyak percobaan.'});
    }
    // Atomically consume the code. A second attempt cannot reuse it.
    const claim=await db.query('DELETE FROM eco_member_login_codes WHERE email=$1 AND digest=$2 AND expires_at>NOW() AND attempts<5 RETURNING email',[email,row.digest]);
    if(!claim.rowCount) return res.status(401).json({error:'Kode sudah digunakan.'});
    const user=(await db.query('INSERT INTO eco_member_accounts (id,email,name) VALUES ($1,$2,$3) ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id,email,name',[crypto.randomUUID(),email,email.split('@')[0]])).rows[0];
    const token=makeToken();
    await db.query("INSERT INTO eco_member_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,NOW()+INTERVAL '14 days')",[digest(token),user.id]);
    res.cookie('eco_member_session',token,{httpOnly:true,secure,sameSite:'strict',path:'/',maxAge:14*86400000});
    res.json({user});
  }catch(e){next(e);}
});
app.post('/api/auth/logout',async(req,res,next)=>{
  try{
    const token=req.cookies?.eco_member_session;
    if(token) await db.query('DELETE FROM eco_member_sessions WHERE token_hash=$1',[digest(token)]);
    res.clearCookie('eco_member_session',{httpOnly:true,secure,sameSite:'strict',path:'/'});
    res.json({ok:true});
  }catch(e){next(e);}
});
app.get('/api/media',async(req,res,next)=>{
  try{
    const key=String(req.query.key||''),exp=Number(req.query.exp),sig=String(req.query.sig||'');
    if(!key || !Number.isSafeInteger(exp) || exp<Date.now()/1000 || exp>Date.now()/1000+900 || !safeEqual(mediaSignature(key,exp),sig))
      return res.status(403).end();
    const r=await db.query('SELECT content_type,data FROM eco_media WHERE key=$1',[key]);
    if(!r.rowCount)return res.status(404).end();
    res.set('Content-Type',r.rows[0].content_type);
    res.set('Cache-Control','private, max-age=60');
    res.send(r.rows[0].data);
  }catch(e){next(e);}
});
const apiRoutes=[
'admin/code-login','admin/manage','admin/overview','admin/redemptions','admin/report-photo','admin/reports','admin/review','admin/reward-image',
'public/catalog','public/reward-image',
'student/community','student/dashboard','student/profile','student/redeem','student/report-detail','student/report-photo','student/reports','student/rewards','student/spin-wheel','student/vouchers'
];
for(const name of apiRoutes) {
  const module=await import('../eco-point-code-20261118-0044/api/'+name+'.js');
  const route='/api/'+name;
  app.all(route,async(req,res,next)=>{
    try {
      if(module.methods && !module.methods.includes(req.method))return res.status(405).json({error:'method_not_allowed'});
      if(module.access==='user' && !req.user)return res.status(401).json({error:'unauthorized',message:'Silakan masuk ke akun Eco-Point.'});
      if(req.is('multipart/form-data')) {
        await new Promise((resolve,reject)=>multipart.any()(req,res,e=>e?reject(e):resolve()));
        req.files=(req.files||[]).map(f=>({...f,field:f.fieldname,contentType:f.mimetype}));
      }
      await module.default(req,res);
    }catch(e){next(e);}
  });
}
app.use(express.static(publicRoot,{index:false,extensions:['html'],dotfiles:'deny'}));
app.get('/login',(req,res)=>res.sendFile(join(publicRoot,'login.html')));
app.get(['/admin','/admin/'],(req,res)=>res.sendFile(join(publicRoot,'admin','index.html')));
app.get('*',(req,res)=>res.sendFile(join(publicRoot,'index.html')));
app.use((error,req,res,next)=>{
  console.error('Eco-Point API error:',error?.message||error);
  if(res.headersSent)return next(error);
  if(error instanceof multer.MulterError)return res.status(413).json({error:'Berkas terlalu besar atau jumlah berkas melebihi batas.'});
  res.status(error?.status===503?503:500).json({error:error?.status===503?error.message:'Terjadi kesalahan server. Silakan coba lagi.'});
});
if(!onVercel) {
  await initializeDatabase();
  app.listen(port,'0.0.0.0',()=>console.log('Eco-Point listening on '+port));
}
export default app;
