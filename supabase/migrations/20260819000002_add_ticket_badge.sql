-- Add badge column to ticket_types (selected via admin ticket form)
ALTER TABLE ticket_types ADD COLUMN badge TEXT NOT NULL DEFAULT 'EXTEND';

-- Backfill existing tickets based on previous frontend logic
UPDATE ticket_types SET badge = 'LIMITED' WHERE base_price = 0;
UPDATE ticket_types SET badge = 'EARLY' WHERE code = 'EARLY';