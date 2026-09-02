-- =============================================
-- CHECK_SCHEMA.sql
-- Execute no SQL Editor do Supabase
-- Mostra EXATAMENTE o que existe na tabela customers
-- =============================================

-- 1. Listar colunas reais da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Listar constraints
SELECT 
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'customers'::regclass;

-- 3. Teste INSERT exato como o frontend envia
INSERT INTO customers (
  name,
  credit_limit,
  balance,
  status,
  access_code
) VALUES (
  'TESTE_SCHEMA_CHECK',
  0,
  0,
  'ativo',
  'SCHEMA_CHECK_' || extract(epoch from now())::text
)
RETURNING id, name;

-- 4. Limpar
DELETE FROM customers WHERE name = 'TESTE_SCHEMA_CHECK';
