-- =============================================
-- 018: CORRIGIR RLS REGRESSÃO
-- Execute os Blocos 1 e 2 separadamente no SQL Editor
-- =============================================

-- BLOCO 1: Dropar políticas antigas
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_rules;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_balance;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON cashback_transactions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON coupons;

-- BLOCO 2: Criar políticas restritivas
CREATE POLICY "Authenticated full access" ON cashback_rules FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON cashback_balance FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON cashback_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON coupons FOR ALL USING (auth.role() = 'authenticated');
