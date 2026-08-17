-- Phase 11 follow-up: expose pgcrypto functions to the SECURITY DEFINER issuance RPC.
-- Supabase installs pgcrypto functions in the extensions schema.
ALTER FUNCTION public.issue_order_tickets_rpc(UUID, BOOLEAN, BOOLEAN)
  SET search_path = public, extensions, pg_catalog;
