-- =============================================
-- FiadoPro - VERIFICAÇÃO PÓS-MIGRATION
-- Execute este SQL no SQL Editor do Supabase
-- para verificar se todas as estruturas foram criadas
-- =============================================

-- =============================================
-- 1. VERIFICAR TABELAS (22 esperadas)
-- =============================================
SELECT 
  'TABELAS' as categoria,
  COUNT(*) as total_encontrado,
  22 as total_esperado,
  CASE WHEN COUNT(*) = 22 THEN '✅ OK' ELSE '❌ FALTANDO' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Listar todas as tabelas
SELECT 
  table_name as nome_tabela,
  CASE 
    WHEN table_name IN (
      'customers', 'transactions', 'orders', 'products', 
      'store_profiles', 'menu_send_history', 'comandas', 'comanda_items',
      'canais_whatsapp', 'clientes_canal', 'historico_envios',
      'push_subscriptions', 'notifications', 'audit_log', 'credit_limit_history',
      'cashback_rules', 'cashback_balance', 'cashback_transactions',
      'coupons', 'customer_ratings', 'waiting_list', 'notification_templates'
    ) THEN '✅'
    ELSE '⚠️ EXTRA'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =============================================
-- 2. VERIFICAR FUNÇÕES/RPCs (16 esperadas)
-- =============================================
SELECT 
  'FUNÇÕES' as categoria,
  COUNT(*) as total_encontrado,
  16 as total_esperado,
  CASE WHEN COUNT(*) >= 16 THEN '✅ OK' ELSE '❌ FALTANDO' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Listar todas as funções
SELECT 
  routine_name as nome_funcao,
  data_type as tipo_retorno
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- =============================================
-- 3. VERIFICAR TRIGGERS (7 esperados)
-- =============================================
SELECT 
  'TRIGGERS' as categoria,
  COUNT(*) as total_encontrado,
  7 as total_esperado,
  CASE WHEN COUNT(*) >= 7 THEN '✅ OK' ELSE '❌ FALTANDO' END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Listar todos os triggers
SELECT 
  trigger_name as nome_trigger,
  event_object_table as tabela,
  action_timing as timing,
  event_manipulation as evento
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =============================================
-- 4. VERIFICAR RLS (22 tabelas com RLS)
-- =============================================
SELECT 
  'RLS' as categoria,
  COUNT(*) as total_encontrado,
  22 as total_esperado,
  CASE WHEN COUNT(*) = 22 THEN '✅ OK' ELSE '❌ FALTANDO' END as status
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Listar tabelas sem RLS
SELECT 
  tablename as tabela_sem_rls
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- =============================================
-- 5. VERIFICAR POLÍTICAS RLS
-- =============================================
SELECT 
  'POLÍTICAS' as categoria,
  COUNT(*) as total_politicas,
  CASE WHEN COUNT(*) >= 22 THEN '✅ OK' ELSE '⚠️ VERIFICAR' END as status
FROM pg_policies 
WHERE schemaname = 'public';

-- Listar políticas por tabela
SELECT 
  tablename as tabela,
  policyname as politica,
  cmd as operacao
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- 6. VERIFICAR ÍNDICES
-- =============================================
SELECT 
  'ÍNDICES' as categoria,
  COUNT(*) as total_indices,
  CASE WHEN COUNT(*) >= 30 THEN '✅ OK' ELSE '⚠️ VERIFICAR' END as status
FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- =============================================
-- 7. VERIFICAR STORAGE POLICIES
-- =============================================
SELECT 
  'STORAGE' as categoria,
  COUNT(*) as total_politicas_storage,
  CASE WHEN COUNT(*) >= 3 THEN '✅ OK' ELSE '❌ FALTANDO' END as status
FROM pg_policies 
WHERE schemaname = 'storage';

-- =============================================
-- 8. RESUMO FINAL
-- =============================================
SELECT 
  '========================================' as separador
UNION ALL
SELECT 
  'RESUMO DA MIGRATION' as separador
UNION ALL
SELECT 
  '========================================' as separador;

-- Contagem total de objetos
SELECT 
  'Tabelas' as objeto,
  COUNT(*) as quantidade
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
  'Funções' as objeto,
  COUNT(*) as quantidade
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
UNION ALL
SELECT 
  'Triggers' as objeto,
  COUNT(*) as quantidade
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
  'Políticas RLS' as objeto,
  COUNT(*) as quantidade
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Índices' as objeto,
  COUNT(*) as quantidade
FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
