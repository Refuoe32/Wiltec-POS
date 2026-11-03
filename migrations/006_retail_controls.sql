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
