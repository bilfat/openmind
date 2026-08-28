// Single source of truth for the payment window (DRAFT/PENDING_PAYMENT -> EXPIRED).
// Must stay in sync with:
//   - supabase: reserve_ticket_quota_rpc p_reserved_minutes default (30)
//   - supabase: cleanup_expired_orders_rpc p_stale_minutes default (30)
//   - supabase: pg_cron job "openmind-cleanup" -> cleanup_expired_orders_rpc(30)
export const PAYMENT_WINDOW_MINUTES = 30
export const PAYMENT_WINDOW_HOURS = PAYMENT_WINDOW_MINUTES / 60