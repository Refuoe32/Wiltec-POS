// Applies every file in /migrations to your database. Safe to run again. Usage: npm run db:migrate
const fs = require('fs'); const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL_OFF ? false : { rejectUnauthorized: false } });
  await c.connect();
  try {
    for (const f of fs.readdirSync('migrations').filter(f => f.endsWith('.sql')).sort()) {
      await c.query(fs.readFileSync('migrations/' + f, 'utf8')); console.log('Applied', f);
    }
    console.log('Database is up to date.');
  } catch (e) { console.error('Migration failed:', e.message); process.exitCode = 1; }
  await c.end();
})();
