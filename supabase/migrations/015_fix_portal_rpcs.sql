-- =============================================
-- 015: Fix Portal RPCs - return SETOF for Supabase Client compatibility
-- =============================================

-- Drop ALL existing portal functions
DROP FUNCTION IF EXISTS portal_login(TEXT, TEXT);
DROP FUNCTION IF EXISTS portal_get_customer(UUID);
DROP FUNCTION IF EXISTS portal_get_transactions(UUID, INTEGER);
DROP FUNCTION IF EXISTS portal_get_orders(UUID, INTEGER);
DROP FUNCTION IF EXISTS portal_get_products(INTEGER);
DROP FUNCTION IF EXISTS portal_get_store_profile();
DROP FUNCTION IF EXISTS portal_create_order(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS portal_create_transaction(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS portal_update_balance(UUID, NUMERIC, TEXT);

-- =============================================
-- portal_login: return SETOF (single row)
-- =============================================
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

-- =============================================
-- portal_get_customer: return SETOF (single row)
-- =============================================
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

-- =============================================
-- portal_get_transactions: return SETOF
-- =============================================
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

-- =============================================
-- portal_get_orders: return SETOF
-- =============================================
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

-- =============================================
-- portal_get_products: return SETOF
-- =============================================
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

-- =============================================
-- portal_get_store_profile: return SETOF (single row or empty)
-- =============================================
CREATE OR REPLACE FUNCTION portal_get_store_profile()
RETURNS SETOF store_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM store_profiles LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- portal_create_order: return SETOF (single row)
-- =============================================
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

-- =============================================
-- portal_create_transaction: return SETOF (single row)
-- =============================================
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

-- =============================================
-- portal_update_balance: return SETOF (single value via wrapper)
-- =============================================
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
