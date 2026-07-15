-- =============================================
-- Tabela: comandas (abas individuais de mesa)
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: comanda_items (itens de cada comanda)
-- =============================================
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
-- Índices
-- =============================================
CREATE INDEX IF NOT EXISTS idx_comandas_table ON comandas(table_number);
CREATE INDEX IF NOT EXISTS idx_comandas_status ON comandas(status);
CREATE INDEX IF NOT EXISTS idx_comanda_items_comanda ON comanda_items(comanda_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comanda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON comandas FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON comanda_items FOR ALL USING (true);

-- =============================================
-- Triggers para updated_at
-- =============================================
CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON comandas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
