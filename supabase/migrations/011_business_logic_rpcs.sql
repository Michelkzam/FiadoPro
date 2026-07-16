-- =============================================
-- 011: Business Logic RPCs
-- =============================================

-- =============================================
-- RPC: Reverse a transaction (B5)
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

-- =============================================
-- RPC: Apply late fee (B7)
-- =============================================
CREATE OR REPLACE FUNCTION apply_late_fee(
  p_customer_id UUID,
  p_fee_percentage NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  customer_balance NUMERIC;
  fee_amount NUMERIC;
  new_balance NUMERIC;
BEGIN
  SELECT balance INTO customer_balance FROM customers WHERE id = p_customer_id;
  
  IF customer_balance IS NULL OR customer_balance <= 0 THEN
    RETURN customer_balance;
  END IF;

  fee_amount := ROUND(customer_balance * (p_fee_percentage / 100), 2);
  
  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  SELECT id, name, 'compra', fee_amount, to_char(NOW(), 'DD/MM/YYYY'), to_char(NOW(), 'HH24:MI'), 'Taxa de atraso (' || p_fee_percentage || '%)'
  FROM customers WHERE id = p_customer_id;

  SELECT balance INTO new_balance FROM update_customer_balance(p_customer_id, fee_amount, 'compra');
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Apply early payment discount (B8)
-- =============================================
CREATE OR REPLACE FUNCTION apply_early_discount(
  p_customer_id UUID,
  p_discount_percentage NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  customer_balance NUMERIC;
  discount_amount NUMERIC;
  new_balance NUMERIC;
BEGIN
  SELECT balance INTO customer_balance FROM customers WHERE id = p_customer_id;
  
  IF customer_balance IS NULL OR customer_balance <= 0 THEN
    RETURN customer_balance;
  END IF;

  discount_amount := ROUND(customer_balance * (p_discount_percentage / 100), 2);
  
  INSERT INTO transactions (customer_id, customer_name, type, amount, date, time, description)
  SELECT id, name, 'pagamento', discount_amount, to_char(NOW(), 'DD/MM/YYYY'), to_char(NOW(), 'HH24:MI'), 'Desconto pagamento antecipado (' || p_discount_percentage || '%)'
  FROM customers WHERE id = p_customer_id;

  SELECT balance INTO new_balance FROM update_customer_balance(p_customer_id, discount_amount, 'pagamento');
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Validate and apply coupon (F6)
-- =============================================
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_purchase_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
  coupon_record RECORD;
  discount NUMERIC;
BEGIN
  SELECT * INTO coupon_record FROM coupons
  WHERE code = upper(p_code) AND active = true
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
    AND (max_uses IS NULL OR used_count < max_uses);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cupom inválido ou expirado';
  END IF;

  IF p_purchase_amount < coupon_record.min_purchase THEN
    RAISE EXCEPTION 'Valor mínimo para este cupom: R$ %', coupon_record.min_purchase;
  END IF;

  IF coupon_record.discount_type = 'percentage' THEN
    discount := ROUND(p_purchase_amount * (coupon_record.discount_value / 100), 2);
  ELSE
    discount := LEAST(coupon_record.discount_value, p_purchase_amount);
  END IF;

  UPDATE coupons SET used_count = used_count + 1 WHERE id = coupon_record.id;

  RETURN json_build_object(
    'valid', true,
    'discount', discount,
    'coupon_id', coupon_record.id,
    'discount_type', coupon_record.discount_type,
    'discount_value', coupon_record.discount_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Process cashback (F3)
-- =============================================
CREATE OR REPLACE FUNCTION process_cashback(
  p_customer_id UUID,
  p_purchase_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  rule_record RECORD;
  cashback_pct NUMERIC;
  earned NUMERIC;
  current_balance NUMERIC;
BEGIN
  SELECT percentage INTO cashback_pct FROM cashback_rules
  WHERE active = true AND min_purchase <= p_purchase_amount
  ORDER BY min_purchase DESC LIMIT 1;

  IF cashback_pct IS NULL OR cashback_pct <= 0 THEN
    RETURN 0;
  END IF;

  earned := ROUND(p_purchase_amount * (cashback_pct / 100), 2);

  INSERT INTO cashback_balance (customer_id, balance, total_earned, updated_at)
  VALUES (p_customer_id, earned, earned, NOW())
  ON CONFLICT (customer_id) DO UPDATE SET
    balance = cashback_balance.balance + earned,
    total_earned = cashback_balance.total_earned + earned,
    updated_at = NOW();

  INSERT INTO cashback_transactions (customer_id, type, amount, description)
  VALUES (p_customer_id, 'earned', earned, 'Cashback de ' || cashback_pct || '% na compra');

  SELECT balance INTO current_balance FROM cashback_balance WHERE customer_id = p_customer_id;
  RETURN current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Spend cashback (F3)
-- =============================================
CREATE OR REPLACE FUNCTION spend_cashback(
  p_customer_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT balance INTO current_balance FROM cashback_balance WHERE customer_id = p_customer_id;
  
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo de cashback insuficiente';
  END IF;

  UPDATE cashback_balance SET
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE customer_id = p_customer_id;

  INSERT INTO cashback_transactions (customer_id, type, amount, description)
  VALUES (p_customer_id, 'spent', p_amount, 'Uso de cashback');

  SELECT balance INTO current_balance FROM cashback_balance WHERE customer_id = p_customer_id;
  RETURN current_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Auto-cancel old pending orders (B9)
-- =============================================
CREATE OR REPLACE FUNCTION auto_cancel_pending_orders(
  p_max_minutes INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE orders SET status = 'recusado', updated_at = NOW()
  WHERE status = 'pendente'
    AND created_at < NOW() - (p_max_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Record audit log entry (T8)
-- =============================================
CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_data,
    p_new_data
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Get analytics - Cashflow (R1)
-- =============================================
CREATE OR REPLACE FUNCTION get_cashflow(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date TEXT,
  purchases NUMERIC,
  payments NUMERIC,
  net NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.date,
    COALESCE(SUM(CASE WHEN t.type = 'compra' THEN t.amount ELSE 0 END), 0) as purchases,
    COALESCE(SUM(CASE WHEN t.type = 'pagamento' THEN t.amount ELSE 0 END), 0) as payments,
    COALESCE(SUM(CASE WHEN t.type = 'pagamento' THEN t.amount ELSE -t.amount END), 0) as net
  FROM transactions t
  WHERE t.created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND t.reversed = false
  GROUP BY t.date
  ORDER BY MIN(t.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Get analytics - Customer ranking (R2)
-- =============================================
CREATE OR REPLACE FUNCTION get_customer_ranking(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  total_purchases NUMERIC,
  total_payments NUMERIC,
  current_balance NUMERIC,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COALESCE(SUM(CASE WHEN t.type = 'compra' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'pagamento' THEN t.amount ELSE 0 END), 0),
    c.balance,
    COUNT(t.id)
  FROM customers c
  LEFT JOIN transactions t ON t.customer_id = c.id AND t.reversed = false
  WHERE c.status = 'ativo'
  GROUP BY c.id, c.name, c.balance
  ORDER BY COALESCE(SUM(CASE WHEN t.type = 'compra' THEN t.amount ELSE 0 END), 0) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Get analytics - Product ranking (R3)
-- =============================================
CREATE OR REPLACE FUNCTION get_product_ranking(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category TEXT,
  total_orders BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.category,
    COUNT(DISTINCT o.id),
    COALESCE(SUM(o.amount), 0)
  FROM products p
  LEFT JOIN orders o ON o.description ILIKE '%' || p.name || '%' AND o.status != 'recusado'
  WHERE p.available = true
  GROUP BY p.id, p.name, p.category
  ORDER BY COUNT(DISTINCT o.id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Get analytics - Delinquency (R5)
-- =============================================
CREATE OR REPLACE FUNCTION get_delinquent_customers(p_min_days INTEGER DEFAULT 30)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  phone TEXT,
  balance NUMERIC,
  days_owed BIGINT,
  last_transaction_date TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.balance,
    EXTRACT(DAY FROM NOW() - MAX(t.created_at))::BIGINT,
    MAX(t.date)
  FROM customers c
  JOIN transactions t ON t.customer_id = c.id AND t.type = 'compra' AND t.reversed = false
  WHERE c.balance > 0 AND c.status = 'ativo'
  GROUP BY c.id, c.name, c.phone, c.balance
  HAVING EXTRACT(DAY FROM NOW() - MAX(t.created_at)) >= p_min_days
  ORDER BY c.balance DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Get analytics - Monthly comparison (R6)
-- =============================================
CREATE OR REPLACE FUNCTION get_monthly_comparison()
RETURNS JSON AS $$
DECLARE
  current_month JSON;
  last_month JSON;
BEGIN
  SELECT json_build_object(
    'purchases', COALESCE(SUM(CASE WHEN type = 'compra' THEN amount ELSE 0 END), 0),
    'payments', COALESCE(SUM(CASE WHEN type = 'pagamento' THEN amount ELSE 0 END), 0),
    'count', COUNT(*)
  ) INTO current_month
  FROM transactions
  WHERE created_at >= date_trunc('month', NOW())
    AND reversed = false;

  SELECT json_build_object(
    'purchases', COALESCE(SUM(CASE WHEN type = 'compra' THEN amount ELSE 0 END), 0),
    'payments', COALESCE(SUM(CASE WHEN type = 'pagamento' THEN amount ELSE 0 END), 0),
    'count', COUNT(*)
  ) INTO last_month
  FROM transactions
  WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
    AND created_at < date_trunc('month', NOW())
    AND reversed = false;

  RETURN json_build_object('current_month', current_month, 'last_month', last_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Get analytics - Peak hours (R7)
-- =============================================
CREATE OR REPLACE FUNCTION get_peak_hours(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  hour_of_day INTEGER,
  transaction_count BIGINT,
  total_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM created_at)::INTEGER,
    COUNT(*),
    COALESCE(SUM(amount), 0)
  FROM transactions
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND reversed = false
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY EXTRACT(HOUR FROM created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: Process loyalty points (F7)
-- =============================================
CREATE OR REPLACE FUNCTION process_loyalty_points(
  p_customer_id UUID,
  p_purchase_amount NUMERIC
)
RETURNS INTEGER AS $$
DECLARE
  points_per_real NUMERIC;
  points_earned INTEGER;
BEGIN
  SELECT loyalty_points_per_real INTO points_per_real FROM store_profiles LIMIT 1;
  
  IF points_per_real IS NULL OR points_per_real <= 0 THEN
    RETURN 0;
  END IF;

  points_earned := FLOOR(p_purchase_amount * points_per_real);
  
  UPDATE customers SET
    access_code = COALESCE(access_code, '')
  WHERE id = p_customer_id;

  RETURN points_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
