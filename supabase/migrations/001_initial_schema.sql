-- =============================================
-- FiadoPro - Schema inicial do banco de dados
-- =============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Tabela: customers (Clientes)
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

-- =============================================
-- Tabela: transactions (Transações)
-- =============================================
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

-- =============================================
-- Tabela: orders (Pedidos)
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  description TEXT,
  amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'saiu_para_entrega', 'finalizado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: products (Produtos)
-- =============================================
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

-- =============================================
-- Tabela: store_profiles (Perfil da Loja)
-- =============================================
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: menu_send_history (Histórico de envios)
-- =============================================
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
-- Índices para performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- =============================================
-- RLS (Row Level Security) - Desabilitado por padrão
-- para este sistema single-tenant
-- =============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_send_history ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (sistema single-tenant autenticado)
CREATE POLICY "Allow all for authenticated users" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON store_profiles FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON menu_send_history FOR ALL USING (true);

-- =============================================
-- Função para atualizar updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_profiles_updated_at BEFORE UPDATE ON store_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
