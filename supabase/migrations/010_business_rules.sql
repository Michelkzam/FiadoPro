-- =============================================
-- 010: Business Rules - Audit, Cashback, Coupons, Loyalty, Ratings
-- =============================================

-- =============================================
-- 1. Audit Log (B4, T8)
-- =============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON audit_log
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 2. Transaction reversal support (B5)
-- =============================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reversed BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES transactions(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- =============================================
-- 3. Credit limit history (B4)
-- =============================================
CREATE TABLE IF NOT EXISTS credit_limit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  old_limit NUMERIC(10,2),
  new_limit NUMERIC(10,2),
  changed_by UUID,
  changed_by_email TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_limit_history_customer ON credit_limit_history(customer_id);

ALTER TABLE credit_limit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON credit_limit_history
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 4. Cashback (F3, F7)
-- =============================================
CREATE TABLE IF NOT EXISTS cashback_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) DEFAULT 0,
  min_purchase NUMERIC(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cashback_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) DEFAULT 0,
  total_earned NUMERIC(10,2) DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashback_balance_customer ON cashback_balance(customer_id);

CREATE TABLE IF NOT EXISTS cashback_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent')),
  amount NUMERIC(10,2) NOT NULL,
  transaction_id UUID REFERENCES transactions(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashback_tx_customer ON cashback_transactions(customer_id);

ALTER TABLE cashback_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON cashback_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON cashback_balance FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON cashback_transactions FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 5. Coupons (F6)
-- =============================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_purchase NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON coupons FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 6. Customer Ratings (F5)
-- =============================================
CREATE TABLE IF NOT EXISTS customer_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ratings_order ON customer_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_customer ON customer_ratings(customer_id);

ALTER TABLE customer_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON customer_ratings FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 7. Product cost for profit margin (R8)
-- =============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;

-- =============================================
-- 8. Order delivery fee (B12) and minimum order (B11)
-- =============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- =============================================
-- 9. Comanda split bill (B16) and transfer (B14)
-- =============================================
ALTER TABLE comandas ADD COLUMN IF NOT EXISTS split_with TEXT[];
ALTER TABLE comandas ADD COLUMN IF NOT EXISTS transferred_from UUID REFERENCES comandas(id);

-- =============================================
-- 10. Waiting list for tables (F4)
-- =============================================
CREATE TABLE IF NOT EXISTS waiting_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  table_number TEXT,
  party_size INTEGER DEFAULT 1,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'seated', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  seated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_waiting_list_status ON waiting_list(status);

ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON waiting_list FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 11. Push notification templates
-- =============================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  url_template TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON notification_templates FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 12. Scheduled notifications
-- =============================================
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES notification_templates(id),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notif_pending ON scheduled_notifications(scheduled_for) WHERE sent = false;

ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON scheduled_notifications FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 13. Store settings for business rules
-- =============================================
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS delivery_fee_default NUMERIC(10,2) DEFAULT 0;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS late_fee_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS early_payment_discount NUMERIC(5,2) DEFAULT 0;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS auto_cancel_minutes INTEGER DEFAULT 30;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS credit_alert_threshold NUMERIC(5,2) DEFAULT 80;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS cashback_enabled BOOLEAN DEFAULT false;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS default_cashback_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT false;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS loyalty_points_per_real NUMERIC(5,2) DEFAULT 1;
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS catalog_enabled BOOLEAN DEFAULT false;

-- =============================================
-- Triggers for updated_at on new tables
-- =============================================
CREATE TRIGGER update_cashback_balance_updated_at BEFORE UPDATE ON cashback_balance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
