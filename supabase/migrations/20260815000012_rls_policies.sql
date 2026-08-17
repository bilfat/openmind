-- Grant explicit schema permissions to Supabase roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Create RLS helper functions with SECURITY DEFINER to bypass recursion
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_profile_role()
RETURNS role_type AS $$
DECLARE
  user_role role_type;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = auth.uid() AND status = 'ACTIVE';
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all 17 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_ticket_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Allow active admins to read profiles" ON public.profiles
  FOR SELECT USING (public.is_active_admin());

CREATE POLICY "Allow super admin to manage profiles" ON public.profiles
  FOR ALL USING (public.get_auth_profile_role() = 'SUPER_ADMIN');

-- 2. EVENTS POLICIES
CREATE POLICY "Allow public SELECT on active events" ON public.events
  FOR SELECT USING (status = 'ACTIVE' OR public.is_active_admin());

CREATE POLICY "Allow super admin to manage events" ON public.events
  FOR ALL USING (public.get_auth_profile_role() = 'SUPER_ADMIN');

-- 3. TICKET_TYPES POLICIES
CREATE POLICY "Allow public SELECT on active public ticket types" ON public.ticket_types
  FOR SELECT USING ((status = 'ACTIVE' AND visibility = 'PUBLIC') OR public.is_active_admin());

CREATE POLICY "Allow super admin to manage ticket types" ON public.ticket_types
  FOR ALL USING (public.get_auth_profile_role() = 'SUPER_ADMIN');

-- 4. PRIVATE_TICKET_LINKS POLICIES
CREATE POLICY "Allow public SELECT on active private links" ON public.private_ticket_links
  FOR SELECT USING (status = 'ACTIVE');

CREATE POLICY "Allow active admins to read all private links" ON public.private_ticket_links
  FOR SELECT USING (public.is_active_admin());

CREATE POLICY "Allow super admin to manage private links" ON public.private_ticket_links
  FOR ALL USING (public.get_auth_profile_role() = 'SUPER_ADMIN');

-- 5. PARTICIPANTS POLICIES
CREATE POLICY "Allow guest to create participant" ON public.participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow active admins to manage participants" ON public.participants
  FOR ALL USING (public.is_active_admin());

-- 6. ORDERS POLICIES
CREATE POLICY "Allow guest to create order" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow active admins to manage orders" ON public.orders
  FOR ALL USING (public.is_active_admin());

-- 7. ORDER_ITEMS POLICIES
CREATE POLICY "Allow guest to create order item" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow active admins to manage order items" ON public.order_items
  FOR ALL USING (public.is_active_admin());

-- 8. PAYMENTS POLICIES
CREATE POLICY "Allow guest to create payment" ON public.payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow active admins to manage payments" ON public.payments
  FOR ALL USING (public.is_active_admin());

-- 9. TICKET_RESERVATIONS POLICIES
CREATE POLICY "Allow active admins to manage reservations" ON public.ticket_reservations
  FOR ALL USING (public.is_active_admin());

-- 10. ISSUED_TICKETS POLICIES
CREATE POLICY "Allow public SELECT on active issued tickets" ON public.issued_tickets
  FOR SELECT USING (status = 'ACTIVE' OR status = 'CHECKED_IN');

CREATE POLICY "Allow active admins to manage issued tickets" ON public.issued_tickets
  FOR ALL USING (public.is_active_admin());

-- 11. REFERRAL_CODES POLICIES
CREATE POLICY "Allow public SELECT on active referral codes" ON public.referral_codes
  FOR SELECT USING (status = 'ACTIVE');

CREATE POLICY "Allow active admins to manage referral codes" ON public.referral_codes
  FOR ALL USING (public.is_active_admin());

-- 12. REFERRAL_REDEMPTIONS POLICIES
CREATE POLICY "Allow active admins to manage referral redemptions" ON public.referral_redemptions
  FOR ALL USING (public.is_active_admin());

-- 13. CHECK_INS POLICIES
CREATE POLICY "Allow active admins to manage check ins" ON public.check_ins
  FOR ALL USING (public.is_active_admin());

-- 14. BROADCASTS POLICIES
CREATE POLICY "Allow active admins to manage broadcasts" ON public.broadcasts
  FOR ALL USING (public.is_active_admin());

-- 15. BROADCAST_RECIPIENTS POLICIES
CREATE POLICY "Allow active admins to manage broadcast recipients" ON public.broadcast_recipients
  FOR ALL USING (public.is_active_admin());

-- 16. EMAIL_JOBS POLICIES
CREATE POLICY "Allow active admins to manage email jobs" ON public.email_jobs
  FOR ALL USING (public.is_active_admin());

-- 17. AUDIT_LOGS POLICIES
CREATE POLICY "Allow super admin to read audit logs" ON public.audit_logs
  FOR SELECT USING (public.get_auth_profile_role() = 'SUPER_ADMIN');


-- === STORAGE BUCKETS CONFIGURATION & POLICIES ===

-- Create storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for payment-proofs (Private bucket)
CREATE POLICY "Allow public insert to payment-proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Allow active admins to read payment-proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs' AND public.is_active_admin());

-- Policies for event-assets (Public bucket)
CREATE POLICY "Allow public read of event-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-assets');

CREATE POLICY "Allow super admin to manage event-assets" ON storage.objects
  FOR ALL USING (bucket_id = 'event-assets' AND public.get_auth_profile_role() = 'SUPER_ADMIN');
