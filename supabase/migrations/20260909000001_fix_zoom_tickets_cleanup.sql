-- ==============================================================================
-- MIGRATION: Fix Zoom Hybrid Access Cleanup
-- DESCRIPTION: Cleans up invalid zoom_token & zoom_status on issued_tickets
--              where ticket_types.zoom_enabled is FALSE or NULL.
-- ==============================================================================

UPDATE public.issued_tickets it
SET zoom_token = NULL, zoom_status = NULL
FROM public.ticket_types tt
WHERE it.ticket_type_id = tt.id
  AND (tt.zoom_enabled IS FALSE OR tt.zoom_enabled IS NULL);
