-- Business Profiles Table
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  business_address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  tax_id TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients Table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('invoice', 'receipt')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_percentage DECIMAL(5, 2),
  tax_amount DECIMAL(12, 2),
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(12, 2),
  discount_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  payment_method TEXT,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, invoice_number)
);

-- Invoice Items Table
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for business_profiles
CREATE POLICY "Users can view own business profile"
  ON business_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business profile"
  ON business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business profile"
  ON business_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for clients
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for invoice_items
CREATE POLICY "Users can view own invoice items"
  ON invoice_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own invoice items"
  ON invoice_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND invoices.user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Optional: invoice preview template & currency (PDF + UI); run once if missing
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'modern';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS temp_client_name TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS temp_client_email TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS temp_client_phone TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS temp_client_address TEXT;

ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS brand_accent_color TEXT DEFAULT '#6D28D9';
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS invoice_footer_text TEXT DEFAULT 'Generated with PDigitalHQ';
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS invoice_signature TEXT;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS invoice_watermark_text TEXT;

-- Onboarding wizard progress per user (run in SQL Editor once)
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  profile_completed BOOLEAN DEFAULT FALSE,
  client_added BOOLEAN DEFAULT FALSE,
  invoice_created BOOLEAN DEFAULT FALSE,
  wizard_dismissed BOOLEAN DEFAULT FALSE,
  checklist_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
  ON onboarding_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
  ON onboarding_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding progress"
  ON onboarding_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Existing projects: ensure checklist_closed exists
ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS checklist_closed BOOLEAN DEFAULT FALSE;


-- Public hosted invoice links
CREATE TABLE IF NOT EXISTS invoice_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  public_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_public_links_token ON invoice_public_links(public_token);
CREATE INDEX IF NOT EXISTS idx_invoice_public_links_invoice_id ON invoice_public_links(invoice_id);

-- Invoice public activity events
CREATE TABLE IF NOT EXISTS invoice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_id ON invoice_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_events_timestamp ON invoice_events(timestamp);


ALTER TABLE invoice_public_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own public links"
  ON invoice_public_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own public links"
  ON invoice_public_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own public links"
  ON invoice_public_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoice events"
  ON invoice_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_events.invoice_id
    AND invoices.user_id = auth.uid()
  ));

CREATE POLICY "Service can insert invoice events"
  ON invoice_events FOR INSERT
  WITH CHECK (true);
