-- Create issued_tickets table
CREATE TABLE issued_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT UNIQUE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL UNIQUE,
  status ticket_issuance_status NOT NULL DEFAULT 'ACTIVE',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create check_ins table
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issued_ticket_id UUID NOT NULL REFERENCES issued_tickets(id) ON DELETE CASCADE UNIQUE,
  checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method check_in_method NOT NULL DEFAULT 'QR_SCAN',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
