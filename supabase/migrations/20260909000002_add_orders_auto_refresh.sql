-- ==============================================================================
-- MIGRATION: Orders Auto Refresh Setting
-- DESCRIPTION: Adds orders_auto_refresh_enabled column to events table
-- ==============================================================================

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS orders_auto_refresh_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN events.orders_auto_refresh_enabled IS 'Apakah auto-refresh 15 detik di halaman admin orders diaktifkan.';
