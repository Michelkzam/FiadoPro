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
-- CONCLUÍDO!
-- =============================================
