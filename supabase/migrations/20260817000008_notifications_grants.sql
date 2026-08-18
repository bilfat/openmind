-- =====================================================
-- Notification System — Table Privileges (forward-only)
-- Adds standard Supabase table grants for public.notifications.
-- The table/enum/indexes/RLS/realtime were created in
-- 20260817000006_create_notifications.sql (already applied).
-- =====================================================

-- Table privileges so anon/authenticated/service_role can access
-- the table; RLS still enforces row-level rules.
GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;