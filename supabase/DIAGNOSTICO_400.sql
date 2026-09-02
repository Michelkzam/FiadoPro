-- =============================================
-- DIAGNOSTICO_400.sql
-- Execute este script no SQL Editor do Supabase
-- para descobrir por que o INSERT está falhando
-- =============================================

-- 1. Listar TODAS as colunas da tabela customers
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Listar TODAS as constraints da tabela customers
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'customers'::regclass;

-- 3. Listar TODAS as policies (RLS) da tabela customers
SELECT 
  policyname,
  cmd AS operation,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies 
WHERE tablename = 'customers';

-- 4. Listar TODAS as triggers da tabela customers
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'customers';

-- 5. TESTE INSERT - Replica EXATAMENTE o que o código frontend envia
-- Se falhar, vai mostrar a mensagem de erro exata
DO $$
DECLARE
  test_id UUID;
  test_code TEXT;
BEGIN
  test_code := upper(md5(random()::text));
  
  BEGIN
    INSERT INTO customers (
      name,
      cpf,
      phone,
      email,
      cep,
      address,
      neighborhood,
      city,
      state,
      credit_limit,
      balance,
      status,
      access_code
    ) VALUES (
      'TESTE_DIAGNOSTICO',
      '000.000.000-00',
      '(00) 00000-0000',
      'teste@teste.com',
      '00000-000',
      'Rua Teste, 123',
      'Bairro Teste',
      'Cidade Teste',
      'SP',
      100.50,
      0,
      'ativo',
      test_code
    )
    RETURNING id INTO test_id;
    
    RAISE NOTICE '✅ INSERT funcionou! ID: %', test_id;
    
    -- Limpar o registro de teste
    DELETE FROM customers WHERE id = test_id;
    RAISE NOTICE '✅ DELETE funcionou! Registro de teste removido';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ INSERT FALHOU: %', SQLERRM;
    RAISE WARNING '🔍 Diagnóstico: verifique se TODAS as colunas acima existem na tabela';
  END;
END $$;
