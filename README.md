# WilTec POS

Point of sale for WilTec Solutions (Mokhotlong, Lesotho). Next.js (React) + PostgreSQL (Supabase).
Sales + barcode scanning + discounts, repairs, inventory, purchasing, customers, till, daily reports,
expenses, reports, staff accounts with photos, tasks and sign-in/sign-out monitoring.

## First install
1. `.env.local` (copy of `.env.example`): set `DATABASE_URL` (Supabase -> Connect -> Transaction pooler, password with letters/numbers only) and `JWT_SECRET`.
2. `npm install`
3. `npm run db:setup`   (creates all tables - only on a NEW empty database)
4. `npm run seed -- you@email.com YourPassword "Your Name"`   (creates the owner login)
5. `npm run dev` -> http://localhost:3000

## Updating an existing install (you already ran db:setup before)
1. Replace the project files with the new ones (keep your `.env.local`).
2. `npm install`
3. `npm run db:migrate`   (adds the new tables/columns; safe to run again)
4. `npm run dev`

Optional `.env.local` setting: `IDLE_MINUTES=30` (auto sign-out after this many idle minutes).
Full description of the system: see the System Report document.
