import crypto from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(crypto.scrypt);
const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length<=254;
const validPassword = password => typeof password==='string' && password.length>=10 && password.length<=128;
async function hashPassword(password) {
  const salt=crypto.randomBytes(16).toString('hex');
  const value=await scrypt(password,Buffer.from(salt,'hex'),64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return 'scrypt:v1:'+salt+':'+Buffer.from(value).toString('hex');
}
async function verifyPassword(password,record) {
  if(!record || !/^scrypt:v1:[0-9a-f]{32}:[0-9a-f]{128}$/.test(record))return false;
  const [, ,salt,expected]=record.split(':');
  const value=await scrypt(password,Buffer.from(salt,'hex'),64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return crypto.timingSafeEqual(Buffer.from(value),Buffer.from(expected,'hex'));
}
export function registerPasswordAuth(app,{db,digest,makeToken,secure,cleanEmail}) {
  function clientKey(req){return digest('pw-rate:'+String(req.ip||'unknown'));}
  async function logAttempt(email,ip,action,success) {
    await db.query('INSERT INTO eco_member_auth_attempts(email,client_key,action,success) VALUES($1,$2,$3,$4)',[email,ip,action,success]);
  }
  async function createSession(res,user) {
    const token=makeToken();
    await db.query("INSERT INTO eco_member_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '14 days')",[digest(token),user.id]);
    res.cookie('eco_member_session',token,{httpOnly:true,secure,sameSite:'strict',path:'/',maxAge:14*86400000});
    res.setHeader('Cache-Control','no-store');
  }
  app.post('/api/auth/password/register',async(req,res,next)=>{
    try {
      const email=cleanEmail(req.body?.email),name=String(req.body?.name||'').trim().slice(0,120),password=req.body?.password;
      if(!validEmail(email)||name.length<2||!validPassword(password))return res.status(400).json({error:'Isi nama minimal 2 karakter, email valid, dan kata sandi 10–128 karakter.'});
      const ip=clientKey(req);
      const count=await db.query("SELECT COUNT(*)::int n FROM eco_member_auth_attempts WHERE client_key=$1 AND action='register' AND created_at>NOW()-INTERVAL '1 hour'",[ip]);
      if(Number(count.rows[0]?.n||0)>=15)return res.status(429).json({error:'Batas pendaftaran tercapai. Coba lagi nanti.'});
      // Respect institutional domain restrictions configured in the admin area.
      const domains=await db.query('SELECT domain FROM allowed_email_domains');
      const domain=email.split('@').pop();
      if(domains.rows.length&&!domains.rows.some(row=>String(row.domain).toLowerCase()===domain))
        return res.status(403).json({error:'Gunakan email institusi yang telah diizinkan administrator.'});
      const passwordHash=await hashPassword(password);
      const added=await db.query('INSERT INTO eco_member_accounts(id,email,name,password_hash) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id,email,name',
        [crypto.randomUUID(),email,name,passwordHash]);
      await logAttempt(email,ip,'register',!!added.rowCount);
      if(!added.rowCount)return res.status(409).json({error:'Email sudah terdaftar. Silakan gunakan menu Masuk.'});
      const user=added.rows[0];
      await createSession(res,user);
      res.status(201).json({user,notice:'Alamat email belum diverifikasi. Persetujuan laporan tetap dilakukan oleh administrator.'});
    }catch(err){next(err);}
  });
  app.post('/api/auth/password/login',async(req,res,next)=>{
    try {
      const email=cleanEmail(req.body?.email),password=req.body?.password;
      if(!validEmail(email)||typeof password!=='string'||password.length>128||!password)return res.status(400).json({error:'Masukkan email dan kata sandi.'});
      const ip=clientKey(req);
      const attempts=await db.query("SELECT COUNT(*)::int n FROM eco_member_auth_attempts WHERE (email=$1 OR client_key=$2) AND action='login' AND success=false AND created_at>NOW()-INTERVAL '15 minutes'",[email,ip]);
      if(Number(attempts.rows[0]?.n||0)>=12)return res.status(429).json({error:'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.'});
      const result=await db.query('SELECT id,email,name,password_hash FROM eco_member_accounts WHERE email=$1',[email]);
      const user=result.rows[0];
      const valid=user&&await verifyPassword(password,user.password_hash);
      await logAttempt(email,ip,'login',!!valid);
      if(!valid)return res.status(401).json({error:'Email atau kata sandi tidak sesuai.'});
      const publicUser={id:user.id,email:user.email,name:user.name};
      await createSession(res,publicUser);
      res.json({user:publicUser});
    }catch(err){next(err);}
  });
}
