-- =============================================
-- 020: Fix RLS Policies on WhatsApp Tables
-- PROBLEMA: Políticas USING (true) permitem que
-- qualquer usuário autenticado acesse/modify
-- dados de WhatsApp de outros usuários.
-- SOLUÇÃO: Usar auth.role() = 'authenticated'
-- (consistente com outras tabelas) + webhooks
-- devem usar service_role key (bypass RLS).
-- =============================================

-- =============================================
-- wa_sessions
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON wa_sessions;
DROP POLICY IF EXISTS "Public update for webhooks" ON wa_sessions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'wa_sessions') THEN
    CREATE POLICY "Authenticated full access" ON wa_sessions FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- wa_conversas
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON wa_conversas;
DROP POLICY IF EXISTS "Public insert for webhooks" ON wa_conversas;
DROP POLICY IF EXISTS "Public update for webhooks" ON wa_conversas;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'wa_conversas') THEN
    CREATE POLICY "Authenticated full access" ON wa_conversas FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- wa_mensagens
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON wa_mensagens;
DROP POLICY IF EXISTS "Public insert for webhooks" ON wa_mensagens;
DROP POLICY IF EXISTS "Public update for webhooks" ON wa_mensagens;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'wa_mensagens') THEN
    CREATE POLICY "Authenticated full access" ON wa_mensagens FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- wa_fluxos
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON wa_fluxos;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'wa_fluxos') THEN
    CREATE POLICY "Authenticated full access" ON wa_fluxos FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- wa_respostas_rapidas
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON wa_respostas_rapidas;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'wa_respostas_rapidas') THEN
    CREATE POLICY "Authenticated full access" ON wa_respostas_rapidas FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- wa_fila_atendimento
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON wa_fila_atendimento;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'wa_fila_atendimento') THEN
    CREATE POLICY "Authenticated full access" ON wa_fila_atendimento FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- wa_analytics
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON wa_analytics;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'wa_analytics') THEN
    CREATE POLICY "Authenticated full access" ON wa_analytics FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- NOTA: Webhooks do WhatsApp que usam a ANON KEY
-- precisam ser atualizados para usar a SERVICE_ROLE KEY
-- para bypassar RLS. Atualizar:
--   api/whatsapp/webhook.js
--   api/whatsapp/agent-webhook.js
-- para usar SUPABASE_SERVICE_ROLE_KEY em vez de
-- VITE_SUPABASE_ANON_KEY.
-- =============================================
