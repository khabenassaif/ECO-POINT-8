// Run explicitly against a provisioned PostgreSQL database. Never run on request startup.
import { initializeDatabase } from './bootstrap.js';
import { pool } from './sdk.js';

async function main() {
  if (process.env.ECO_POINT_DB_MIGRATE !== 'YES') {
    throw new Error('Migrasi diblokir. Set ECO_POINT_DB_MIGRATE=YES untuk menjalankan secara sadar.');
  }
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(?:ql)?:\/\//i.test(url)) {
    throw new Error('DATABASE_URL PostgreSQL wajib tersedia.');
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET minimal 32 karakter wajib disetel.');
  }
  if (!process.env.ADMIN_ACCESS_CODE || process.env.ADMIN_ACCESS_CODE.length < 12) {
    throw new Error('ADMIN_ACCESS_CODE minimal 12 karakter wajib disetel.');
  }
  console.log('ECO-POINT: applying database schema migrations...');
  await initializeDatabase();
  const result = await pool.query('SELECT count(*)::int AS count FROM eco_schema_migrations');
  console.log('ECO-POINT: schema ready; applied migration count:', result.rows[0]?.count);
}

try {
  await main();
} catch (error) {
  console.error('ECO-POINT: database migration failed:', error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
