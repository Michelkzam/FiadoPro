-- =============================================
-- FIX_DATABASE_COMPLETE.sql
-- Execute este script no SQL Editor do Supabase
-- Verifica e corrige TODOS os problemas do banco
-- =============================================

-- =============================================
-- 1. FUNÇÃO: update_updated_at_column
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. CRIAR TABELAS QUE PODEM ESTAR FALTANDO
-- =============================================

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

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('compra', 'pagamento')),
  amount NUMERIC(10,2) NOT NULL,
  date TEXT,
  time TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  description TEXT,
  amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pendente_aprovacao_limite', 'aprovado', 'recusado', 'saiu_para_entrega', 'finalizado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  category TEXT,
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  message_template TEXT DEFAULT 'Olá {nome}, você possui um saldo devedor de {valor} em nossa loja.',
  auto_message_enabled BOOLEAN DEFAULT false,
  auto_message_interval_days INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS conexoes_redes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rede_social TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS campanha_midia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagem', 'video', 'documento')),
  url TEXT NOT NULL,
  file_path TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- 3. TRIGGERS para updated_at
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
-- 4. RLS — Habilitar em todas as tabelas
-- =============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_send_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comanda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canais_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE conexoes_redes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_midia ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_analytics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. RLS POLICIES — Drop antigos + criar novos
-- =============================================

-- customers
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
DROP POLICY IF EXISTS "Authenticated full access" ON customers;
DROP POLICY IF EXISTS "authenticated_access" ON customers;
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;
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

-- =============================================
-- 6. RPC: update_customer_balance
-- =============================================
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
    RAISE EXCEPTION 'Tipo de transação inválido: %', p_type;
  END IF;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado: %', p_customer_id;
  END IF;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. RPC: portal_login
-- =============================================
CREATE OR REPLACE FUNCTION portal_login(p_cpf TEXT, p_access_code TEXT)
RETURNS JSON AS $$
DECLARE
  normalized_cpf TEXT;
  normalized_code TEXT;
  result JSON;
BEGIN
  normalized_cpf := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  normalized_code := upper(p_access_code);

  SELECT row_to_json(c) INTO result
  FROM customers c
  WHERE regexp_replace(c.cpf, '[^0-9]', '', 'g') = normalized_cpf
    AND upper(c.access_code) = normalized_code
    AND c.status = 'ativo'
  LIMIT 1;

  IF result IS NULL THEN
    RAISE EXCEPTION 'CPF ou código de acesso inválido';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. RPC: portal_get_customer
-- =============================================
CREATE OR REPLACE FUNCTION portal_get_customer(p_customer_id UUID)
RETURNS SETOF customers AS $$
  SELECT * FROM customers c WHERE c.id = p_customer_id AND c.status = 'ativo';
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- 9. RPC: portal_get_transactions
-- =============================================
CREATE OR REPLACE FUNCTION portal_get_transactions(p_customer_id UUID, p_limit INTEGER DEFAULT 200)
RETURNS SETOF transactions AS $$
  SELECT * FROM transactions t
  WHERE t.customer_id = p_customer_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- 10. RPC: portal_get_orders
-- =============================================
CREATE OR REPLACE FUNCTION portal_get_orders(p_customer_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS SETOF orders AS $$
  SELECT * FROM orders o
  WHERE o.customer_id = p_customer_id
  ORDER BY o.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- 11. RPC: portal_get_products
-- =============================================
CREATE OR REPLACE FUNCTION portal_get_products(p_limit INTEGER DEFAULT 200)
RETURNS SETOF products AS $$
  SELECT * FROM products p
  WHERE p.available = true
  ORDER BY p.category, p.name
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- 12. RPC: portal_get_store_profile
-- =============================================
CREATE OR REPLACE FUNCTION portal_get_store_profile()
RETURNS SETOF store_profiles AS $$
  SELECT * FROM store_profiles LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- 13. RPC: portal_create_order
-- =============================================
CREATE OR REPLACE FUNCTION portal_create_order(
  p_customer_id UUID,
  p_description TEXT,
  p_amount NUMERIC
)
RETURNS orders AS $$
DECLARE
  new_order orders;
  customer_name TEXT;
  customer_phone TEXT;
BEGIN
  SELECT name, phone INTO customer_name, customer_phone FROM customers WHERE id = p_customer_id;

  INSERT INTO orders (customer_id, customer_name, customer_phone, description, amount, status)
  VALUES (p_customer_id, customer_name, customer_phone, p_description, p_amount, 'pendente')
  RETURNING * INTO new_order;

  RETURN new_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 14. RPC: portal_create_transaction
-- =============================================
CREATE OR REPLACE FUNCTION portal_create_transaction(
  p_customer_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS transactions AS $$
DECLARE
  new_tx transactions;
  customer_name TEXT;
  new_balance NUMERIC;
BEGIN
  SELECT name INTO customer_name FROM customers WHERE id = p_customer_id;

  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  VALUES (p_customer_id, customer_name, p_type, p_amount,
    to_char(NOW(), 'DD/MM/YYYY'), to_char(NOW(), 'HH24:MI'), p_description)
  RETURNING * INTO new_tx;

  IF p_type = 'compra' THEN
    UPDATE customers SET balance = balance + p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  ELSE
    UPDATE customers SET balance = balance - p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  END IF;

  RETURN new_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 15. RPC: portal_update_balance
-- =============================================
CREATE OR REPLACE FUNCTION portal_update_balance(
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
  END IF;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 16. RPCs de Dashboard/Relatórios
-- =============================================

-- get_cashflow
CREATE OR REPLACE FUNCTION get_cashflow(p_days INTEGER DEFAULT 30)
RETURNS TABLE(periodo TEXT, entradas NUMERIC, saidas NUMERIC) AS $$
  SELECT
    t.date AS periodo,
    SUM(CASE WHEN t.type = 'pagamento' THEN t.amount ELSE 0 END) AS entradas,
    SUM(CASE WHEN t.type = 'compra' THEN t.amount ELSE 0 END) AS saidas
  FROM transactions t
  WHERE t.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY t.date
  ORDER BY t.date DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- get_customer_ranking
CREATE OR REPLACE FUNCTION get_customer_ranking(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(id UUID, name TEXT, balance NUMERIC, total_transacoes BIGINT) AS $$
  SELECT c.id, c.name, c.balance, COUNT(t.id) AS total_transacoes
  FROM customers c
  LEFT JOIN transactions t ON t.customer_id = c.id
  WHERE c.status = 'ativo'
  GROUP BY c.id, c.name, c.balance
  ORDER BY c.balance DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- get_product_ranking
CREATE OR REPLACE FUNCTION get_product_ranking(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(id UUID, name TEXT, category TEXT, total_vendas BIGINT) AS $$
  SELECT p.id, p.name, p.category, 0::BIGINT AS total_vendas
  FROM products p
  WHERE p.available = true
  ORDER BY p.name
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER;

-- get_delinquent_customers
CREATE OR REPLACE FUNCTION get_delinquent_customers(p_min_days INTEGER DEFAULT 30)
RETURNS TABLE(id UUID, name TEXT, phone TEXT, balance NUMERIC, dias_em_aberto INTEGER) AS $$
  SELECT c.id, c.name, c.phone, c.balance,
    EXTRACT(DAY FROM NOW() - c.created_at)::INTEGER AS dias_em_aberto
  FROM customers c
  WHERE c.balance > 0 AND c.status = 'ativo'
  ORDER BY c.balance DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================
-- 17. Índices
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);

-- =============================================
-- 18. VERIFICAÇÃO FINAL
-- =============================================
DO $$
DECLARE
  test_id UUID;
  customer_count INTEGER;
  transaction_count INTEGER;
  order_count INTEGER;
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO customer_count FROM information_schema.columns
    WHERE table_name = 'customers' AND table_schema = 'public';
  RAISE NOTICE 'Tabela customers: % colunas', customer_count;

  SELECT COUNT(*) INTO transaction_count FROM pg_policies WHERE tablename = 'customers';
  RAISE NOTICE 'Policies na tabela customers: %', transaction_count;

  -- Testar INSERT + DELETE
  INSERT INTO customers (name, status, balance, access_code)
  VALUES ('TESTE_FINAL_DELETE_ME', 'ativo', 0, 'TEST999')
  RETURNING id INTO test_id;

  DELETE FROM customers WHERE id = test_id;
  RAISE NOTICE 'TESTE INSERT/DELETE: OK ✓';

  -- Listar todas as functions criadas
  RAISE NOTICE '=== Functions RPC disponíveis ===';
END $$;

-- Listar functions criadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_customer_balance', 'portal_login', 'portal_get_customer',
    'portal_get_transactions', 'portal_get_orders', 'portal_get_products',
    'portal_get_store_profile', 'portal_create_order',
    'portal_create_transaction', 'portal_update_balance',
    'get_cashflow', 'get_customer_ranking', 'get_product_ranking',
    'get_delinquent_customers'
  )
ORDER BY routine_name;

-- =============================================
-- CONCLUÍDO!
-- Faça logout e login novamente no sistema
-- =============================================
