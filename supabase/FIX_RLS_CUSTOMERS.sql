-- =============================================
-- FIX_RLS_CUSTOMERS.sql
-- Execute este script no SQL Editor do Supabase
-- para verificar e corrigir as policies da tabela customers
-- =============================================

-- =============================================
-- 1. Verificar se a tabela customers existe
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'customers' AND schemaname = 'public') THEN
    RAISE EXCEPTION 'Tabela customers NÃO existe! Execute o script FULL_MIGRATION.sql primeiro.';
  END IF;
  RAISE NOTICE 'Tabela customers existe ✓';
END $$;

-- =============================================
-- 2. Verificar se RLS está habilitado
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'customers' 
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado na tabela customers ✓';
  ELSE
    RAISE NOTICE 'RLS já está habilitado ✓';
  END IF;
END $$;

-- =============================================
-- 3. Remover TODAS as policies existentes na tabela customers
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
DROP POLICY IF EXISTS "Authenticated full access" ON customers;
DROP POLICY IF EXISTS "authenticated_access" ON customers;
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON customers;
DROP POLICY IF EXISTS "customers_update_policy" ON customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON customers;
DROP POLICY IF EXISTS "customers_select" ON customers;
DROP POLICY IF EXISTS "customers_insert" ON customers;
DROP POLICY IF EXISTS "customers_update" ON customers;
DROP POLICY IF EXISTS "customers_delete" ON customers;

DO $$ BEGIN
  RAISE NOTICE 'Todas as policies removidas ✓';
END $$;

-- =============================================
-- 4. Criar NOVAS policies permissivas para usuários autenticados
-- =============================================

-- Policy para SELECT (leitura)
CREATE POLICY "customers_select" ON customers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy para INSERT (criação)
CREATE POLICY "customers_insert" ON customers
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy para UPDATE (atualização)
CREATE POLICY "customers_update" ON customers
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy para DELETE (exclusão)
CREATE POLICY "customers_delete" ON customers
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

DO $$ BEGIN
  RAISE NOTICE 'Novas policies criadas ✓';
END $$;

-- =============================================
-- 5. Verificar se as policies foram criadas
-- =============================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'customers'
  AND schemaname = 'public';
  
  RAISE NOTICE 'Total de policies na tabela customers: %', policy_count;
  
  IF policy_count < 4 THEN
    RAISE WARNING 'Esperado 4 policies (SELECT, INSERT, UPDATE, DELETE), encontrado %', policy_count;
  END IF;
END $$;

-- =============================================
-- 6. Testar INSERT (simular cadastro)
-- =============================================
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Tentar inserir um registro de teste
  INSERT INTO customers (name, status, balance, access_code)
  VALUES ('TESTE_RLS_DELETE_ME', 'ativo', 0, 'TEST123')
  RETURNING id INTO test_id;
  
  -- Se sucesso, deletar o registro de teste
  IF test_id IS NOT NULL THEN
    DELETE FROM customers WHERE id = test_id;
    RAISE NOTICE 'TESTE INSERT/DELETE: Sucesso! Policies funcionando corretamente ✓';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'TESTE INSERT: FALHOU - %', SQLERRM;
  RAISE WARNING 'Verifique se a tabela customers existe e se as policies estão corretas';
END $$;

-- =============================================
-- CONCLUÍDO!
-- Se você viu "TESTE INSERT/DELETE: Sucesso!", as policies estão OK
-- Se viu "TESTE INSERT: FALHOU", execute o script FULL_MIGRATION.sql
-- =============================================
