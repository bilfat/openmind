// Single source of truth for the payment window (DRAFT/PENDING_PAYMENT -> EXPIRED).
// Must stay in sync with:
//   - supabase: reserve_ticket_quota_rpc p_reserved_minutes default (180)
//   - supabase: cleanup_expired_orders_rpc p_stale_hours default (3)
//   - supabase: pg_cron job "openmind-cleanup" -> cleanup_expired_orders_rpc(3)
export const PAYMENT_WINDOW_HOURS = 3