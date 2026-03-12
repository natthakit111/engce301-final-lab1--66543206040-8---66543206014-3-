import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'auth-db',
  port: 5432,
  database: process.env.DB_NAME || 'auth_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

export async function initDB() {
  try {
    await pool.query('SELECT 1');
    console.log('[auth-service] DB Connected');
  } catch (err) {
    console.error('[auth-service] DB Error', err);
  }
}