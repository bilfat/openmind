-- Migration: Add whatsapp_group_url to events table
-- Created: 2026-08-17
-- Description: Add official WhatsApp group link field to events table

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS whatsapp_group_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.events.whatsapp_group_url IS 'Official WhatsApp group/community link for event participants';

-- Update the existing active event with a default NULL value (no-op if already exists)
-- This ensures the column exists and is queryable
UPDATE public.events
SET whatsapp_group_url = NULL
WHERE whatsapp_group_url IS NULL
  AND status = 'ACTIVE';

-- Grant permissions (inherited from table grants)
GRANT SELECT ON public.events TO anon, authenticated;
GRANT UPDATE ON public.events TO service_role;