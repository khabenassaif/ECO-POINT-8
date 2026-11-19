import pg from 'pg';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

const { Pool } = pg;
const dbHost = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : '';
const localDb = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(dbHost);
const useSsl = process.env.PGSSLMODE === 'disable' ? false : process.env.PGSSLMODE === 'require' ? true : !localDb;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});
const query = (sql, params=[]) => pool.query(sql, params);
export const db = {
  query,
  async transaction(statements) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userId = statements.find(s=>/INSERT\s+INTO\s+redemptions\b/i.test(s.sql))?.params?.[1]
        || statements.find(s=>/UPDATE\s+eco_profiles\b/i.test(s.sql))?.params?.[0]
        || statements.find(s=>/UPDATE\s+spin_vouchers\b/i.test(s.sql))?.params?.[1];
      if(userId) await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[String(userId)]);
      const results = [];
      for (const item of statements) {
        const result = await client.query(item.sql, item.params || []);
        if (/^UPDATE\s+redemptions\b/i.test(item.sql.trim()) && result.rowCount !== 1)
          throw new Error('redemption_state_changed');
        if (/^UPDATE\s+spin_vouchers\b/i.test(item.sql.trim()) && result.rowCount !== 1)
          throw new Error('voucher_already_used');
        if (/^UPDATE\s+rewards\s+SET\s+stock\s*=\s*stock\s*-\s*1/i.test(item.sql.trim()) && result.rowCount !== 1)
          throw new Error('out_of_stock');
        results.push(result);
      }
      await client.query('COMMIT');
      return results;
    } catch(error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
};
const hex = value => Buffer.from(value).toString('hex');
const urlSignature = (key, expiry) =>
  crypto.createHmac('sha256', process.env.SESSION_SECRET)
    .update(key + ':' + expiry).digest('hex');
export const mediaSignature = urlSignature;
export const storage = {
  async put(key, buffer, contentType) {
    await query('INSERT INTO eco_media (key, content_type, data) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET content_type=EXCLUDED.content_type, data=EXCLUDED.data', [key,contentType,buffer]);
    return { key };
  },
  async url(key, {ttl=300}={}) {
    const expiry = Math.floor(Date.now()/1000) + Math.max(30,Math.min(600,Number(ttl)||300));
    return '/api/media?key='+encodeURIComponent(key)+'&exp='+expiry+'&sig='+urlSignature(key,expiry);
  }
};
export const config = {
  async get(key) {
    if(key==='max_upload_mb') return Number(process.env.MAX_UPLOAD_MB || 8);
    if(key==='report_points') return 10;
    return undefined;
  }
};
export const auth = {};
export { crypto, hex };
