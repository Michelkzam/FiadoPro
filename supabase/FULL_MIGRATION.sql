-- =============================================
-- FiadoPro - MIGRAÇÃO COMPLETA CONSOLIDADA
-- Execute este SQL ÚNICO no SQL Editor do Supabase
-- =============================================

-- =============================================
-- EXTENSÕES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 001: SCHEMA INICIAL
-- =============================================

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  cep TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  balance NUMERIC(10,2) DEFAULT 0,
  credit_limit NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  access_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('compra', 'pagamento')),
  amount NUMERIC(10,2) NOT NULL,
  date TEXT,
  time TEXT,
  description TEXT,
  reversed BOOLEAN DEFAULT false,
  reversed_by UUID,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  description TEXT,
  amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pendente_aprovacao_limite', 'aprovado', 'recusado', 'saiu_para_entrega', 'finalizado')),
  table_number TEXT,
  service_type TEXT DEFAULT 'presencial_retirada' CHECK (service_type IN ('presencial_mesa', 'presencial_retirada', 'online_entrega', 'online_retirada')),
  payment_method TEXT,
  payment_card_type TEXT,
  payment_card_brand TEXT,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  coupon_id UUID,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  cost_price NUMERIC(10,2) DEFAULT 0,
  category TEXT,
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- store_profiles
CREATE TABLE IF NOT EXISTS store_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT,
  logo_url TEXT,
  business_type TEXT DEFAULT 'pj',
  cnpj TEXT,
  cpf TEXT,
  owner_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  instagram TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  bank_account_type TEXT,
  bank_holder TEXT,
  pix_key_1 TEXT,
  pix_key_2 TEXT,
  message_template TEXT DEFAULT 'Olá {nome}, você possui um saldo devedor de {valor} em nossa loja. Entre em contato para regularizar.',
  auto_message_enabled BOOLEAN DEFAULT false,
  auto_message_interval_days INTEGER DEFAULT 15,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  delivery_fee_default NUMERIC(10,2) DEFAULT 0,
  late_fee_percentage NUMERIC(5,2) DEFAULT 0,
  early_payment_discount NUMERIC(5,2) DEFAULT 0,
  auto_cancel_minutes INTEGER DEFAULT 30,
  credit_alert_threshold NUMERIC(5,2) DEFAULT 80,
  cashback_enabled BOOLEAN DEFAULT false,
  default_cashback_percentage NUMERIC(5,2) DEFAULT 0,
  loyalty_enabled BOOLEAN DEFAULT false,
  loyalty_points_per_real NUMERIC(5,2) DEFAULT 1,
  catalog_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- menu_send_history
CREATE TABLE IF NOT EXISTS menu_send_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TEXT,
  total INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  message TEXT,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 002: PUSH NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  tag TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 004: COMANDAS
-- =============================================

CREATE TABLE IF NOT EXISTS comandas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  customer_cpf TEXT,
  label TEXT NOT NULL,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'paga')),
  total NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT,
  split_with TEXT[],
  transferred_from UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comanda_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comanda_id UUID NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 006: WHATSAPP CHANNELS
-- =============================================

CREATE TABLE IF NOT EXISTS canais_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_channel_id TEXT,
  nome_canal TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  ultima_mensagem TEXT,
  ultima_envio TIMESTAMPTZ,
  total_enviados INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes_canal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canal_id UUID NOT NULL REFERENCES canais_whatsapp(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historico_envios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canal_id UUID REFERENCES canais_whatsapp(id) ON DELETE SET NULL,
  tipo_mensagem TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  total_destinatarios INTEGER DEFAULT 0,
  sucesso INTEGER DEFAULT 0,
  falha INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 010: NOVAS TABELAS - BUSINESS RULES
-- =============================================

-- Audit Log
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

-- Credit Limit History
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

-- Cashback
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

CREATE TABLE IF NOT EXISTS cashback_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent')),
  amount NUMERIC(10,2) NOT NULL,
  transaction_id UUID REFERENCES transactions(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons
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

-- Customer Ratings
CREATE TABLE IF NOT EXISTS customer_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waiting List
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

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  url_template TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES notification_templates(id),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number) WHERE table_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_service_type ON orders(service_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_comandas_table ON comandas(table_number);
CREATE INDEX IF NOT EXISTS idx_comandas_status ON comandas(status);
CREATE INDEX IF NOT EXISTS idx_comanda_items_comanda ON comanda_items(comanda_id);
CREATE INDEX IF NOT EXISTS idx_clientes_canal_canal ON clientes_canal(canal_id);
CREATE INDEX IF NOT EXISTS idx_clientes_canal_cliente ON clientes_canal(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historico_envios_canal ON historico_envios(canal_id);
CREATE INDEX IF NOT EXISTS idx_historico_envios_criado ON historico_envios(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_limit_history_customer ON credit_limit_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_cashback_balance_customer ON cashback_balance(customer_id);
CREATE INDEX IF NOT EXISTS idx_cashback_tx_customer ON cashback_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_ratings_order ON customer_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_customer ON customer_ratings(customer_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_status ON waiting_list(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notif_pending ON scheduled_notifications(scheduled_for) WHERE sent = false;

-- =============================================
-- RLS - POLÍTICAS RESTRITIVAS
-- =============================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_send_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comanda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canais_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_limit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Drop policies antigas se existirem
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON orders;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON products;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON store_profiles;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_send_history;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON push_subscriptions;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON notifications;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON comandas;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON comanda_items;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON canais_whatsapp;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON clientes_canal;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON historico_envios;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Políticas restritivas
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'customers') THEN
    CREATE POLICY "Authenticated full access" ON customers FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'transactions') THEN
    CREATE POLICY "Authenticated full access" ON transactions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'orders') THEN
    CREATE POLICY "Authenticated full access" ON orders FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'products') THEN
    CREATE POLICY "Authenticated full access" ON products FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'store_profiles') THEN
    CREATE POLICY "Authenticated full access" ON store_profiles FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'menu_send_history') THEN
    CREATE POLICY "Authenticated full access" ON menu_send_history FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'push_subscriptions') THEN
    CREATE POLICY "Authenticated full access" ON push_subscriptions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'notifications') THEN
    CREATE POLICY "Authenticated full access" ON notifications FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'comandas') THEN
    CREATE POLICY "Authenticated full access" ON comandas FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'comanda_items') THEN
    CREATE POLICY "Authenticated full access" ON comanda_items FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'canais_whatsapp') THEN
    CREATE POLICY "Authenticated full access" ON canais_whatsapp FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'clientes_canal') THEN
    CREATE POLICY "Authenticated full access" ON clientes_canal FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'historico_envios') THEN
    CREATE POLICY "Authenticated full access" ON historico_envios FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'audit_log') THEN
    CREATE POLICY "Authenticated full access" ON audit_log FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'credit_limit_history') THEN
    CREATE POLICY "Authenticated full access" ON credit_limit_history FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'cashback_rules') THEN
    CREATE POLICY "Authenticated full access" ON cashback_rules FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'cashback_balance') THEN
    CREATE POLICY "Authenticated full access" ON cashback_balance FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'cashback_transactions') THEN
    CREATE POLICY "Authenticated full access" ON cashback_transactions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'coupons') THEN
    CREATE POLICY "Authenticated full access" ON coupons FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'customer_ratings') THEN
    CREATE POLICY "Authenticated full access" ON customer_ratings FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'waiting_list') THEN
    CREATE POLICY "Authenticated full access" ON waiting_list FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'notification_templates') THEN
    CREATE POLICY "Authenticated full access" ON notification_templates FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'scheduled_notifications') THEN
    CREATE POLICY "Authenticated full access" ON scheduled_notifications FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Storage policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated uploads' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated reads' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Authenticated reads" ON storage.objects FOR SELECT USING (bucket_id = 'files' AND auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated deletes' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Authenticated deletes" ON storage.objects FOR DELETE USING (bucket_id = 'files' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
  CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
  CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_products_updated_at ON products;
  CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_store_profiles_updated_at ON store_profiles;
  CREATE TRIGGER update_store_profiles_updated_at BEFORE UPDATE ON store_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_comandas_updated_at ON comandas;
  CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON comandas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_canais_whatsapp_updated_at ON canais_whatsapp;
  CREATE TRIGGER update_canais_whatsapp_updated_at BEFORE UPDATE ON canais_whatsapp FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_cashback_balance_updated_at ON cashback_balance;
  CREATE TRIGGER update_cashback_balance_updated_at BEFORE UPDATE ON cashback_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =============================================
-- RPCs - FUNÇÕES
-- =============================================

-- Portal Login
CREATE OR REPLACE FUNCTION portal_login(p_cpf TEXT, p_access_code TEXT)
RETURNS JSON AS $$
DECLARE
  normalized_cpf TEXT;
  normalized_code TEXT;
  result JSON;
BEGIN
  normalized_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  normalized_code := upper(p_access_code);
  SELECT row_to_json(c) INTO result FROM customers c
  WHERE regexp_replace(c.cpf, '[^0-9]', '', 'g') = normalized_cpf
    AND upper(c.access_code) = normalized_code AND c.status = 'ativo' LIMIT 1;
  IF result IS NULL THEN RAISE EXCEPTION 'CPF ou código de acesso inválido'; END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Balance Update
CREATE OR REPLACE FUNCTION update_customer_balance(p_customer_id UUID, p_amount NUMERIC, p_type TEXT)
RETURNS NUMERIC AS $$
DECLARE new_balance NUMERIC;
BEGIN
  IF p_type = 'compra' THEN
    UPDATE customers SET balance = balance + p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  ELSIF p_type = 'pagamento' THEN
    UPDATE customers SET balance = balance - p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  ELSE RAISE EXCEPTION 'Tipo inválido: %', p_type; END IF;
  IF new_balance IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reverse Transaction
CREATE OR REPLACE FUNCTION reverse_transaction(p_transaction_id UUID, p_reason TEXT)
RETURNS JSON AS $$
DECLARE tx_record RECORD; new_reversal UUID; new_balance NUMERIC;
BEGIN
  SELECT * INTO tx_record FROM transactions WHERE id = p_transaction_id AND reversed = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transação não encontrada ou já estornada'; END IF;
  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description, reversed, reversed_by, reversal_reason)
  VALUES (tx_record.customer_id, tx_record.customer_name,
    CASE WHEN tx_record.type = 'compra' THEN 'pagamento' ELSE 'compra' END,
    tx_record.amount, to_char(NOW(), 'DD/MM/YYYY'), to_char(NOW(), 'HH24:MI'),
    'Estorno: ' || COALESCE(p_reason, tx_record.description), false, p_transaction_id, p_reason)
  RETURNING id INTO new_reversal;
  UPDATE transactions SET reversed = true, reversed_by = new_reversal WHERE id = p_transaction_id;
  SELECT balance INTO new_balance FROM update_customer_balance(tx_record.customer_id, tx_record.amount,
    CASE WHEN tx_record.type = 'compra' THEN 'pagamento' ELSE 'compra' END);
  RETURN json_build_object('success', true, 'reversal_id', new_reversal, 'new_balance', new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Late Fee
CREATE OR REPLACE FUNCTION apply_late_fee(p_customer_id UUID, p_fee_percentage NUMERIC)
RETURNS NUMERIC AS $$
DECLARE customer_balance NUMERIC; fee_amount NUMERIC; new_balance NUMERIC;
BEGIN
  SELECT balance INTO customer_balance FROM customers WHERE id = p_customer_id;
  IF customer_balance IS NULL OR customer_balance <= 0 THEN RETURN customer_balance; END IF;
  fee_amount := ROUND(customer_balance * (p_fee_percentage / 100), 2);
  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  SELECT id, name, 'compra', fee_amount, to_char(NOW(), 'DD/MM/YYYY'), to_char(NOW(), 'HH24:MI'), 'Taxa de atraso (' || p_fee_percentage || '%)' FROM customers WHERE id = p_customer_id;
  SELECT balance INTO new_balance FROM update_customer_balance(p_customer_id, fee_amount, 'compra');
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Early Discount
CREATE OR REPLACE FUNCTION apply_early_discount(p_customer_id UUID, p_discount_percentage NUMERIC)
RETURNS NUMERIC AS $$
DECLARE customer_balance NUMERIC; discount_amount NUMERIC; new_balance NUMERIC;
BEGIN
  SELECT balance INTO customer_balance FROM customers WHERE id = p_customer_id;
  IF customer_balance IS NULL OR customer_balance <= 0 THEN RETURN customer_balance; END IF;
  discount_amount := ROUND(customer_balance * (p_discount_percentage / 100), 2);
  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  SELECT id, name, 'pagamento', discount_amount, to_char(NOW(), 'DD/MM/YYYY'), to_char(NOW(), 'HH24:MI'), 'Desconto pagamento antecipado (' || p_discount_percentage || '%)' FROM customers WHERE id = p_customer_id;
  SELECT balance INTO new_balance FROM update_customer_balance(p_customer_id, discount_amount, 'pagamento');
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate Coupon
CREATE OR REPLACE FUNCTION validate_coupon(p_code TEXT, p_purchase_amount NUMERIC)
RETURNS JSON AS $$
DECLARE coupon_record RECORD; discount NUMERIC;
BEGIN
  SELECT * INTO coupon_record FROM coupons WHERE code = upper(p_code) AND active = true
    AND (valid_from IS NULL OR valid_from <= NOW()) AND (valid_until IS NULL OR valid_until >= NOW())
    AND (max_uses IS NULL OR used_count < max_uses);
  IF NOT FOUND THEN RAISE EXCEPTION 'Cupom inválido ou expirado'; END IF;
  IF p_purchase_amount < coupon_record.min_purchase THEN RAISE EXCEPTION 'Valor mínimo: R$ %', coupon_record.min_purchase; END IF;
  IF coupon_record.discount_type = 'percentage' THEN discount := ROUND(p_purchase_amount * (coupon_record.discount_value / 100), 2);
  ELSE discount := LEAST(coupon_record.discount_value, p_purchase_amount); END IF;
  UPDATE coupons SET used_count = used_count + 1 WHERE id = coupon_record.id;
  RETURN json_build_object('valid', true, 'discount', discount, 'coupon_id', coupon_record.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process Cashback
CREATE OR REPLACE FUNCTION process_cashback(p_customer_id UUID, p_purchase_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE cashback_pct NUMERIC; earned NUMERIC; current_balance NUMERIC;
BEGIN
  SELECT percentage INTO cashback_pct FROM cashback_rules WHERE active = true AND min_purchase <= p_purchase_amount ORDER BY min_purchase DESC LIMIT 1;
  IF cashback_pct IS NULL OR cashback_pct <= 0 THEN RETURN 0; END IF;
  earned := ROUND(p_purchase_amount * (cashback_pct / 100), 2);
  INSERT INTO cashback_balance (customer_id, balance, total_earned, updated_at) VALUES (p_customer_id, earned, earned, NOW())
  ON CONFLICT (customer_id) DO UPDATE SET balance = cashback_balance.balance + earned, total_earned = cashback_balance.total_earned + earned, updated_at = NOW();
  INSERT INTO cashback_transactions (customer_id, type, amount, description) VALUES (p_customer_id, 'earned', earned, 'Cashback ' || cashback_pct || '%');
  SELECT balance INTO current_balance FROM cashback_balance WHERE customer_id = p_customer_id;
  RETURN current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Spend Cashback
CREATE OR REPLACE FUNCTION spend_cashback(p_customer_id UUID, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE current_balance NUMERIC;
BEGIN
  SELECT balance INTO current_balance FROM cashback_balance WHERE customer_id = p_customer_id;
  IF current_balance IS NULL OR current_balance < p_amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
  UPDATE cashback_balance SET balance = balance - p_amount, total_spent = total_spent + p_amount, updated_at = NOW() WHERE customer_id = p_customer_id;
  INSERT INTO cashback_transactions (customer_id, type, amount, description) VALUES (p_customer_id, 'spent', p_amount, 'Uso de cashback');
  SELECT balance INTO current_balance FROM cashback_balance WHERE customer_id = p_customer_id;
  RETURN current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto Cancel Orders
CREATE OR REPLACE FUNCTION auto_cancel_pending_orders(p_max_minutes INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE cancelled_count INTEGER;
BEGIN
  UPDATE orders SET status = 'recusado', updated_at = NOW() WHERE status = 'pendente' AND created_at < NOW() - (p_max_minutes || ' minutes')::INTERVAL;
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit Log
CREATE OR REPLACE FUNCTION log_audit(p_action TEXT, p_entity_type TEXT, p_entity_id UUID DEFAULT NULL, p_old_data JSONB DEFAULT NULL, p_new_data JSONB DEFAULT NULL)
RETURNS UUID AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), p_action, p_entity_type, p_entity_id, p_old_data, p_new_data)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cashflow
CREATE OR REPLACE FUNCTION get_cashflow(p_days INTEGER DEFAULT 30)
RETURNS TABLE (date TEXT, purchases NUMERIC, payments NUMERIC, net NUMERIC) AS $$
BEGIN
  RETURN QUERY SELECT t.date,
    COALESCE(SUM(CASE WHEN t.type = 'compra' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'pagamento' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'pagamento' THEN t.amount ELSE -t.amount END), 0)
  FROM transactions t WHERE t.created_at >= NOW() - (p_days || ' days')::INTERVAL AND t.reversed = false
  GROUP BY t.date ORDER BY MIN(t.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Customer Ranking
CREATE OR REPLACE FUNCTION get_customer_ranking(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (customer_id UUID, customer_name TEXT, total_purchases NUMERIC, total_payments NUMERIC, current_balance NUMERIC, transaction_count BIGINT) AS $$
BEGIN
  RETURN QUERY SELECT c.id, c.name,
    COALESCE(SUM(CASE WHEN t.type = 'compra' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'pagamento' THEN t.amount ELSE 0 END), 0),
    c.balance, COUNT(t.id)
  FROM customers c LEFT JOIN transactions t ON t.customer_id = c.id AND t.reversed = false
  WHERE c.status = 'ativo' GROUP BY c.id, c.name, c.balance
  ORDER BY COALESCE(SUM(CASE WHEN t.type = 'compra' THEN t.amount ELSE 0 END), 0) DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Product Ranking
CREATE OR REPLACE FUNCTION get_product_ranking(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (product_id UUID, product_name TEXT, category TEXT, total_orders BIGINT, total_revenue NUMERIC) AS $$
BEGIN
  RETURN QUERY SELECT p.id, p.name, p.category, COUNT(DISTINCT o.id), COALESCE(SUM(o.amount), 0)
  FROM products p LEFT JOIN orders o ON o.description ILIKE '%' || p.name || '%' AND o.status != 'recusado'
  WHERE p.available = true GROUP BY p.id, p.name, p.category ORDER BY COUNT(DISTINCT o.id) DESC LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delinquent Customers
CREATE OR REPLACE FUNCTION get_delinquent_customers(p_min_days INTEGER DEFAULT 30)
RETURNS TABLE (customer_id UUID, customer_name TEXT, phone TEXT, balance NUMERIC, days_owed BIGINT, last_transaction_date TEXT) AS $$
BEGIN
  RETURN QUERY SELECT c.id, c.name, c.phone, c.balance,
    EXTRACT(DAY FROM NOW() - MAX(t.created_at))::BIGINT, MAX(t.date)
  FROM customers c JOIN transactions t ON t.customer_id = c.id AND t.type = 'compra' AND t.reversed = false
  WHERE c.balance > 0 AND c.status = 'ativo' GROUP BY c.id, c.name, c.phone, c.balance
  HAVING EXTRACT(DAY FROM NOW() - MAX(t.created_at)) >= p_min_days ORDER BY c.balance DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monthly Comparison
CREATE OR REPLACE FUNCTION get_monthly_comparison()
RETURNS JSON AS $$
DECLARE current_month JSON; last_month JSON;
BEGIN
  SELECT json_build_object('purchases', COALESCE(SUM(CASE WHEN type = 'compra' THEN amount ELSE 0 END), 0), 'payments', COALESCE(SUM(CASE WHEN type = 'pagamento' THEN amount ELSE 0 END), 0), 'count', COUNT(*))
  INTO current_month FROM transactions WHERE created_at >= date_trunc('month', NOW()) AND reversed = false;
  SELECT json_build_object('purchases', COALESCE(SUM(CASE WHEN type = 'compra' THEN amount ELSE 0 END), 0), 'payments', COALESCE(SUM(CASE WHEN type = 'pagamento' THEN amount ELSE 0 END), 0), 'count', COUNT(*))
  INTO last_month FROM transactions WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month') AND created_at < date_trunc('month', NOW()) AND reversed = false;
  RETURN json_build_object('current_month', current_month, 'last_month', last_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Peak Hours
CREATE OR REPLACE FUNCTION get_peak_hours(p_days INTEGER DEFAULT 30)
RETURNS TABLE (hour_of_day INTEGER, transaction_count BIGINT, total_amount NUMERIC) AS $$
BEGIN
  RETURN QUERY SELECT EXTRACT(HOUR FROM created_at)::INTEGER, COUNT(*), COALESCE(SUM(amount), 0)
  FROM transactions WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL AND reversed = false
  GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY EXTRACT(HOUR FROM created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Loyalty Points
CREATE OR REPLACE FUNCTION process_loyalty_points(p_customer_id UUID, p_purchase_amount NUMERIC)
RETURNS INTEGER AS $$
DECLARE points_per_real NUMERIC; points_earned INTEGER;
BEGIN
  SELECT loyalty_points_per_real INTO points_per_real FROM store_profiles LIMIT 1;
  IF points_per_real IS NULL OR points_per_real <= 0 THEN RETURN 0; END IF;
  points_earned := FLOOR(p_purchase_amount * points_per_real);
  RETURN points_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 012: MULTI-CHANNEL CAMPAIGNS
-- =============================================

CREATE TABLE IF NOT EXISTS conexoes_redes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rede_social TEXT NOT NULL CHECK (rede_social IN ('whatsapp', 'telegram', 'instagram', 'facebook', 'tiktok', 'kwai')),
  nome_conexao TEXT NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'erro', 'expirado')),
  whatsapp_instance_id TEXT,
  whatsapp_api_url TEXT,
  whatsapp_api_key TEXT,
  whatsapp_phone_number TEXT,
  whatsapp_qr_code TEXT,
  whatsapp_connected BOOLEAN DEFAULT false,
  telegram_bot_token TEXT,
  telegram_bot_username TEXT,
  meta_access_token TEXT,
  meta_page_id TEXT,
  meta_ig_user_id TEXT,
  meta_app_id TEXT,
  meta_page_name TEXT,
  tiktok_access_token TEXT,
  tiktok_open_id TEXT,
  tiktok_refresh_token TEXT,
  kwai_cookies JSONB,
  kwai_session_id TEXT,
  kwai_username TEXT,
  avatar_url TEXT,
  ultimo_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conexoes_rede ON conexoes_redes(rede_social);
CREATE INDEX IF NOT EXISTS idx_conexoes_status ON conexoes_redes(status);

CREATE TABLE IF NOT EXISTS campanhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'em_progresso', 'pausada', 'concluida', 'cancelada', 'erro')),
  legenda TEXT NOT NULL,
  tipoconteudo TEXT DEFAULT 'texto' CHECK (tipoconteudo IN ('texto', 'imagem', 'video', 'carrossel')),
  canais TEXT[] NOT NULL DEFAULT '{}',
  publico_alvo TEXT DEFAULT 'todos' CHECK (publico_alvo IN ('todos', 'fiado', 'inadimplente', 'ativo', 'canal_especifico')),
  canal_whatsapp_id UUID,
  tags TEXT[],
  agendamento_tipo TEXT DEFAULT 'agora' CHECK (agendamento_tipo IN ('agora', 'agendada', 'recorrente')),
  agendado_para TIMESTAMPTZ,
  recorrencia_cron TEXT,
  whatsapp_delay_segundos INTEGER DEFAULT 20,
  whatsapp_delay_max_segundos INTEGER DEFAULT 30,
  total_enviados INTEGER DEFAULT 0,
  total_sucesso INTEGER DEFAULT 0,
  total_falha INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_agendamento ON campanhas(agendado_para) WHERE status = 'agendada';

CREATE TABLE IF NOT EXISTS campanha_midia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagem', 'video', 'documento')),
  url TEXT NOT NULL,
  file_path TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanha_midia_campanha ON campanha_midia(campanha_id);

CREATE TABLE IF NOT EXISTS fila_envio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  conexao_id UUID NOT NULL REFERENCES conexoes_redes(id) ON DELETE CASCADE,
  rede_social TEXT NOT NULL,
  destinatario_id TEXT,
  destinatario_nome TEXT,
  destinatario_telefone TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviando', 'sucesso', 'falha', 'cancelado', 'retry')),
  tentativas INTEGER DEFAULT 0,
  max_tentativas INTEGER DEFAULT 3,
  agendado_para TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  resultado JSONB,
  erro_mensagem TEXT,
  external_id TEXT,
  proximo_envio_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fila_status ON fila_envio(status);
CREATE INDEX IF NOT EXISTS idx_fila_agendado ON fila_envio(agendado_para) WHERE status IN ('pendente', 'retry');
CREATE INDEX IF NOT EXISTS idx_fila_proximo ON fila_envio(proximo_envio_em) WHERE status = 'enviando';
CREATE INDEX IF NOT EXISTS idx_fila_campanha ON fila_envio(campanha_id);

CREATE TABLE IF NOT EXISTS campanha_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  fila_item_id UUID REFERENCES fila_envio(id) ON DELETE SET NULL,
  rede_social TEXT NOT NULL,
  destinatario_id TEXT,
  evento TEXT NOT NULL CHECK (evento IN ('entregue', 'lido', 'clicou', 'respondeu', 'errou')),
  dados JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_campanha ON campanha_analytics(campanha_id);
CREATE INDEX IF NOT EXISTS idx_analytics_evento ON campanha_analytics(evento);

ALTER TABLE conexoes_redes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_midia ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'conexoes_redes') THEN
    CREATE POLICY "Authenticated full access" ON conexoes_redes FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'campanhas') THEN
    CREATE POLICY "Authenticated full access" ON campanhas FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'campanha_midia') THEN
    CREATE POLICY "Authenticated full access" ON campanha_midia FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'fila_envio') THEN
    CREATE POLICY "Authenticated full access" ON fila_envio FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'campanha_analytics') THEN
    CREATE POLICY "Authenticated full access" ON campanha_analytics FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_conexoes_redes_updated_at ON conexoes_redes;
  CREATE TRIGGER update_conexoes_redes_updated_at BEFORE UPDATE ON conexoes_redes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_campanhas_updated_at ON campanhas;
  CREATE TRIGGER update_campanhas_updated_at BEFORE UPDATE ON campanhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_fila_envio_updated_at ON fila_envio;
  CREATE TRIGGER update_fila_envio_updated_at BEFORE UPDATE ON fila_envio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =============================================
-- 013: CAMPAIGN RPCs
-- =============================================

CREATE OR REPLACE FUNCTION increment_campaign_stat(
  p_campanha_id UUID,
  p_stat TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_stat = 'total_sucesso' THEN
    UPDATE campanhas SET total_sucesso = total_sucesso + 1 WHERE id = p_campanha_id;
  ELSIF p_stat = 'total_falha' THEN
    UPDATE campanhas SET total_falha = total_falha + 1 WHERE id = p_campanha_id;
  ELSIF p_stat = 'total_enviados' THEN
    UPDATE campanhas SET total_enviados = total_enviados + 1 WHERE id = p_campanha_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_pending_queue_items(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  item_id UUID,
  campanha_id UUID,
  conexao_id UUID,
  rede_social TEXT,
  destinatario_id TEXT,
  destinatario_nome TEXT,
  destinatario_telefone TEXT,
  legenda TEXT,
  midia_url TEXT,
  whatsapp_delay_min INTEGER,
  whatsapp_delay_max INTEGER,
  tentativas INTEGER,
  max_tentativas INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.campanha_id,
    f.conexao_id,
    f.rede_social,
    f.destinatario_id,
    f.destinatario_nome,
    f.destinatario_telefone,
    f.legenda,
    f.midia_url,
    c.whatsapp_delay_segundos,
    c.whatsapp_delay_max_segundos,
    f.tentativas,
    f.max_tentativas
  FROM fila_envio f
  JOIN campanhas c ON c.id = f.campanha_id
  WHERE f.status IN ('pendente', 'retry')
    AND f.agendado_para <= NOW()
    AND c.status NOT IN ('cancelada', 'pausada')
  ORDER BY f.agendado_para ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 014/015: PORTAL RPCs (bypass RLS, SETOF)
-- =============================================

DROP FUNCTION IF EXISTS portal_login(TEXT, TEXT);
DROP FUNCTION IF EXISTS portal_get_customer(UUID);
DROP FUNCTION IF EXISTS portal_get_transactions(UUID, INTEGER);
DROP FUNCTION IF EXISTS portal_get_orders(UUID, INTEGER);
DROP FUNCTION IF EXISTS portal_get_products(INTEGER);
DROP FUNCTION IF EXISTS portal_get_store_profile();
DROP FUNCTION IF EXISTS portal_create_order(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS portal_create_transaction(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS portal_update_balance(UUID, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION portal_login(p_cpf TEXT, p_access_code TEXT)
RETURNS SETOF customers AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM customers c
  WHERE regexp_replace(c.cpf, '[^0-9]', '', 'g') = regexp_replace(p_cpf, '[^0-9]', '', 'g')
    AND upper(c.access_code) = upper(p_access_code)
    AND c.status = 'ativo'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CPF ou código de acesso inválido';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION portal_get_customer(p_customer_id UUID)
RETURNS SETOF customers AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM customers c
  WHERE c.id = p_customer_id AND c.status = 'ativo';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION portal_get_transactions(p_customer_id UUID, p_limit INTEGER DEFAULT 200)
RETURNS SETOF transactions AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM transactions
  WHERE customer_id = p_customer_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION portal_get_orders(p_customer_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS SETOF orders AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM orders
  WHERE customer_id = p_customer_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION portal_get_products(p_limit INTEGER DEFAULT 200)
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM products
  WHERE available = true
  ORDER BY category, name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION portal_get_store_profile()
RETURNS SETOF store_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM store_profiles LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION portal_create_order(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_description TEXT,
  p_amount NUMERIC,
  p_status TEXT,
  p_service_type TEXT,
  p_payment_method TEXT,
  p_payment_card_type TEXT DEFAULT NULL,
  p_payment_card_brand TEXT DEFAULT NULL
)
RETURNS SETOF orders AS $$
BEGIN
  RETURN QUERY
  INSERT INTO orders (customer_id, customer_name, customer_phone, description, amount, status, service_type, payment_method, payment_card_type, payment_card_brand)
  VALUES (p_customer_id, p_customer_name, p_customer_phone, p_description, p_amount, p_status, p_service_type, p_payment_method, p_payment_card_type, p_payment_card_brand)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION portal_create_transaction(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_type TEXT,
  p_amount NUMERIC,
  p_date TEXT,
  p_time TEXT,
  p_description TEXT
)
RETURNS SETOF transactions AS $$
BEGIN
  RETURN QUERY
  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  VALUES (p_customer_id, p_customer_name, p_type, p_amount, p_date, p_time, p_description)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION portal_update_balance(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_type TEXT
)
RETURNS TABLE(balance NUMERIC) AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  IF p_type = 'compra' THEN
    UPDATE customers SET balance = balance + p_amount WHERE id = p_customer_id RETURNING customers.balance INTO new_balance;
  ELSIF p_type = 'pagamento' THEN
    UPDATE customers SET balance = balance - p_amount WHERE id = p_customer_id RETURNING customers.balance INTO new_balance;
  END IF;
  RETURN QUERY SELECT new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 016: FIX ALL CRITICAL ISSUES
-- =============================================

ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pendente', 'pendente_aprovacao_limite', 'aprovado', 'recusado', 'saiu_para_entrega', 'finalizado'));

CREATE OR REPLACE FUNCTION update_customer_balance(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_type TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  IF p_type = 'compra' THEN
    UPDATE customers SET balance = balance + p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  ELSIF p_type = 'pagamento' THEN
    UPDATE customers SET balance = balance - p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  ELSE
    SELECT balance INTO new_balance FROM customers WHERE id = p_customer_id;
  END IF;
  RETURN COALESCE(new_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_profiles_updated_at ON store_profiles;
CREATE TRIGGER update_store_profiles_updated_at BEFORE UPDATE ON store_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION register_transaction_atomic(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_type TEXT,
  p_amount NUMERIC,
  p_date TEXT,
  p_time TEXT,
  p_description TEXT
)
RETURNS JSON AS $$
DECLARE
  new_tx JSON;
  new_balance NUMERIC;
BEGIN
  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  VALUES (p_customer_id, p_customer_name, p_type, p_amount, p_date, p_time, p_description)
  RETURNING row_to_json(transactions.*) INTO new_tx;

  SELECT balance INTO new_balance FROM update_customer_balance(p_customer_id, p_amount, p_type);

  RETURN json_build_object(
    'transaction', new_tx,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_order_atomic(
  p_order_id UUID,
  p_total NUMERIC,
  p_description TEXT
)
RETURNS JSON AS $$
DECLARE
  order_record RECORD;
  new_tx JSON;
  new_balance NUMERIC;
BEGIN
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;

  UPDATE orders SET status = 'aprovado' WHERE id = p_order_id;

  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  VALUES (
    order_record.customer_id,
    order_record.customer_name,
    'compra',
    p_total,
    to_char(NOW(), 'DD/MM/YYYY'),
    to_char(NOW(), 'HH24:MI'),
    COALESCE(p_description, 'Pedido aprovado')
  )
  RETURNING row_to_json(transactions.*) INTO new_tx;

  IF order_record.customer_id IS NOT NULL THEN
    SELECT balance INTO new_balance FROM update_customer_balance(order_record.customer_id, p_total, 'compra');
  ELSE
    new_balance := 0;
  END IF;

  RETURN json_build_object(
    'success', true,
    'transaction', new_tx,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reverse_transaction(
  p_transaction_id UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  tx_record RECORD;
  new_reversal UUID;
  new_balance NUMERIC;
BEGIN
  SELECT * INTO tx_record FROM transactions WHERE id = p_transaction_id AND reversed = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada ou já estornada';
  END IF;

  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description, reversed, reversed_by, reversal_reason)
  VALUES (
    tx_record.customer_id,
    tx_record.customer_name,
    CASE WHEN tx_record.type = 'compra' THEN 'pagamento' ELSE 'compra' END,
    tx_record.amount,
    to_char(NOW(), 'DD/MM/YYYY'),
    to_char(NOW(), 'HH24:MI'),
    'Estorno: ' || COALESCE(p_reason, tx_record.description),
    false,
    p_transaction_id,
    p_reason
  ) RETURNING id INTO new_reversal;

  UPDATE transactions SET reversed = true, reversed_by = new_reversal WHERE id = p_transaction_id;

  SELECT balance INTO new_balance FROM update_customer_balance(
    tx_record.customer_id,
    tx_record.amount,
    CASE WHEN tx_record.type = 'compra' THEN 'pagamento' ELSE 'compra' END
  );

  RETURN json_build_object(
    'success', true,
    'reversal_id', new_reversal,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_comandas_updated_at ON comandas;
CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON comandas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 017: WHATSAPP AI AGENT
-- =============================================

CREATE TABLE IF NOT EXISTS wa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE DEFAULT 'DEFAULT_SESSION',
  status TEXT DEFAULT 'desconectado' CHECK (status IN ('aguardando_qr', 'conectado', 'desconectado', 'erro')),
  phone_number TEXT,
  instance_id TEXT,
  api_url TEXT DEFAULT 'https://api.evolutionapi.com.br',
  api_key TEXT,
  provider TEXT DEFAULT 'evolution' CHECK (provider IN ('evolution', 'baileys', 'zapi')),
  qr_code TEXT,
  connected_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  robot_active BOOLEAN DEFAULT true,
  human_mode BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT DEFAULT 'DEFAULT_SESSION',
  phone_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'transbordo_humano', 'finalizada', 'arquivada')),
  flow_state TEXT DEFAULT 'menu_inicial',
  context JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  protocol TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES wa_conversas(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'template')),
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  agent_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_fluxos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT DEFAULT 'crm_vendas' CHECK (domain IN ('crm_vendas', 'helpdesk', 'agendamento', 'custom')),
  flow_data JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_respostas_rapidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_keyword TEXT NOT NULL,
  response_text TEXT NOT NULL,
  category TEXT DEFAULT 'geral',
  active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_fila_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES wa_conversas(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  reason TEXT,
  status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'atendendo', 'finalizado')),
  assigned_to TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  total_conversas INTEGER DEFAULT 0,
  resolvidas_bot INTEGER DEFAULT 0,
  transbordo_humano INTEGER DEFAULT 0,
  tempo_medio_resposta_ms INTEGER DEFAULT 0,
  mensagens_recebidas INTEGER DEFAULT 0,
  mensagens_enviadas INTEGER DEFAULT 0,
  pedidos_criados INTEGER DEFAULT 0,
  pagamentos_registrados INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_sessions_status ON wa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_session_id ON wa_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_phone ON wa_conversas(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_status ON wa_conversas(status);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_customer ON wa_conversas(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_mensagens_conversa ON wa_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_wa_mensagens_created ON wa_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_fila_status ON wa_fila_atendimento(status);
CREATE INDEX IF NOT EXISTS idx_wa_analytics_date ON wa_analytics(date DESC);

ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_fluxos ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_respostas_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_fila_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON wa_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_conversas FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_mensagens FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_fluxos FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_respostas_rapidas FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_fila_atendimento FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_analytics FOR ALL USING (true);

CREATE POLICY "Public insert for webhooks" ON wa_mensagens FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for webhooks" ON wa_mensagens FOR UPDATE USING (true);
CREATE POLICY "Public insert for webhooks" ON wa_conversas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for webhooks" ON wa_conversas FOR UPDATE USING (true);
CREATE POLICY "Public update for webhooks" ON wa_sessions FOR UPDATE USING (true);

DROP TRIGGER IF EXISTS update_wa_sessions_updated_at ON wa_sessions;
CREATE TRIGGER update_wa_sessions_updated_at BEFORE UPDATE ON wa_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wa_conversas_updated_at ON wa_conversas;
CREATE TRIGGER update_wa_conversas_updated_at BEFORE UPDATE ON wa_conversas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wa_fluxos_updated_at ON wa_fluxos;
CREATE TRIGGER update_wa_fluxos_updated_at BEFORE UPDATE ON wa_fluxos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO wa_fluxos (name, description, domain, flow_data, active, priority) VALUES
('Fluxo Padrão FiadoPro', 'Atendimento automatizado para comércio com crédito/fiado', 'crm_vendas',
'{
  "initial_menu": {
    "message": "Olá! Bem-vindo(a) ao *{store_name}*! 👋\\n\\nComo posso ajudar?\\n\\n1️⃣ Ver meu saldo e débitos\\n2️⃣ Fazer um pedido\\n3️⃣ Registrar pagamento\\n4️⃣ Ver cardápio/produtos\\n5️⃣ Falar com atendente\\n\\nDigite o número da opção desejada.",
    "options": {
      "1": "saldo",
      "2": "pedido",
      "3": "pagamento",
      "4": "cardapio",
      "5": "transbordo_humano"
    }
  },
  "saldo": {
    "message": "Para consultar seu saldo, preciso do seu *CPF*:\\n\\nDigite apenas os números do CPF.",
    "next": "validar_cpf_saldo",
    "collect_field": "cpf"
  },
  "validar_cpf_saldo": {
    "action": "lookup_customer_by_cpf",
    "on_found": "saldo_resultado",
    "on_not_found": "cpf_nao_encontrado"
  },
  "saldo_resultado": {
    "message": "📋 *Dados da sua conta:*\\n\\nNome: {customer_name}\\nSaldo devedor: *{balance}*\\nLimite de crédito: *{credit_limit}*\\n\\nDeseja algo mais?\\n1️⃣ Fazer pedido\\n2️⃣ Registrar pagamento\\n3️⃣ Voltar ao menu\\n4️⃣ Sair",
    "options": {
      "1": "pedido",
      "2": "pagamento",
      "3": "menu_inicial",
      "4": "despedida"
    }
  },
  "pedido": {
    "message": "Pedido realizado! 🛒\\n\\nEnvie os itens desejados ou acesse nosso cardápio:\\n\\n1️⃣ Ver cardápio\\n2️⃣ Digitar pedido livre\\n3️⃣ Voltar ao menu",
    "options": {
      "1": "cardapio",
      "2": "pedido_livre",
      "3": "menu_inicial"
    }
  },
  "pedido_livre": {
    "message": "Digite seu pedido. Ex: *2x Hambúrguer, 1x Refri*\\n\\n(Envie sua mensagem com o pedido)",
    "next": "confirmar_pedido",
    "collect_field": "pedido_descricao"
  },
  "confirmar_pedido": {
    "action": "create_order",
    "message": "✅ Pedido registrado!\\n\\nDescrição: {order_description}\\nValor: *{order_amount}*\\nStatus: Aguardando aprovação\\n\\nVocê receberá uma confirmação em breve!",
    "next": "menu_inicial"
  },
  "pagamento": {
    "message": "💰 *Registrar Pagamento*\\n\\nEnvie o valor que deseja pagar.\\n\\nEx: *150,00*\\n\\nOu envie *pix* para ver nossas chaves.",
    "next": "processar_pagamento",
    "collect_field": "valor_pagamento"
  },
  "processar_pagamento": {
    "action": "register_payment",
    "message": "✅ Pagamento de *{payment_amount}* registrado!\\n\\nNovo saldo: *{new_balance}*\\n\\nObrigado! 🙏",
    "next": "menu_inicial"
  },
  "cardapio": {
    "action": "fetch_products",
    "message": "📋 *Nosso Cardápio:*\\n\\n{product_list}\\n\\nPara fazer um pedido, digite o nome do produto.",
    "next": "pedido_livre"
  },
  "transbordo_humano": {
    "action": "transfer_to_human",
    "message": "👨‍💼 Entendi! Vou transferir para um atendente.\\n\\nAguarde um momento, em breve alguém irá atendê-lo.\\n\\n📋 Protocolo: {protocol}"
  },
  "cpf_nao_encontrado": {
    "message": "❌ CPF não encontrado em nossa base.\\n\\nDeseja:\\n1️⃣ Cadastrar-se\\n2️⃣ Tentar novamente\\n3️⃣ Falar com atendente",
    "options": {
      "1": "cadastro",
      "2": "saldo",
      "3": "transbordo_humano"
    }
  },
  "cadastro": {
    "message": "📝 *Cadastro Rápido*\\n\\nPreciso de algumas informações:\\n\\n1️⃣ Nome completo\\n2️⃣ Telefone (WhatsApp)\\n3️⃣ Endereço\\n\\nComece pelo *nome completo*:",
    "next": "coletar_cadastro_nome",
    "collect_field": "customer_name"
  },
  "coletar_cadastro_nome": {
    "next": "coletar_cadastro_telefone",
    "collect_field": "customer_phone"
  },
  "coletar_cadastro_telefone": {
    "next": "coletar_cadastro_endereco",
    "collect_field": "customer_address"
  },
  "coletar_cadastro_endereco": {
    "action": "create_customer",
    "message": "✅ Cadastro realizado!\\n\\nBem-vindo(a), *{customer_name}*!\\nSeu código de acesso: *{access_code}*\\n\\nUse seu CPF + código para acessar o portal.",
    "next": "menu_inicial"
  },
  "despedida": {
    "message": "Obrigado por nos contatar! 😊\\n\\n*{store_name}* - Estamos aqui quando precisar!\\nAté mais! 👋",
    "action": "end_conversation"
  },
  "fallback": {
    "message": "🤔 Não entendi sua mensagem.\\n\\nPor favor, digite um número de 1 a 5 ou envie sua dúvida.\\n\\nDigite *0* para falar com um atendente.",
    "next": "menu_inicial"
  }
}',
true, 1)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION wa_get_session(p_session_id TEXT DEFAULT 'DEFAULT_SESSION')
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT row_to_json(s) INTO result
  FROM wa_sessions s
  WHERE s.session_id = p_session_id;

  IF result IS NULL THEN
    result := '{}'::json;
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION wa_upsert_session(
  p_session_id TEXT DEFAULT 'DEFAULT_SESSION',
  p_status TEXT DEFAULT 'desconectado',
  p_phone_number TEXT DEFAULT NULL,
  p_instance_id TEXT DEFAULT NULL,
  p_api_url TEXT DEFAULT NULL,
  p_api_key TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT 'evolution',
  p_qr_code TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  INSERT INTO wa_sessions (session_id, status, phone_number, instance_id, api_url, api_key, provider, qr_code, connected_at, last_activity)
  VALUES (p_session_id, p_status, p_phone_number, p_instance_id, p_api_url, p_api_key, p_provider, p_qr_code,
    CASE WHEN p_status = 'conectado' THEN NOW() ELSE NULL END,
    NOW())
  ON CONFLICT (session_id) DO UPDATE SET
    status = EXCLUDED.status,
    phone_number = COALESCE(EXCLUDED.phone_number, wa_sessions.phone_number),
    instance_id = COALESCE(EXCLUDED.instance_id, wa_sessions.instance_id),
    api_url = COALESCE(EXCLUDED.api_url, wa_sessions.api_url),
    api_key = COALESCE(EXCLUDED.api_key, wa_sessions.api_key),
    provider = EXCLUDED.provider,
    qr_code = EXCLUDED.qr_code,
    connected_at = CASE WHEN EXCLUDED.status = 'conectado' THEN NOW() ELSE wa_sessions.connected_at END,
    last_activity = NOW(),
    updated_at = NOW()
  RETURNING row_to_json(wa_sessions.*) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION wa_get_or_create_conversa(
  p_phone_number TEXT,
  p_session_id TEXT DEFAULT 'DEFAULT_SESSION'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  existing RECORD;
BEGIN
  SELECT * INTO existing FROM wa_conversas
  WHERE phone_number = p_phone_number AND session_id = p_session_id AND status IN ('ativa', 'transbordo_humano')
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    SELECT row_to_json(c) INTO result FROM wa_conversas c WHERE c.id = existing.id;
  ELSE
    INSERT INTO wa_conversas (session_id, phone_number, flow_state, protocol)
    VALUES (p_session_id, p_phone_number, 'menu_inicial', 'FP' || TO_CHAR(NOW(), 'YYMMDDHH24MISS') || FLOOR(RANDOM() * 1000)::TEXT)
    RETURNING row_to_json(wa_conversas.*) INTO result;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION wa_register_message(
  p_conversa_id UUID,
  p_phone_number TEXT,
  p_direction TEXT,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_agent_payload JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  INSERT INTO wa_mensagens (conversa_id, phone_number, direction, content, message_type, agent_payload)
  VALUES (p_conversa_id, p_phone_number, p_direction, p_content, p_message_type, p_agent_payload)
  RETURNING row_to_json(wa_mensagens.*) INTO result;

  UPDATE wa_conversas SET last_message_at = NOW(), updated_at = NOW() WHERE id = p_conversa_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION wa_update_flow_state(
  p_conversa_id UUID,
  p_new_state TEXT,
  p_context JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE wa_conversas
  SET flow_state = p_new_state,
      context = COALESCE(p_context, context),
      updated_at = NOW()
  WHERE id = p_conversa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION wa_transfer_to_human(
  p_conversa_id UUID,
  p_reason TEXT DEFAULT 'Solicitação do cliente'
)
RETURNS JSON AS $$
DECLARE
  conv RECORD;
  result JSON;
BEGIN
  SELECT * INTO conv FROM wa_conversas WHERE id = p_conversa_id;

  UPDATE wa_conversas SET status = 'transbordo_humano', updated_at = NOW() WHERE id = p_conversa_id;

  INSERT INTO wa_fila_atendimento (conversa_id, phone_number, customer_name, priority, reason)
  VALUES (p_conversa_id, conv.phone_number, conv.customer_name, conv.priority, p_reason)
  RETURNING row_to_json(wa_fila_atendimento.*) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION wa_get_daily_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_conversas', COUNT(DISTINCT c.id),
    'resolvidas_bot', COUNT(DISTINCT CASE WHEN c.status = 'finalizada' AND c.flow_state != 'transbordo_humano' THEN c.id END),
    'transbordo_humano', COUNT(DISTINCT CASE WHEN c.status = 'transbordo_humano' THEN c.id END),
    'mensagens_recebidas', (SELECT COUNT(*) FROM wa_mensagens m WHERE m.direction = 'incoming' AND m.created_at::date = p_date),
    'mensagens_enviadas', (SELECT COUNT(*) FROM wa_mensagens m WHERE m.direction = 'outgoing' AND m.created_at::date = p_date)
  ) INTO result
  FROM wa_conversas c
  WHERE c.created_at::date = p_date;

  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 018: FIX RLS REGRESSION
-- =============================================

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_rules;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_balance;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_transactions;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON coupons;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'cashback_rules') THEN
    CREATE POLICY "Authenticated full access" ON cashback_rules FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'cashback_balance') THEN
    CREATE POLICY "Authenticated full access" ON cashback_balance FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'cashback_transactions') THEN
    CREATE POLICY "Authenticated full access" ON cashback_transactions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'coupons') THEN
    CREATE POLICY "Authenticated full access" ON coupons FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

ALTER TABLE cashback_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CONCLUÍDO! (migrations 001-018)
-- =============================================
