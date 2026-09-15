-- =============================================
-- 018: CORRIGIR RLS REGRESSÃO
-- =============================================

-- BLOCO 1: Dropar políticas antigas
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_rules;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_balance;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_transactions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON coupons;

-- BLOCO 2: Criar políticas restritivas (idempotente)
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
