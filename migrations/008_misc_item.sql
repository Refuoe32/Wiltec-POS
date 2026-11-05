-- "Miscellaneous item" used by the keypad screen to sell something at a typed-in price (safe to run more than once)
INSERT INTO items (kind, sku, name, sell_price, cost_price, track_stock, vat_applies)
SELECT 'service', 'SRV-MISC', 'Miscellaneous item', 0, 0, FALSE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM items WHERE sku = 'SRV-MISC');
