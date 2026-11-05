-- =====================================================================
-- WilTec Solutions POS - PostgreSQL Schema (v1)
-- Currency: LSL (Maloti) | VAT: 15% (configurable in settings)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- ENUMS ----------
CREATE TYPE user_role        AS ENUM ('owner','manager','cashier','technician');
CREATE TYPE payment_method   AS ENUM ('cash','mpesa','ecocash','card','bank_transfer','credit_account');
CREATE TYPE sale_status      AS ENUM ('completed','refunded','partially_refunded','voided');
CREATE TYPE repair_status    AS ENUM ('received','diagnosing','quoted','approved','waiting_parts',
                                      'in_repair','ready','collected','cancelled','unrepairable');
CREATE TYPE stock_move_type  AS ENUM ('purchase','sale','refund','adjustment','damage','repair_use','stocktake');
CREATE TYPE po_status        AS ENUM ('draft','ordered','partially_received','received','cancelled');
CREATE TYPE item_kind        AS ENUM ('product','service');

-- ---------- USERS ----------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'cashier',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- CATALOGUE ----------
CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE suppliers (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  contact   TEXT,
  phone     TEXT,
  email     TEXT,
  address   TEXT,
  notes     TEXT
);

-- Products AND services share one table (services have track_stock = false)
CREATE TABLE items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          item_kind NOT NULL DEFAULT 'product',
  sku           TEXT UNIQUE NOT NULL,
  barcode       TEXT UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  category_id   INT REFERENCES categories(id),
  supplier_id   INT REFERENCES suppliers(id),
  cost_price    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sell_price    NUMERIC(12,2) NOT NULL CHECK (sell_price >= 0),
  vat_applies   BOOLEAN NOT NULL DEFAULT TRUE,
  track_stock   BOOLEAN NOT NULL DEFAULT TRUE,
  stock_qty     INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 2,
  has_serial    BOOLEAN NOT NULL DEFAULT FALSE,   -- laptops, phones, etc.
  warranty_days INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_name ON items (lower(name));
CREATE INDEX idx_items_category ON items (category_id);

CREATE TABLE item_serials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES items(id),
  serial_no   TEXT UNIQUE NOT NULL,
  in_stock    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock_movements (
  id          BIGSERIAL PRIMARY KEY,
  item_id     UUID NOT NULL REFERENCES items(id),
  move_type   stock_move_type NOT NULL,
  qty_change  INT NOT NULL,                 -- + in, - out
  reference   TEXT,                         -- sale no / PO no / repair no
  note        TEXT,
  user_id     UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_moves_item ON stock_movements (item_id, created_at DESC);

-- ---------- CUSTOMERS ----------
CREATE TABLE customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  is_business    BOOLEAN NOT NULL DEFAULT FALSE,
  credit_limit   NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_owing  NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_phone ON customers (phone);

-- ---------- CASH REGISTER ----------
CREATE TABLE register_sessions (
  id              SERIAL PRIMARY KEY,
  opened_by       UUID NOT NULL REFERENCES users(id),
  closed_by       UUID REFERENCES users(id),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ,
  opening_float   NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_cash   NUMERIC(12,2),
  counted_cash    NUMERIC(12,2),
  variance        NUMERIC(12,2),
  note            TEXT
);

-- ---------- SALES ----------
CREATE SEQUENCE sale_no_seq START 1000;
CREATE TABLE sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_no       TEXT UNIQUE NOT NULL DEFAULT ('WT-' || nextval('sale_no_seq')),
  customer_id   UUID REFERENCES customers(id),
  cashier_id    UUID NOT NULL REFERENCES users(id),
  session_id    INT REFERENCES register_sessions(id),
  repair_job_id UUID,                       -- FK added after repair_jobs
  subtotal      NUMERIC(12,2) NOT NULL,
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL,
  status        sale_status NOT NULL DEFAULT 'completed',
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_date ON sales (created_at DESC);
CREATE INDEX idx_sales_customer ON sales (customer_id);

CREATE TABLE sale_items (
  id          BIGSERIAL PRIMARY KEY,
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items(id),
  serial_id   UUID REFERENCES item_serials(id),
  description TEXT NOT NULL,                -- snapshot of name at time of sale
  qty         INT NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(12,2) NOT NULL,
  unit_cost   NUMERIC(12,2) NOT NULL,       -- snapshot for profit reports
  discount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(12,2) NOT NULL,
  returned_qty INT NOT NULL DEFAULT 0
);

CREATE TABLE payments (
  id          BIGSERIAL PRIMARY KEY,
  sale_id     UUID REFERENCES sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),  -- for credit-account settlements
  method      payment_method NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,         -- negative for refunds
  reference   TEXT,                           -- M-Pesa / EcoCash transaction code
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- REPAIR JOBS ----------
CREATE SEQUENCE repair_no_seq START 500;
CREATE TABLE repair_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_no          TEXT UNIQUE NOT NULL DEFAULT ('RJ-' || nextval('repair_no_seq')),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  technician_id   UUID REFERENCES users(id),
  device_type     TEXT NOT NULL,              -- laptop, phone, desktop, printer
  brand_model     TEXT,
  serial_no       TEXT,
  accessories     TEXT,                       -- charger, bag, etc.
  password_pin    TEXT,                       -- encrypt in app layer
  fault_reported  TEXT NOT NULL,
  diagnosis       TEXT,
  work_done       TEXT,
  status          repair_status NOT NULL DEFAULT 'received',
  quote_amount    NUMERIC(12,2),
  deposit_paid    NUMERIC(12,2) NOT NULL DEFAULT 0,
  promised_date   DATE,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  collected_at    TIMESTAMPTZ
);
CREATE INDEX idx_repairs_status ON repair_jobs (status);

ALTER TABLE sales
  ADD CONSTRAINT fk_sales_repair FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id);

CREATE TABLE repair_parts (
  id        BIGSERIAL PRIMARY KEY,
  job_id    UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
  item_id   UUID NOT NULL REFERENCES items(id),
  qty       INT NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(12,2) NOT NULL
);

CREATE TABLE repair_status_log (
  id         BIGSERIAL PRIMARY KEY,
  job_id     UUID NOT NULL REFERENCES repair_jobs(id) ON DELETE CASCADE,
  status     repair_status NOT NULL,
  note       TEXT,
  user_id    UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- PURCHASING ----------
CREATE SEQUENCE po_no_seq START 100;
CREATE TABLE purchase_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no        TEXT UNIQUE NOT NULL DEFAULT ('PO-' || nextval('po_no_seq')),
  supplier_id  INT NOT NULL REFERENCES suppliers(id),
  status       po_status NOT NULL DEFAULT 'draft',
  total_cost   NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at  TIMESTAMPTZ
);

CREATE TABLE purchase_order_items (
  id            BIGSERIAL PRIMARY KEY,
  po_id         UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id),
  qty_ordered   INT NOT NULL CHECK (qty_ordered > 0),
  qty_received  INT NOT NULL DEFAULT 0,
  unit_cost     NUMERIC(12,2) NOT NULL
);

-- ---------- EXPENSES ----------
CREATE TABLE expenses (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL,              -- rent, transport, airtime, electricity
  description TEXT,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method      payment_method NOT NULL DEFAULT 'cash',
  user_id     UUID REFERENCES users(id),
  spent_on    DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ---------- SETTINGS & AUDIT ----------
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO settings (key, value) VALUES
  ('business_name',  'WilTec Solutions'),
  ('business_address','Mokhotlong, Lesotho'),
  ('currency',       'LSL'),
  ('vat_rate',       '15'),
  ('receipt_footer', 'Thank you for choosing WilTec Solutions!');

CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  action     TEXT NOT NULL,               -- e.g. 'sale.void', 'price.change'
  entity     TEXT,
  entity_id  TEXT,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- STARTER DATA ----------
INSERT INTO categories (name) VALUES
  ('Laptops'),('Phones & Tablets'),('Accessories'),('Networking'),
  ('Storage'),('Printers & Ink'),('Software'),('Repair Services'),('IT Services');

INSERT INTO items (kind, sku, name, category_id, sell_price, cost_price, track_stock, vat_applies)
SELECT 'service', v.sku, v.name, c.id, v.price, 0, FALSE, TRUE
FROM (VALUES
  ('SRV-DIAG','Diagnostic Fee',          'Repair Services', 100),
  ('SRV-OS',  'OS Installation',         'IT Services',     250),
  ('SRV-NET', 'Network Setup (per hour)','IT Services',     300),
  ('SRV-DATA','Data Recovery (from)',    'IT Services',     500)
) AS v(sku,name,cat,price)
JOIN categories c ON c.name = v.cat;

-- ---------- VIEWS FOR REPORTS ----------
CREATE VIEW v_low_stock AS
SELECT id, sku, name, stock_qty, reorder_level
FROM items WHERE track_stock AND is_active AND stock_qty <= reorder_level;

CREATE VIEW v_daily_sales AS
SELECT date_trunc('day', created_at)::date AS day,
       count(*) AS sales_count,
       sum(total) AS revenue,
       sum(vat_amount) AS vat
FROM sales WHERE status IN ('completed','partially_refunded')
GROUP BY 1 ORDER BY 1 DESC;

CREATE VIEW v_profit_by_item AS
SELECT si.item_id, si.description,
       sum(si.qty - si.returned_qty) AS units_sold,
       sum((si.unit_price - si.unit_cost) * (si.qty - si.returned_qty)) AS gross_profit
FROM sale_items si JOIN sales s ON s.id = si.sale_id
WHERE s.status <> 'voided'
GROUP BY 1,2;

-- Item used when billing a finished repair job
INSERT INTO items (kind, sku, name, category_id, sell_price, cost_price, track_stock, vat_applies)
SELECT 'service','SRV-REPAIR','Repair job (labour & parts)', id, 0, 0, FALSE, TRUE FROM categories WHERE name='Repair Services';

-- SECURITY: Supabase exposes public tables through its Data API.
-- Turn on Row Level Security (with no policies) so nobody can read data with the public anon key.
-- The POS server connects as the database owner, which is not affected.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- ---------- STAFF SESSIONS (sign-in / sign-out monitoring) ----------
-- Staff sign-in / sign-out records (safe to run more than once)
CREATE TABLE IF NOT EXISTS staff_sessions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  login_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_at  TIMESTAMPTZ,
  end_reason TEXT,            -- signout | timeout | locked
  ip         TEXT,
  device     TEXT
);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_user ON staff_sessions (user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_login ON staff_sessions (login_at DESC);
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;

-- ---------- DISCOUNTS, TASKS, PHOTOS ----------
-- Passport photo, discount audit fields, and staff tasks (safe to run more than once)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_reason TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_approved_by UUID REFERENCES users(id);
CREATE TABLE IF NOT EXISTS tasks (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  assigned_to   UUID NOT NULL REFERENCES users(id),
  assigned_by   UUID REFERENCES users(id),
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  due_date      DATE,
  repair_job_id UUID REFERENCES repair_jobs(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (assigned_to, status);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ---------- PRODUCT IMAGES ----------
-- Product pictures for the POS grid (safe to run more than once)
ALTER TABLE items ADD COLUMN IF NOT EXISTS image TEXT;

-- ---------- REGISTRATION APPROVAL ----------
-- Self-registration: new accounts wait for owner/manager approval (safe to run more than once)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active','pending','rejected'));

-- ---------- RETAIL CONTROLS ----------
-- Retail controls: cash tendered/change, till per cashier, stock write-off, receipt details (safe to run more than once)
ALTER TYPE stock_move_type ADD VALUE IF NOT EXISTS 'writeoff';
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2);
ALTER TABLE sales    ADD COLUMN IF NOT EXISTS cash_tendered NUMERIC(12,2);
ALTER TABLE sales    ADD COLUMN IF NOT EXISTS change_given  NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales    ADD COLUMN IF NOT EXISTS print_count   INT NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS session_id    INT REFERENCES register_sessions(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT now();
INSERT INTO settings (key, value) VALUES
  ('business_phone', ''), ('vat_number', ''), ('require_open_till', 'yes'),
  ('return_policy', 'Goods may be returned within 7 days with this receipt and in original condition. Software and special orders are not refundable.')
ON CONFLICT (key) DO NOTHING;

-- ---------- BRANDS ----------
-- Brands for products (safe to run more than once)
CREATE TABLE IF NOT EXISTS brands (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
ALTER TABLE items ADD COLUMN IF NOT EXISTS brand_id INT REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- ---------- MISC ITEM ----------
-- "Miscellaneous item" used by the keypad screen to sell something at a typed-in price (safe to run more than once)
INSERT INTO items (kind, sku, name, sell_price, cost_price, track_stock, vat_applies)
SELECT 'service', 'SRV-MISC', 'Miscellaneous item', 0, 0, FALSE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM items WHERE sku = 'SRV-MISC');
