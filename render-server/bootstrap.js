import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { db, pool } from './sdk.js';
const source = new URL('../eco-point-code-20261118-0044/migrations/', import.meta.url);
export async function initializeDatabase() {
  // Auth base tables must exist before migration 0014 adds password_hash.
  // On a fresh PostgreSQL database, running 0014 before creating accounts fails.
  await db.query('CREATE TABLE IF NOT EXISTS eco_member_accounts (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await db.query('CREATE TABLE IF NOT EXISTS eco_member_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await db.query('CREATE TABLE IF NOT EXISTS eco_member_login_codes (email TEXT PRIMARY KEY, digest TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL)');
  await db.query('CREATE TABLE IF NOT EXISTS eco_schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const files=(await readdir(source)).filter(x=>x.endsWith('.sql')).sort();
  for (const name of files) {
    if (name.startsWith('0011_')) continue; // Hatchable-specific RLS policy guards, unnecessary under server-only DB access.
    if ((await db.query('SELECT 1 FROM eco_schema_migrations WHERE name=$1',[name])).rowCount) continue;
    let sql=await readFile(new URL(name,source),'utf8');
    if (name.startsWith('0008_')) {
      // Never reuse the publicly exported seed admin verifier.
      sql=sql.replace(/INSERT INTO eco_admin_credentials\(id,salt_hex,verifier_hex,iterations\)\s*VALUES\s*\([\s\S]*?\);/i,'');
    }
    if (name.startsWith('0013_')) {
      sql=sql.replace(/CREATE POLICY [\s\S]*?;/gi,'');
    }
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO eco_schema_migrations (name) VALUES ($1)',[name]);
      await client.query('COMMIT');
    } catch(e) {
      await client.query('ROLLBACK');
      throw new Error('Migration '+name+' gagal: '+e.message);
    } finally { client.release(); }
  }
  await db.query('CREATE TABLE IF NOT EXISTS eco_media (key TEXT PRIMARY KEY, content_type TEXT NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await db.query('CREATE TABLE IF NOT EXISTS eco_member_login_codes (email TEXT PRIMARY KEY, digest TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL)');
  await db.query('CREATE TABLE IF NOT EXISTS eco_member_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await db.query('CREATE TABLE IF NOT EXISTS eco_member_accounts (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const secret=process.env.ADMIN_ACCESS_CODE;
  if (!secret || secret.length<12) throw new Error('ADMIN_ACCESS_CODE wajib disetel minimal 12 karakter di Render (jangan masukkan ke GitHub)');
  const count=await db.query('SELECT count(*)::int AS n FROM eco_admin_credentials');
  if(!count.rows[0].n) {
    const salt=randomBytes(16);
    const iterations=260000;
    const verifier=pbkdf2Sync(secret,salt,iterations,32,'sha256');
    await db.query('INSERT INTO eco_admin_credentials (id,salt_hex,verifier_hex,iterations) VALUES (1,$1,$2,$3)',[salt.toString('hex'),verifier.toString('hex'),iterations]);
  }
  // Do not replace existing admin credentials on ordinary redeploy.
  // The owner must rotate intentionally, not by accidentally changing an environment variable.
}
