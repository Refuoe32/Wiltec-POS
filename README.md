# WilTec POS (version 3.1)

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

## Keypad till screen (/touch) - for a touchscreen till
Open **Keypad POS** from the menu (cashiers land here after login). Layout: ticket list, entry box with number keypad (Del, Enter, x), six function
buttons (Pay, Product Search, Price Change, Discount, Customer, Void Sale), and a bottom row (Price Check, Last Receipt, Cash Up / Till, Product Grid, Log Out).
Scan or type a code + Enter. Type a number + x to set the quantity. Type a price + Misc Item to sell something at that price. Hold / Recall parks a sale.
Price Change by a cashier needs a manager's email and password.
Slip printing: tick "Auto-print slip". For silent printing on the till PC, start Chrome like this (Windows shortcut target):
  chrome.exe --kiosk-printing --app=https://YOUR-SITE/touch
and set the thermal printer as the Windows default printer (paper 80 mm). Set the printer driver to open the cash drawer after printing.

## Menu (blue dashboard design)
Dashboard (tiles, chart, recent transactions), POS, Repairs, My tasks, Products, Categories, Brands, Suppliers, Inventory (stock control),
Purchasing, Customers, Till, Daily report, Expenses, Reports, Staff activity, Staff, Send Email, System Backup (owner), System Settings (owner), User Settings.

## Backups
Owner > **System Backup** > Download backup. Do it every day. The same page can restore a backup file (replaces all data).

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
