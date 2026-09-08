-- Performance tuning indexes for API routes and admin dashboard

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders (created_by);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ticket_type_id ON order_items (ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_order_items_participant_id ON order_items (participant_id);

CREATE INDEX IF NOT EXISTS idx_issued_tickets_order_id ON issued_tickets (order_id);
CREATE INDEX IF NOT EXISTS idx_issued_tickets_ticket_type_status ON issued_tickets (ticket_type_id, status);

CREATE INDEX IF NOT EXISTS idx_referral_redemptions_status ON referral_redemptions (status);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_code_id ON referral_redemptions (referral_code_id);

CREATE INDEX IF NOT EXISTS idx_email_jobs_order_type ON email_jobs (order_id, job_type);
