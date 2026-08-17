-- Apply updated_at trigger to all mutable tables
CREATE TRIGGER trigger_update_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_events
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_participants
  BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_ticket_types
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_payments
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_issued_tickets
  BEFORE UPDATE ON issued_tickets
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_referral_codes
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_broadcasts
  BEFORE UPDATE ON broadcasts
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();

CREATE TRIGGER trigger_update_email_jobs
  BEFORE UPDATE ON email_jobs
  FOR EACH ROW EXECUTE FUNCTION set_current_timestamp_updated_at();
