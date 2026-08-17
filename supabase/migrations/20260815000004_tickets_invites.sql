-- Create ticket_types table
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  ticket_type ticket_category NOT NULL,
  visibility ticket_visibility NOT NULL DEFAULT 'PUBLIC',
  base_price NUMERIC NOT NULL CHECK (base_price >= 0),
  discount_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  final_price NUMERIC NOT NULL CHECK (final_price >= 0),
  quota INTEGER NOT NULL CHECK (quota > 0),
  min_purchase INTEGER NOT NULL DEFAULT 1 CHECK (min_purchase >= 1),
  max_purchase INTEGER NOT NULL DEFAULT 1 CHECK (max_purchase >= min_purchase),
  sales_start_at TIMESTAMPTZ NOT NULL,
  sales_end_at TIMESTAMPTZ NOT NULL CHECK (sales_end_at > sales_start_at),
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  status ticket_status NOT NULL DEFAULT 'DRAFT',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);

-- Create private_ticket_links table
CREATE TABLE private_ticket_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status private_link_status NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
