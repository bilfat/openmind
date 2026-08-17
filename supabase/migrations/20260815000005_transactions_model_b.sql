-- Create participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  nim TEXT NOT NULL,
  faculty TEXT NOT NULL,
  study_program TEXT NOT NULL,
  instagram_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  order_code TEXT NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'DRAFT',
  source order_source NOT NULL DEFAULT 'ONLINE',
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  discount_total NUMERIC NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'IDR',
  primary_participant_id UUID REFERENCES participants(id) ON DELETE SET NULL, -- Proposal Decision-001 (nullable)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_items table (No quantity field - Model B)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total NUMERIC NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table (supports multiple payment attempts)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  status payment_status NOT NULL DEFAULT 'PENDING',
  proof_path TEXT,
  proof_file_name TEXT,
  proof_mime_type TEXT,
  proof_size_bytes BIGINT,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ticket_reservations table
CREATE TABLE ticket_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status reservation_status NOT NULL DEFAULT 'RESERVED',
  reserved_until TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
