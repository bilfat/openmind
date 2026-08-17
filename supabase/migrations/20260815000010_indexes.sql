-- Create database indexes for performance tuning
CREATE INDEX IF NOT EXISTS idx_participants_email_nim_wa ON participants (email, nim, whatsapp);
CREATE INDEX IF NOT EXISTS idx_orders_code_status ON orders (order_code, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_participant ON order_items (order_id, participant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_status ON payments (order_id, status);
CREATE INDEX IF NOT EXISTS idx_issued_tickets_code_qr ON issued_tickets (ticket_code, qr_token);
CREATE INDEX IF NOT EXISTS idx_email_jobs_status_priority_sched ON email_jobs (status, priority, scheduled_at);
