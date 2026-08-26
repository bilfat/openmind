-- Add visibility field to referral_codes (PUBLIC = shown to guests, PRIVATE = admin only)
ALTER TABLE public.referral_codes
ADD COLUMN visibility referral_visibility NOT NULL DEFAULT 'PUBLIC';

-- Create enum type if not exists
DO $$ BEGIN
  CREATE TYPE referral_visibility AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update existing records to PUBLIC (default)
UPDATE public.referral_codes SET visibility = 'PUBLIC' WHERE visibility IS NULL;

-- Add comment
COMMENT ON COLUMN public.referral_codes.visibility IS 'PUBLIC = ditampilkan ke tamu/guest checkout, PRIVATE = hanya admin/walk-in';