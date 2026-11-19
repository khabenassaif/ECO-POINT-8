import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { db, storage } from './sdk.js';
const base='http://127.0.0.1:10000';
async function request(path,{method='GET',body,cookie}={}){
 const resp=await fetch(base+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
 const data=await resp.json().catch(()=>({}));
 return {status:resp.status,data,cookie:resp.headers.get('set-cookie')?.split(';')[0]};
}
const catalog=await request('/api/public/catalog');
assert.equal(catalog.status,200,'Public catalog should load');
assert.ok(catalog.data.categories.length>=5,'Default waste categories must exist');
assert.ok(catalog.data.rewards.length>=8,'Default reward catalog must exist');

const anonymousAdmin=await request('/api/admin/overview');
assert.equal(anonymousAdmin.status,401,'Admin dashboard cannot be public');
assert.equal((await request('/api/student/dashboard')).status,401,'Student API cannot be anonymous');

const login=await request('/api/admin/code-login',{method:'POST',body:{username:'CI Tester',passkey:process.env.ADMIN_ACCESS_CODE}});
assert.equal(login.status,200,JSON.stringify(login.data));
assert.ok(login.cookie?.startsWith('eco_admin_session='),'Admin should receive secure session cookie');
const dashboard=await request('/api/admin/overview',{cookie:login.cookie});
assert.equal(dashboard.status,200,JSON.stringify(dashboard.data));

const cat=catalog.data.categories[0];
const reportId=crypto.randomUUID(),userId='ci-'+crypto.randomUUID();
await db.query('INSERT INTO eco_profiles (user_id,full_name,email) VALUES ($1,$2,$3)',[userId,'Smoke Test','ci-'+crypto.randomUUID()+'@example.org']);
await db.query("INSERT INTO waste_reports(id,user_id,category_id,photo_key,photo_content_type,photo_bytes,photo_hash,latitude,longitude,status) VALUES($1,$2,$3,'ci/smoke','image/png',10,'ci-only',-6.92,107.6,'pending_admin')",[reportId,userId,cat.id]);
const approved=await request('/api/admin/review',{method:'POST',cookie:login.cookie,body:{report_id:reportId,decision:'approved',reason:''}});
assert.equal(approved.status,200,JSON.stringify(approved.data));
assert.equal(approved.data.awarded_points,Number(cat.points));
const again=await request('/api/admin/review',{method:'POST',cookie:login.cookie,body:{report_id:reportId,decision:'approved',reason:''}});
assert.equal(again.status,409,'Duplicate review must be rejected');
const ledger=await db.query("SELECT count(*)::int AS count, coalesce(sum(points),0)::int AS total FROM point_transactions WHERE user_id=$1 AND type='report_reward'",[userId]);
assert.equal(ledger.rows[0].count,1,'Report points can only be awarded once');
assert.equal(ledger.rows[0].total,Number(cat.points));
const reviews=await db.query('SELECT count(*)::int AS n FROM admin_reviews WHERE report_id=$1',[reportId]);
assert.equal(reviews.rows[0].n,1);

await storage.put('ci/logo',Buffer.from('demo-test'), 'text/plain');
const signed=await storage.url('ci/logo',{ttl:90});
const media=await fetch(base+signed);
assert.equal(media.status,200,'Signed media must be readable');
assert.equal(await media.text(),'demo-test');
const forbidden=await fetch(base+signed.replace('sig=','sig=bad'));
assert.equal(forbidden.status,403,'Tampered media signature must be rejected');
console.log('Render/Postgres smoke test PASSED: catalog, access gates, admin auth, atomic report review, signed media.');
process.exit(0);
