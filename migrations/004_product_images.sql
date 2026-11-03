-- Product pictures for the POS grid (safe to run more than once)
ALTER TABLE items ADD COLUMN IF NOT EXISTS image TEXT;
