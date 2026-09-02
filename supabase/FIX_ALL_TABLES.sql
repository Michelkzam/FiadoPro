-- =============================================
-- FIX COMPLETO - Execute este SQL ÚNICO no SQL Editor
-- Ele cria TUDO que está faltando
-- =============================================

-- =============================================
-- 1. Criar função auxiliar para updated_at (se não existir)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. Criar tabelas que podem estar faltando
-- =============================================

-- clientes (caso não exista)
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

-- transações (caso não exista)
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

-- pedidos (caso não exista)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  description TEXT,
  amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pendente_aprovacao_limite', 'aprovado', 'recusado', 'saiu_para_entrega', 'finalizado')),
  table_number TEXT,
  service_type TEXT DEFAULT 'presencial_retirada',
  payment_method TEXT,
  payment_card_type TEXT,
  payment_card_brand TEXT,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  coupon_id UUID,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- produtos (caso não exista)
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

-- perfil da loja (caso não exista)
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

-- histórico de envios (caso não exista)
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

-- comandas (caso não exista)
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

-- itens de comanda (caso não exista)
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

-- notificações push (caso não exista)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notificações (caso não exista)
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

-- canais whatsapp (caso não exista)
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

-- clientes canais (caso não exista)
CREATE TABLE IF NOT EXISTS clientes_canal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canal_id UUID NOT NULL REFERENCES canais_whatsapp(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- histórico de envios whatsapp (caso não exista)
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

-- log de auditoria (caso não exista)
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

-- histórico de limite de crédito (caso não exista)
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

-- regras de cashback (caso não exista)
CREATE TABLE IF NOT EXISTS cashback_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) DEFAULT 0,
  min_purchase NUMERIC(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- saldo de cashback (caso não exista)
CREATE TABLE IF NOT EXISTS cashback_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) DEFAULT 0,
  total_earned NUMERIC(10,2) DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- transações de cashback (caso não exista)
CREATE TABLE IF NOT EXISTS cashback_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent')),
  amount NUMERIC(10,2) NOT NULL,
  transaction_id UUID REFERENCES transactions(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cupons (caso não exista)
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

-- avaliações de clientes (caso não exista)
CREATE TABLE IF NOT EXISTS customer_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- lista de espera (caso não exista)
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

-- templates de notificação (caso não exista)
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  url_template TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notificações agendadas (caso não exista)
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES notification_templates(id),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- conexões de redes sociais
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

-- campanhas
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

-- mídia de campanha
CREATE TABLE IF NOT EXISTS campanha_midia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagem', 'video', 'documento')),
  url TEXT NOT NULL,
  file_path TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- fila de envio
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

-- analytics de campanha
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

-- =============================================
-- 3. Criar índices
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
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
CREATE INDEX IF NOT EXISTS idx_conexoes_rede ON conexoes_redes(rede_social);
CREATE INDEX IF NOT EXISTS idx_conexoes_status ON conexoes_redes(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_agendamento ON campanhas(agendado_para) WHERE status = 'agendada';
CREATE INDEX IF NOT EXISTS idx_campanha_midia_campanha ON campanha_midia(campanha_id);
CREATE INDEX IF NOT EXISTS idx_fila_status ON fila_envio(status);
CREATE INDEX IF NOT EXISTS idx_fila_agendado ON fila_envio(agendado_para) WHERE status IN ('pendente', 'retry');
CREATE INDEX IF NOT EXISTS idx_fila_proximo ON fila_envio(proximo_envio_em) WHERE status = 'enviando';
CREATE INDEX IF NOT EXISTS idx_fila_campanha ON fila_envio(campanha_id);
CREATE INDEX IF NOT EXISTS idx_analytics_campanha ON campanha_analytics(campanha_id);
CREATE INDEX IF NOT EXISTS idx_analytics_evento ON campanha_analytics(evento);

-- =============================================
-- 4. Criar triggers para updated_at
-- =============================================
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

DROP TRIGGER IF EXISTS update_comandas_updated_at ON comandas;
CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON comandas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canais_whatsapp_updated_at ON canais_whatsapp;
CREATE TRIGGER update_canais_whatsapp_updated_at BEFORE UPDATE ON canais_whatsapp
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cashback_balance_updated_at ON cashback_balance;
CREATE TRIGGER update_cashback_balance_updated_at BEFORE UPDATE ON cashback_balance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conexoes_redes_updated_at ON conexoes_redes;
CREATE TRIGGER update_conexoes_redes_updated_at BEFORE UPDATE ON conexoes_redes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campanhas_updated_at ON campanhas;
CREATE TRIGGER update_campanhas_updated_at BEFORE UPDATE ON campanhas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fila_envio_updated_at ON fila_envio;
CREATE TRIGGER update_fila_envio_updated_at BEFORE UPDATE ON fila_envio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. Habilitar RLS em todas as tabelas
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
ALTER TABLE conexoes_redes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_midia ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_analytics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. Drop ALL existing policies and create new ones using auth.uid()
-- =============================================

-- customers
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
DROP POLICY IF EXISTS "Authenticated full access" ON customers;
DROP POLICY IF EXISTS "authenticated_access" ON customers;
CREATE POLICY "authenticated_access" ON customers FOR ALL USING (auth.uid() IS NOT NULL);

-- transactions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Authenticated full access" ON transactions;
DROP POLICY IF EXISTS "authenticated_access" ON transactions;
CREATE POLICY "authenticated_access" ON transactions FOR ALL USING (auth.uid() IS NOT NULL);

-- orders
DROP POLICY IF EXISTS "Allow all for authenticated users" ON orders;
DROP POLICY IF EXISTS "Authenticated full access" ON orders;
DROP POLICY IF EXISTS "authenticated_access" ON orders;
CREATE POLICY "authenticated_access" ON orders FOR ALL USING (auth.uid() IS NOT NULL);

-- products
DROP POLICY IF EXISTS "Allow all for authenticated users" ON products;
DROP POLICY IF EXISTS "Authenticated full access" ON products;
DROP POLICY IF EXISTS "authenticated_access" ON products;
CREATE POLICY "authenticated_access" ON products FOR ALL USING (auth.uid() IS NOT NULL);

-- store_profiles
DROP POLICY IF EXISTS "Allow all for authenticated users" ON store_profiles;
DROP POLICY IF EXISTS "Authenticated full access" ON store_profiles;
DROP POLICY IF EXISTS "authenticated_access" ON store_profiles;
CREATE POLICY "authenticated_access" ON store_profiles FOR ALL USING (auth.uid() IS NOT NULL);

-- menu_send_history
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_send_history;
DROP POLICY IF EXISTS "Authenticated full access" ON menu_send_history;
DROP POLICY IF EXISTS "authenticated_access" ON menu_send_history;
CREATE POLICY "authenticated_access" ON menu_send_history FOR ALL USING (auth.uid() IS NOT NULL);

-- push_subscriptions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON push_subscriptions;
DROP POLICY IF EXISTS "Authenticated full access" ON push_subscriptions;
DROP POLICY IF EXISTS "authenticated_access" ON push_subscriptions;
CREATE POLICY "authenticated_access" ON push_subscriptions FOR ALL USING (auth.uid() IS NOT NULL);

-- notifications
DROP POLICY IF EXISTS "Allow all for authenticated users" ON notifications;
DROP POLICY IF EXISTS "Authenticated full access" ON notifications;
DROP POLICY IF EXISTS "authenticated_access" ON notifications;
CREATE POLICY "authenticated_access" ON notifications FOR ALL USING (auth.uid() IS NOT NULL);

-- comandas
DROP POLICY IF EXISTS "Allow all for authenticated users" ON comandas;
DROP POLICY IF EXISTS "Authenticated full access" ON comandas;
DROP POLICY IF EXISTS "authenticated_access" ON comandas;
CREATE POLICY "authenticated_access" ON comandas FOR ALL USING (auth.uid() IS NOT NULL);

-- comanda_items
DROP POLICY IF EXISTS "Allow all for authenticated users" ON comanda_items;
DROP POLICY IF EXISTS "Authenticated full access" ON comanda_items;
DROP POLICY IF EXISTS "authenticated_access" ON comanda_items;
CREATE POLICY "authenticated_access" ON comanda_items FOR ALL USING (auth.uid() IS NOT NULL);

-- canais_whatsapp
DROP POLICY IF EXISTS "Allow all for authenticated users" ON canais_whatsapp;
DROP POLICY IF EXISTS "Authenticated full access" ON canais_whatsapp;
DROP POLICY IF EXISTS "authenticated_access" ON canais_whatsapp;
CREATE POLICY "authenticated_access" ON canais_whatsapp FOR ALL USING (auth.uid() IS NOT NULL);

-- clientes_canal
DROP POLICY IF EXISTS "Allow all for authenticated users" ON clientes_canal;
DROP POLICY IF EXISTS "Authenticated full access" ON clientes_canal;
DROP POLICY IF EXISTS "authenticated_access" ON clientes_canal;
CREATE POLICY "authenticated_access" ON clientes_canal FOR ALL USING (auth.uid() IS NOT NULL);

-- historico_envios
DROP POLICY IF EXISTS "Allow all for authenticated users" ON historico_envios;
DROP POLICY IF EXISTS "Authenticated full access" ON historico_envios;
DROP POLICY IF EXISTS "authenticated_access" ON historico_envios;
CREATE POLICY "authenticated_access" ON historico_envios FOR ALL USING (auth.uid() IS NOT NULL);

-- audit_log
DROP POLICY IF EXISTS "Authenticated full access" ON audit_log;
DROP POLICY IF EXISTS "authenticated_access" ON audit_log;
CREATE POLICY "authenticated_access" ON audit_log FOR ALL USING (auth.uid() IS NOT NULL);

-- credit_limit_history
DROP POLICY IF EXISTS "Authenticated full access" ON credit_limit_history;
DROP POLICY IF EXISTS "authenticated_access" ON credit_limit_history;
CREATE POLICY "authenticated_access" ON credit_limit_history FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_rules
DROP POLICY IF EXISTS "Authenticated full access" ON cashback_rules;
DROP POLICY IF EXISTS "authenticated_access" ON cashback_rules;
CREATE POLICY "authenticated_access" ON cashback_rules FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_balance
DROP POLICY IF EXISTS "Authenticated full access" ON cashback_balance;
DROP POLICY IF EXISTS "authenticated_access" ON cashback_balance;
CREATE POLICY "authenticated_access" ON cashback_balance FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_transactions
DROP POLICY IF EXISTS "Authenticated full access" ON cashback_transactions;
DROP POLICY IF EXISTS "authenticated_access" ON cashback_transactions;
CREATE POLICY "authenticated_access" ON cashback_transactions FOR ALL USING (auth.uid() IS NOT NULL);

-- coupons
DROP POLICY IF EXISTS "Authenticated full access" ON coupons;
DROP POLICY IF EXISTS "authenticated_access" ON coupons;
CREATE POLICY "authenticated_access" ON coupons FOR ALL USING (auth.uid() IS NOT NULL);

-- customer_ratings
DROP POLICY IF EXISTS "Authenticated full access" ON customer_ratings;
DROP POLICY IF EXISTS "authenticated_access" ON customer_ratings;
CREATE POLICY "authenticated_access" ON customer_ratings FOR ALL USING (auth.uid() IS NOT NULL);

-- waiting_list
DROP POLICY IF EXISTS "Authenticated full access" ON waiting_list;
DROP POLICY IF EXISTS "authenticated_access" ON waiting_list;
CREATE POLICY "authenticated_access" ON waiting_list FOR ALL USING (auth.uid() IS NOT NULL);

-- notification_templates
DROP POLICY IF EXISTS "Authenticated full access" ON notification_templates;
DROP POLICY IF EXISTS "authenticated_access" ON notification_templates;
CREATE POLICY "authenticated_access" ON notification_templates FOR ALL USING (auth.uid() IS NOT NULL);

-- scheduled_notifications
DROP POLICY IF EXISTS "Authenticated full access" ON scheduled_notifications;
DROP POLICY IF EXISTS "authenticated_access" ON scheduled_notifications;
CREATE POLICY "authenticated_access" ON scheduled_notifications FOR ALL USING (auth.uid() IS NOT NULL);

-- conexoes_redes
DROP POLICY IF EXISTS "Authenticated full access" ON conexoes_redes;
DROP POLICY IF EXISTS "authenticated_access" ON conexoes_redes;
CREATE POLICY "authenticated_access" ON conexoes_redes FOR ALL USING (auth.uid() IS NOT NULL);

-- campanhas
DROP POLICY IF EXISTS "Authenticated full access" ON campanhas;
DROP POLICY IF EXISTS "authenticated_access" ON campanhas;
CREATE POLICY "authenticated_access" ON campanhas FOR ALL USING (auth.uid() IS NOT NULL);

-- campanha_midia
DROP POLICY IF EXISTS "Authenticated full access" ON campanha_midia;
DROP POLICY IF EXISTS "authenticated_access" ON campanha_midia;
CREATE POLICY "authenticated_access" ON campanha_midia FOR ALL USING (auth.uid() IS NOT NULL);

-- fila_envio
DROP POLICY IF EXISTS "Authenticated full access" ON fila_envio;
DROP POLICY IF EXISTS "authenticated_access" ON fila_envio;
CREATE POLICY "authenticated_access" ON fila_envio FOR ALL USING (auth.uid() IS NOT NULL);

-- campanha_analytics
DROP POLICY IF EXISTS "Authenticated full access" ON campanha_analytics;
DROP POLICY IF EXISTS "authenticated_access" ON campanha_analytics;
CREATE POLICY "authenticated_access" ON campanha_analytics FOR ALL USING (auth.uid() IS NOT NULL);

-- Storage policies
DROP POLICY IF EXISTS "Allow all uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_reads" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_deletes" ON storage.objects;

CREATE POLICY "authenticated_uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

-- =============================================
-- CONCLUÍDO! 
-- Agora faça logout e login novamente no sistema
-- =============================================
