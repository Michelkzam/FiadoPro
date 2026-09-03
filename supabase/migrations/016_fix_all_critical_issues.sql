-- =============================================
-- 016: CORREÇÕES CRÍTICAS - Todos os P0 e P1
-- =============================================

-- =============================================
-- P0-1: Permitir customer_id NULL em orders (pedidos Mesa)
-- =============================================
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;

-- =============================================
-- P0-2: Adicionar status pendente_aprovacao_limite ao CHECK
-- =============================================
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pendente', 'pendente_aprovacao_limite', 'aprovado', 'recusado', 'saiu_para_entrega', 'finalizado'));

-- =============================================
-- P0-3: Criar/update update_customer_balance se não existe
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
    SELECT balance INTO new_balance FROM customers WHERE id = p_customer_id;
  END IF;
  RETURN COALESCE(new_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que triggers existam (idempotente)
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

-- =============================================
-- P0-4: Criar RPC atômica para registrar transação completa
-- =============================================
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

-- =============================================
-- P0-4b: Criar RPC atômica para aprovar pedido
-- =============================================
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

-- =============================================
-- P1-1: Adicionar coluna reversed em transactions
-- =============================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reversed BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reversed_by UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reversal_reason TEXT;

-- =============================================
-- P1-2: Adicionar loyalty_points_per_real em store_profiles
-- =============================================
ALTER TABLE store_profiles ADD COLUMN IF NOT EXISTS loyalty_points_per_real NUMERIC DEFAULT 0;

-- =============================================
-- P1-3: Criar tabelas faltantes
-- =============================================

-- Tabela coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_purchase NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela cashback_rules
CREATE TABLE IF NOT EXISTS cashback_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  min_purchase NUMERIC(10,2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela cashback_balance
CREATE TABLE IF NOT EXISTS cashback_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) DEFAULT 0,
  total_earned NUMERIC(10,2) DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela cashback_transactions
CREATE TABLE IF NOT EXISTS cashback_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para novas tabelas
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON coupons FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON cashback_rules FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON cashback_balance FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON cashback_transactions FOR ALL USING (true);

-- Garantir trigger de comandas
DROP TRIGGER IF EXISTS update_comandas_updated_at ON comandas;
CREATE TRIGGER update_comandas_updated_at BEFORE UPDATE ON comandas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para novas tabelas
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);
CREATE INDEX IF NOT EXISTS idx_cashback_balance_customer ON cashback_balance(customer_id);
CREATE INDEX IF NOT EXISTS idx_cashback_transactions_customer ON cashback_transactions(customer_id);

-- =============================================
-- P1-4: Corrigir portal_update_balance para retornar JSON
-- =============================================
DROP FUNCTION IF EXISTS portal_update_balance(UUID, NUMERIC, TEXT);
CREATE OR REPLACE FUNCTION portal_update_balance(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_type TEXT
)
RETURNS JSON AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  IF p_type = 'compra' THEN
    UPDATE customers SET balance = balance + p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  ELSIF p_type = 'pagamento' THEN
    UPDATE customers SET balance = balance - p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  END IF;
  RETURN json_build_object('balance', COALESCE(new_balance, 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- P1-5: Recriar reverse_transaction com coluna reversed
-- =============================================
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
