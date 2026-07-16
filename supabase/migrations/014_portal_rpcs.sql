-- =============================================
-- 014: Portal RPCs (bypass RLS for client portal)
-- =============================================

-- Get customer data for portal
CREATE OR REPLACE FUNCTION portal_get_customer(p_customer_id UUID)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT row_to_json(c) INTO STRICT result
  FROM customers c
  WHERE c.id = p_customer_id AND c.status = 'ativo';
  RETURN result;
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'Cliente não encontrado';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer transactions for portal
CREATE OR REPLACE FUNCTION portal_get_transactions(p_customer_id UUID, p_limit INTEGER DEFAULT 200)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(t), '[]'::json) INTO result
  FROM (
    SELECT * FROM transactions
    WHERE customer_id = p_customer_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer orders for portal
CREATE OR REPLACE FUNCTION portal_get_orders(p_customer_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(o), '[]'::json) INTO result
  FROM (
    SELECT * FROM orders
    WHERE customer_id = p_customer_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) o;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active products for portal
CREATE OR REPLACE FUNCTION portal_get_products(p_limit INTEGER DEFAULT 200)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(p), '[]'::json) INTO result
  FROM (
    SELECT * FROM products
    WHERE available = true
    ORDER BY category, name
    LIMIT p_limit
  ) p;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get store profile for portal
CREATE OR REPLACE FUNCTION portal_get_store_profile()
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT row_to_json(sp) INTO result
  FROM (SELECT * FROM store_profiles LIMIT 1) sp;
  IF result IS NULL THEN
    result := '{}'::json;
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create order from portal
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
RETURNS JSON AS $$
DECLARE new_order JSON;
BEGIN
  INSERT INTO orders (customer_id, customer_name, customer_phone, description, amount, status, service_type, payment_method, payment_card_type, payment_card_brand)
  VALUES (p_customer_id, p_customer_name, p_customer_phone, p_description, p_amount, p_status, p_service_type, p_payment_method, p_payment_card_type, p_payment_card_brand)
  RETURNING row_to_json(orders.*) INTO new_order;
  RETURN new_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create transaction from portal
CREATE OR REPLACE FUNCTION portal_create_transaction(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_type TEXT,
  p_amount NUMERIC,
  p_date TEXT,
  p_time TEXT,
  p_description TEXT
)
RETURNS JSON AS $$
DECLARE new_tx JSON;
BEGIN
  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  VALUES (p_customer_id, p_customer_name, p_type, p_amount, p_date, p_time, p_description)
  RETURNING row_to_json(transactions.*) INTO new_tx;
  RETURN new_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update customer balance from portal
CREATE OR REPLACE FUNCTION portal_update_balance(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_type TEXT
)
RETURNS NUMERIC AS $$
DECLARE new_balance NUMERIC;
BEGIN
  IF p_type = 'compra' THEN
    UPDATE customers SET balance = balance + p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  ELSIF p_type = 'pagamento' THEN
    UPDATE customers SET balance = balance - p_amount WHERE id = p_customer_id RETURNING balance INTO new_balance;
  END IF;
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
