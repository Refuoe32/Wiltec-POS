# WilTec POS (version 2.2)

Point of sale for WilTec Solutions (Mokhotlong, Lesotho). Next.js (React) + PostgreSQL (Supabase).

## First install (new empty database)
1. Copy `.env.example` to `.env.local`. Set `DATABASE_URL` (Supabase > Connect > Transaction pooler; use a password with letters and numbers only) and `JWT_SECRET`.
2. `npm install`
3. `npm run db:setup`      (creates all tables)
4. `npm run seed -- you@email.com YourPassword "Your Name"`      (creates the owner login)
5. `npm run dev`  ->  http://localhost:3000

## Updating an existing install (you already ran db:setup before)
1. Put the new files in your project folder (keep your `.env.local`).
2. `npm install`
3. `npm run db:migrate`      (adds the new tables/columns; safe to run again; keeps all your data)
4. `npm run dev`

## Retail controls (like a supermarket till)
- Every cashier opens **their own till** (cash float) on the Till page before selling, and **cashes up** at the end of the shift (blind count). X report = interim, Z report = final.
- Receipts show cash tendered and change, VAT breakdown, till number and a barcode. A second print is marked DUPLICATE COPY.
- Voids, cancelled orders, refunds (with reason), discounts, price overrides, reprints and failed logins are recorded and shown under Staff activity.
- **Stock** page: add new stock (scan products), clear old stock (write-off with reason), stock history, and (owner) Start fresh.
- **Settings** (owner): business name, phone, VAT number, return policy printed on receipts.

## Staff registration
The login page has a **Register** button. New people register with name, email and password, but cannot sign in
until the owner or a manager approves them under **Staff** > "Registrations waiting for approval" and chooses their access level.

## Downloads
Daily report, Staff activity, Reports, Expenses, Stock list (Inventory), Customer list and Till sales all have
**Download PDF**, **Download Excel** (CSV) and **Print** buttons.

Optional `.env.local` setting: `IDLE_MINUTES=30` (automatic sign-out after this many idle minutes).
