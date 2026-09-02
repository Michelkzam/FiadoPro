-- =============================================
-- FIX: RLS Policies for Supabase
-- Execute este SQL no SQL Editor do Supabase
-- se os cadastros não estão aparecendo
-- =============================================

-- Primeiro, vamos verificar se existe algum problema com as políticas atuais
-- e corrigir para usar auth.uid() que é mais confiável

-- =============================================
-- 1. Drop all existing restrictive policies
-- =============================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated full access" ON customers;
  DROP POLICY IF EXISTS "Authenticated full access" ON transactions;
  DROP POLICY IF EXISTS "Authenticated full access" ON orders;
  DROP POLICY IF EXISTS "Authenticated full access" ON products;
  DROP POLICY IF EXISTS "Authenticated full access" ON store_profiles;
  DROP POLICY IF EXISTS "Authenticated full access" ON menu_send_history;
  DROP POLICY IF EXISTS "Authenticated full access" ON push_subscriptions;
  DROP POLICY IF EXISTS "Authenticated full access" ON notifications;
  DROP POLICY IF EXISTS "Authenticated full access" ON comandas;
  DROP POLICY IF EXISTS "Authenticated full access" ON comanda_items;
  DROP POLICY IF EXISTS "Authenticated full access" ON canais_whatsapp;
  DROP POLICY IF EXISTS "Authenticated full access" ON clientes_canal;
  DROP POLICY IF EXISTS "Authenticated full access" ON historico_envios;
  DROP POLICY IF EXISTS "Authenticated full access" ON audit_log;
  DROP POLICY IF EXISTS "Authenticated full access" ON credit_limit_history;
  DROP POLICY IF EXISTS "Authenticated full access" ON cashback_rules;
  DROP POLICY IF EXISTS "Authenticated full access" ON cashback_balance;
  DROP POLICY IF EXISTS "Authenticated full access" ON cashback_transactions;
  DROP POLICY IF EXISTS "Authenticated full access" ON coupons;
  DROP POLICY IF EXISTS "Authenticated full access" ON customer_ratings;
  DROP POLICY IF EXISTS "Authenticated full access" ON waiting_list;
  DROP POLICY IF EXISTS "Authenticated full access" ON notification_templates;
  DROP POLICY IF EXISTS "Authenticated full access" ON scheduled_notifications;
  DROP POLICY IF EXISTS "Authenticated full access" ON conexoes_redes;
  DROP POLICY IF EXISTS "Authenticated full access" ON campanhas;
  DROP POLICY IF EXISTS "Authenticated full access" ON campanha_midia;
  DROP POLICY IF EXISTS "Authenticated full access" ON fila_envio;
  DROP POLICY IF EXISTS "Authenticated full access" ON campanha_analytics;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Also drop old permissive policies if they still exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON orders;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON products;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON store_profiles;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_send_history;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON push_subscriptions;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON notifications;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON comandas;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON comanda_items;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON canais_whatsapp;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON clientes_canal;
  DROP POLICY IF EXISTS "Allow all for authenticated users" ON historico_envios;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================
-- 2. Create new permissive policies for authenticated users
-- Using auth.uid() which is more reliable in Supabase
-- =============================================

-- customers
CREATE POLICY "authenticated_access" ON customers
  FOR ALL USING (auth.uid() IS NOT NULL);

-- transactions
CREATE POLICY "authenticated_access" ON transactions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- orders
CREATE POLICY "authenticated_access" ON orders
  FOR ALL USING (auth.uid() IS NOT NULL);

-- products
CREATE POLICY "authenticated_access" ON products
  FOR ALL USING (auth.uid() IS NOT NULL);

-- store_profiles
CREATE POLICY "authenticated_access" ON store_profiles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- menu_send_history
CREATE POLICY "authenticated_access" ON menu_send_history
  FOR ALL USING (auth.uid() IS NOT NULL);

-- push_subscriptions
CREATE POLICY "authenticated_access" ON push_subscriptions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- notifications
CREATE POLICY "authenticated_access" ON notifications
  FOR ALL USING (auth.uid() IS NOT NULL);

-- comandas
CREATE POLICY "authenticated_access" ON comandas
  FOR ALL USING (auth.uid() IS NOT NULL);

-- comanda_items
CREATE POLICY "authenticated_access" ON comanda_items
  FOR ALL USING (auth.uid() IS NOT NULL);

-- canais_whatsapp
CREATE POLICY "authenticated_access" ON canais_whatsapp
  FOR ALL USING (auth.uid() IS NOT NULL);

-- clientes_canal
CREATE POLICY "authenticated_access" ON clientes_canal
  FOR ALL USING (auth.uid() IS NOT NULL);

-- historico_envios
CREATE POLICY "authenticated_access" ON historico_envios
  FOR ALL USING (auth.uid() IS NOT NULL);

-- audit_log
CREATE POLICY "authenticated_access" ON audit_log
  FOR ALL USING (auth.uid() IS NOT NULL);

-- credit_limit_history
CREATE POLICY "authenticated_access" ON credit_limit_history
  FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_rules
CREATE POLICY "authenticated_access" ON cashback_rules
  FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_balance
CREATE POLICY "authenticated_access" ON cashback_balance
  FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_transactions
CREATE POLICY "authenticated_access" ON cashback_transactions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- coupons
CREATE POLICY "authenticated_access" ON coupons
  FOR ALL USING (auth.uid() IS NOT NULL);

-- customer_ratings
CREATE POLICY "authenticated_access" ON customer_ratings
  FOR ALL USING (auth.uid() IS NOT NULL);

-- waiting_list
CREATE POLICY "authenticated_access" ON waiting_list
  FOR ALL USING (auth.uid() IS NOT NULL);

-- notification_templates
CREATE POLICY "authenticated_access" ON notification_templates
  FOR ALL USING (auth.uid() IS NOT NULL);

-- scheduled_notifications
CREATE POLICY "authenticated_access" ON scheduled_notifications
  FOR ALL USING (auth.uid() IS NOT NULL);

-- conexoes_redes
CREATE POLICY "authenticated_access" ON conexoes_redes
  FOR ALL USING (auth.uid() IS NOT NULL);

-- campanhas
CREATE POLICY "authenticated_access" ON campanhas
  FOR ALL USING (auth.uid() IS NOT NULL);

-- campanha_midia
CREATE POLICY "authenticated_access" ON campanha_midia
  FOR ALL USING (auth.uid() IS NOT NULL);

-- fila_envio
CREATE POLICY "authenticated_access" ON fila_envio
  FOR ALL USING (auth.uid() IS NOT NULL);

-- campanha_analytics
CREATE POLICY "authenticated_access" ON campanha_analytics
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- 3. Storage policies
-- =============================================
DROP POLICY IF EXISTS "Authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated deletes" ON storage.objects;

CREATE POLICY "authenticated_uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

-- =============================================
-- CONCLUÍDO!
-- Execute este script e teste o sistema novamente
-- =============================================
