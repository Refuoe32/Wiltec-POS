import pg from 'pg';
const g = globalThis;
export const pool = g._wtpool || (g._wtpool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL_OFF ? false : { rejectUnauthorized: false },
  max: 5,
}));
export const q = (text, params) => pool.query(text, params).then(r => r.rows);
export async function tx(fn) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; }
  catch (e) { await c.query('ROLLBACK'); throw e; }
  finally { c.release(); }
}
