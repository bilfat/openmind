-- =====================================================
-- Notification System Migration
-- Creates: ENUM, table, indexes, RLS, Realtime
-- =====================================================

-- ENUM type for notification categories
CREATE TYPE notification_type AS ENUM (
  'ORDER_NEW',
  'ORDER_APPROVED',
  'ORDER_REJECTED',
  'PAYMENT_RECEIVED',
  'CHECK_IN',
  'SYSTEM',
  'BROADCAST'
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_notifications_profile_unread
  ON notifications (profile_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_profile_created
  ON notifications (profile_id, created_at DESC);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin can read ONLY their own notifications
CREATE POLICY "Admin can read own notifications"
  ON public.notifications FOR SELECT
  USING (profile_id = auth.uid());

-- INSERT: No policy - only service_role (server-side) can insert.
-- Client cannot insert notifications.

-- UPDATE: Admin can ONLY toggle is_read on their own notifications.
-- WITH CHECK enforces the AFTER-image: profile_id must match.
-- Column restriction (is_read only) is enforced at the API layer.
CREATE POLICY "Admin can update own notifications is_read only"
  ON public.notifications FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- DELETE: No policy. Notifications are append-only in current scope.
