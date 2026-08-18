-- ============================================================================
-- EVENT SETTINGS CMS — COMPLETE SOURCE OF TRUTH (Phase: Event CMS)
-- 1. Extend canonical `events` table with missing event-global fields.
-- 2. Create `event_speakers` table (pembicara / moderator / MC).
-- 3. Create `event_agenda` table (rundown / schedule sessions).
-- 4. RLS + grants for public read and SUPER_ADMIN management.
-- ============================================================================

-- 1. EXTEND EVENTS TABLE -----------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS hero_title TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp_display TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Backfill the existing active event so no field is left blank.
UPDATE public.events SET
  year                    = COALESCE(year, EXTRACT(YEAR FROM event_date)::TEXT),
  tagline                 = COALESCE(tagline, 'One Action Endless Impact'),
  address                 = COALESCE(address, 'Jalan Telekomunikasi No. 1, Terusan Buah Batu, Bandung, Jawa Barat 40257'),
  hero_title              = COALESCE(hero_title, name),
  hero_subtitle           = COALESCE(hero_subtitle, theme),
  contact_whatsapp_display = COALESCE(contact_whatsapp_display, contact_whatsapp),
  contact_email           = COALESCE(contact_email, 'openmind@hipmi.telu.ac.id')
WHERE year IS NULL OR tagline IS NULL OR hero_title IS NULL;

-- 2. EVENT SPEAKERS TABLE ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_speakers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'speaker',
  role_label    TEXT,
  position      TEXT,
  business      TEXT,
  bio           TEXT,
  photo_url     TEXT,
  instagram     TEXT,
  linkedin      TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_visible    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_speakers_event ON public.event_speakers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_speakers_order ON public.event_speakers(event_id, display_order);

-- 3. EVENT AGENDA TABLE ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_agenda (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  speaker_id    UUID REFERENCES public.event_speakers(id) ON DELETE SET NULL,
  start_time    TEXT,
  end_time      TEXT,
  location      TEXT,
  session_order INT NOT NULL DEFAULT 0,
  is_visible    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_agenda_event ON public.event_agenda(event_id);
CREATE INDEX IF NOT EXISTS idx_event_agenda_order ON public.event_agenda(event_id, session_order);

-- 4. RLS ---------------------------------------------------------------------
ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_agenda ENABLE ROW LEVEL SECURITY;

-- Public can read content only of ACTIVE events; active admins can read all.
CREATE POLICY "Allow public SELECT on active event speakers" ON public.event_speakers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.status = 'ACTIVE' OR public.is_active_admin()))
  );

CREATE POLICY "Allow super admin to manage event speakers" ON public.event_speakers
  FOR ALL USING (public.get_auth_profile_role() = 'SUPER_ADMIN');

CREATE POLICY "Allow public SELECT on active event agenda" ON public.event_agenda
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.status = 'ACTIVE' OR public.is_active_admin()))
  );

CREATE POLICY "Allow super admin to manage event agenda" ON public.event_agenda
  FOR ALL USING (public.get_auth_profile_role() = 'SUPER_ADMIN');

-- 5. GRANTS ------------------------------------------------------------------
GRANT ALL ON TABLE public.event_speakers TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_agenda TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
