# WilTec POS

Point of sale for WilTec Solutions (Mokhotlong, Lesotho): sales, repairs, inventory, purchasing,
customers, till, expenses and reports. Built with Next.js (React) + PostgreSQL (Supabase).

## 1. Set up the database (Supabase)
1. Open your Supabase project -> **Connect** (top bar) -> **Transaction pooler** -> copy the URI (port 6543).
2. Copy `.env.example` to `.env.local` and paste it as `DATABASE_URL` (replace `[YOUR-PASSWORD]`).
3. Set `JWT_SECRET` to any long random string.

## 2. Run it
```
npm install
npm run db:setup                                   # creates all tables
npm run seed -- you@email.com YourPassword "Your Name"   # creates the owner login
npm run dev                                        # http://localhost:3000
```

## 3. Put it online (Vercel)
Push this folder to GitHub -> Vercel -> New Project -> import it. Add the environment variables
`DATABASE_URL` and `JWT_SECRET` -> Deploy. (Use a separate project from your website.)

## Roles
owner: everything · manager: everything except staff · cashier: sell, repairs, customers, till · technician: repairs and view stock
