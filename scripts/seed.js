// Creates (or resets) the owner account. Usage: npm run seed -- you@email.com YourPassword "Your Name"
const bcrypt = require('bcryptjs'); const { Client } = require('pg');
const [email, password, name = 'Owner'] = process.argv.slice(2);
if (!email || !password) { console.log('Usage: npm run seed -- email password "Full Name"'); process.exit(1); }
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL_OFF ? false : { rejectUnauthorized: false } });
  await c.connect();
  const hash = await bcrypt.hash(password, 10);
  await c.query(`insert into users(full_name,email,password_hash,role) values($1,$2,$3,'owner')
    on conflict (email) do update set password_hash=$3, role='owner', is_active=true`, [name, email, hash]);
  console.log('Owner account ready:', email);
  await c.end();
})();
