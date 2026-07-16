-- =============================================
-- 009: Security Fixes - RLS Restrictive, RPCs
-- =============================================

-- =============================================
-- 1. RPC: Portal Login (server-side CPF+code validation)
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
-- 2. RPC: Atomic balance update (prevents race conditions)
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
-- 3. Drop ALL permissive RLS policies
-- =============================================

-- customers
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
-- transactions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;
-- orders
DROP POLICY IF EXISTS "Allow all for authenticated users" ON orders;
-- products
DROP POLICY IF EXISTS "Allow all for authenticated users" ON products;
-- store_profiles
DROP POLICY IF EXISTS "Allow all for authenticated users" ON store_profiles;
-- menu_send_history
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_send_history;
-- push_subscriptions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON push_subscriptions;
-- notifications
DROP POLICY IF EXISTS "Allow all for authenticated users" ON notifications;
-- comandas
DROP POLICY IF EXISTS "Allow all for authenticated users" ON comandas;
-- comanda_items
DROP POLICY IF EXISTS "Allow all for authenticated users" ON comanda_items;
-- canais_whatsapp
DROP POLICY IF EXISTS "Allow all for authenticated users" ON canais_whatsapp;
-- clientes_canal
DROP POLICY IF EXISTS "Allow all for authenticated users" ON clientes_canal;
-- historico_envios
DROP POLICY IF EXISTS "Allow all for authenticated users" ON historico_envios;

-- =============================================
-- 4. Create RESTRICTIVE RLS policies
--    (require authenticated role for all operations)
-- =============================================

-- customers
CREATE POLICY "Authenticated full access" ON customers
  FOR ALL USING (auth.role() = 'authenticated');

-- transactions
CREATE POLICY "Authenticated full access" ON transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- orders
CREATE POLICY "Authenticated full access" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- products
CREATE POLICY "Authenticated full access" ON products
  FOR ALL USING (auth.role() = 'authenticated');

-- store_profiles
CREATE POLICY "Authenticated full access" ON store_profiles
  FOR ALL USING (auth.role() = 'authenticated');

-- menu_send_history
CREATE POLICY "Authenticated full access" ON menu_send_history
  FOR ALL USING (auth.role() = 'authenticated');

-- push_subscriptions
CREATE POLICY "Authenticated full access" ON push_subscriptions
  FOR ALL USING (auth.role() = 'authenticated');

-- notifications
CREATE POLICY "Authenticated full access" ON notifications
  FOR ALL USING (auth.role() = 'authenticated');

-- comandas
CREATE POLICY "Authenticated full access" ON comandas
  FOR ALL USING (auth.role() = 'authenticated');

-- comanda_items
CREATE POLICY "Authenticated full access" ON comanda_items
  FOR ALL USING (auth.role() = 'authenticated');

-- canais_whatsapp
CREATE POLICY "Authenticated full access" ON canais_whatsapp
  FOR ALL USING (auth.role() = 'authenticated');

-- clientes_canal
CREATE POLICY "Authenticated full access" ON clientes_canal
  FOR ALL USING (auth.role() = 'authenticated');

-- historico_envios
CREATE POLICY "Authenticated full access" ON historico_envios
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 5. Storage policies - require authenticated role
-- =============================================
DROP POLICY IF EXISTS "Allow all uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes" ON storage.objects;

CREATE POLICY "Authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'files' AND auth.role() = 'authenticated');
