// Runs schema.sql against your Supabase database. Usage: npm run db:setup
const fs = require('fs'); const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL_OFF ? false : { rejectUnauthorized: false } });
  await c.connect();
  try { await c.query(fs.readFileSync('schema.sql', 'utf8')); console.log('Database schema created.'); }
  catch (e) { console.error('Setup failed:', e.message); process.exitCode = 1; }
  await c.end();
})();
