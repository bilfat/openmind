-- =====================================================
-- Web Push Subscriptions
-- Stores PushSubscription (endpoint + keys) per admin profile
-- so notifications can be delivered to the admin's device.
-- =====================================================

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance index for per-profile lookups
CREATE INDEX idx_push_subscriptions_profile
  ON public.push_subscriptions (profile_id);

-- Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Each authenticated user manages ONLY their own subscriptions.
CREATE POLICY "User manages own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Standard Supabase table grants (RLS still enforces row-level rules).
GRANT ALL ON TABLE public.push_subscriptions TO anon;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;