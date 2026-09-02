-- =============================================
-- FIX COMPLETO - Execute este SQL ÚNICO no SQL Editor
-- =============================================

-- =============================================
-- 1. Criar tabelas que podem estar faltando
-- =============================================

-- conexoes_redes
CREATE TABLE IF NOT EXISTS conexoes_redes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rede_social TEXT NOT NULL CHECK (rede_social IN ('whatsapp', 'telegram', 'instagram', 'facebook', 'tiktok', 'kwai')),
  nome_conexao TEXT NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'erro', 'expirado')),
  whatsapp_instance_id TEXT,
  whatsapp_api_url TEXT,
  whatsapp_api_key TEXT,
  whatsapp_phone_number TEXT,
  whatsapp_qr_code TEXT,
  whatsapp_connected BOOLEAN DEFAULT false,
  telegram_bot_token TEXT,
  telegram_bot_username TEXT,
  meta_access_token TEXT,
  meta_page_id TEXT,
  meta_ig_user_id TEXT,
  meta_app_id TEXT,
  meta_page_name TEXT,
  tiktok_access_token TEXT,
  tiktok_open_id TEXT,
  tiktok_refresh_token TEXT,
  kwai_cookies JSONB,
  kwai_session_id TEXT,
  kwai_username TEXT,
  avatar_url TEXT,
  ultimo_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- campanhas
CREATE TABLE IF NOT EXISTS campanhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'em_progresso', 'pausada', 'concluida', 'cancelada', 'erro')),
  legenda TEXT NOT NULL,
  tipoconteudo TEXT DEFAULT 'texto' CHECK (tipoconteudo IN ('texto', 'imagem', 'video', 'carrossel')),
  canais TEXT[] NOT NULL DEFAULT '{}',
  publico_alvo TEXT DEFAULT 'todos' CHECK (publico_alvo IN ('todos', 'fiado', 'inadimplente', 'ativo', 'canal_especifico')),
  canal_whatsapp_id UUID,
  tags TEXT[],
  agendamento_tipo TEXT DEFAULT 'agora' CHECK (agendamento_tipo IN ('agora', 'agendada', 'recorrente')),
  agendado_para TIMESTAMPTZ,
  recorrencia_cron TEXT,
  whatsapp_delay_segundos INTEGER DEFAULT 20,
  whatsapp_delay_max_segundos INTEGER DEFAULT 30,
  total_enviados INTEGER DEFAULT 0,
  total_sucesso INTEGER DEFAULT 0,
  total_falha INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- campanha_midia
CREATE TABLE IF NOT EXISTS campanha_midia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagem', 'video', 'documento')),
  url TEXT NOT NULL,
  file_path TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- fila_envio
CREATE TABLE IF NOT EXISTS fila_envio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  conexao_id UUID NOT NULL REFERENCES conexoes_redes(id) ON DELETE CASCADE,
  rede_social TEXT NOT NULL,
  destinatario_id TEXT,
  destinatario_nome TEXT,
  destinatario_telefone TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviando', 'sucesso', 'falha', 'cancelado', 'retry')),
  tentativas INTEGER DEFAULT 0,
  max_tentativas INTEGER DEFAULT 3,
  agendado_para TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  resultado JSONB,
  erro_mensagem TEXT,
  external_id TEXT,
  proximo_envio_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- campanha_analytics
CREATE TABLE IF NOT EXISTS campanha_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  fila_item_id UUID REFERENCES fila_envio(id) ON DELETE SET NULL,
  rede_social TEXT NOT NULL,
  destinatario_id TEXT,
  evento TEXT NOT NULL CHECK (evento IN ('entregue', 'lido', 'clicou', 'respondeu', 'errou')),
  dados JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. Criar índices
-- =============================================
CREATE INDEX IF NOT EXISTS idx_conexoes_rede ON conexoes_redes(rede_social);
CREATE INDEX IF NOT EXISTS idx_conexoes_status ON conexoes_redes(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_agendamento ON campanhas(agendado_para) WHERE status = 'agendada';
CREATE INDEX IF NOT EXISTS idx_campanha_midia_campanha ON campanha_midia(campanha_id);
CREATE INDEX IF NOT EXISTS idx_fila_status ON fila_envio(status);
CREATE INDEX IF NOT EXISTS idx_fila_agendado ON fila_envio(agendado_para) WHERE status IN ('pendente', 'retry');
CREATE INDEX IF NOT EXISTS idx_fila_proximo ON fila_envio(proximo_envio_em) WHERE status = 'enviando';
CREATE INDEX IF NOT EXISTS idx_fila_campanha ON fila_envio(campanha_id);
CREATE INDEX IF NOT EXISTS idx_analytics_campanha ON campanha_analytics(campanha_id);
CREATE INDEX IF NOT EXISTS idx_analytics_evento ON campanha_analytics(evento);

-- =============================================
-- 3. Habilitar RLS
-- =============================================
ALTER TABLE conexoes_redes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_midia ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_analytics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Criar políticas RLS (usando auth.uid() para melhor compatibilidade)
-- =============================================

-- Políticas para conexoes_redes
DROP POLICY IF EXISTS "Authenticated full access" ON conexoes_redes;
DROP POLICY IF EXISTS "authenticated_access" ON conexoes_redes;
CREATE POLICY "authenticated_access" ON conexoes_redes FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas para campanhas
DROP POLICY IF EXISTS "Authenticated full access" ON campanhas;
DROP POLICY IF EXISTS "authenticated_access" ON campanhas;
CREATE POLICY "authenticated_access" ON campanhas FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas para campanha_midia
DROP POLICY IF EXISTS "Authenticated full access" ON campanha_midia;
DROP POLICY IF EXISTS "authenticated_access" ON campanha_midia;
CREATE POLICY "authenticated_access" ON campanha_midia FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas para fila_envio
DROP POLICY IF EXISTS "Authenticated full access" ON fila_envio;
DROP POLICY IF EXISTS "authenticated_access" ON fila_envio;
CREATE POLICY "authenticated_access" ON fila_envio FOR ALL USING (auth.uid() IS NOT NULL);

-- Políticas para campanha_analytics
DROP POLICY IF EXISTS "Authenticated full access" ON campanha_analytics;
DROP POLICY IF EXISTS "authenticated_access" ON campanha_analytics;
CREATE POLICY "authenticated_access" ON campanha_analytics FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- 5. Criar triggers para updated_at
-- =============================================
DROP TRIGGER IF EXISTS update_conexoes_redes_updated_at ON conexoes_redes;
CREATE TRIGGER update_conexoes_redes_updated_at BEFORE UPDATE ON conexoes_redes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campanhas_updated_at ON campanhas;
CREATE TRIGGER update_campanhas_updated_at BEFORE UPDATE ON campanhas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fila_envio_updated_at ON fila_envio;
CREATE TRIGGER IF NOT EXISTS update_fila_envio_updated_at BEFORE UPDATE ON fila_envio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. Atualizar RLS policies de todas as outras tabelas para usar auth.uid()
-- =============================================

-- customers
DROP POLICY IF EXISTS "Authenticated full access" ON customers;
DROP POLICY IF EXISTS "authenticated_access" ON customers;
CREATE POLICY "authenticated_access" ON customers FOR ALL USING (auth.uid() IS NOT NULL);

-- transactions
DROP POLICY IF EXISTS "Authenticated full access" ON transactions;
DROP POLICY IF EXISTS "authenticated_access" ON transactions;
CREATE POLICY "authenticated_access" ON transactions FOR ALL USING (auth.uid() IS NOT NULL);

-- orders
DROP POLICY IF EXISTS "Authenticated full access" ON orders;
DROP POLICY IF EXISTS "authenticated_access" ON orders;
CREATE POLICY "authenticated_access" ON orders FOR ALL USING (auth.uid() IS NOT NULL);

-- products
DROP POLICY IF EXISTS "Authenticated full access" ON products;
DROP POLICY IF EXISTS "authenticated_access" ON products;
CREATE POLICY "authenticated_access" ON products FOR ALL USING (auth.uid() IS NOT NULL);

-- store_profiles
DROP POLICY IF EXISTS "Authenticated full access" ON store_profiles;
DROP POLICY IF EXISTS "authenticated_access" ON store_profiles;
CREATE POLICY "authenticated_access" ON store_profiles FOR ALL USING (auth.uid() IS NOT NULL);

-- menu_send_history
DROP POLICY IF EXISTS "Authenticated full access" ON menu_send_history;
DROP POLICY IF EXISTS "authenticated_access" ON menu_send_history;
CREATE POLICY "authenticated_access" ON menu_send_history FOR ALL USING (auth.uid() IS NOT NULL);

-- push_subscriptions
DROP POLICY IF EXISTS "Authenticated full access" ON push_subscriptions;
DROP POLICY IF EXISTS "authenticated_access" ON push_subscriptions;
CREATE POLICY "authenticated_access" ON push_subscriptions FOR ALL USING (auth.uid() IS NOT NULL);

-- notifications
DROP POLICY IF EXISTS "Authenticated full access" ON notifications;
DROP POLICY IF EXISTS "authenticated_access" ON notifications;
CREATE POLICY "authenticated_access" ON notifications FOR ALL USING (auth.uid() IS NOT NULL);

-- comandas
DROP POLICY IF EXISTS "Authenticated full access" ON comandas;
DROP POLICY IF EXISTS "authenticated_access" ON comandas;
CREATE POLICY "authenticated_access" ON comandas FOR ALL USING (auth.uid() IS NOT NULL);

-- comanda_items
DROP POLICY IF EXISTS "Authenticated full access" ON comanda_items;
DROP POLICY IF EXISTS "authenticated_access" ON comanda_items;
CREATE POLICY "authenticated_access" ON comanda_items FOR ALL USING (auth.uid() IS NOT NULL);

-- canais_whatsapp
DROP POLICY IF EXISTS "Authenticated full access" ON canais_whatsapp;
DROP POLICY IF EXISTS "authenticated_access" ON canais_whatsapp;
CREATE POLICY "authenticated_access" ON canais_whatsapp FOR ALL USING (auth.uid() IS NOT NULL);

-- clientes_canal
DROP POLICY IF EXISTS "Authenticated full access" ON clientes_canal;
DROP POLICY IF EXISTS "authenticated_access" ON clientes_canal;
CREATE POLICY "authenticated_access" ON clientes_canal FOR ALL USING (auth.uid() IS NOT NULL);

-- historico_envios
DROP POLICY IF EXISTS "Authenticated full access" ON historico_envios;
DROP POLICY IF EXISTS "authenticated_access" ON historico_envios;
CREATE POLICY "authenticated_access" ON historico_envios FOR ALL USING (auth.uid() IS NOT NULL);

-- audit_log
DROP POLICY IF EXISTS "Authenticated full access" ON audit_log;
DROP POLICY IF EXISTS "authenticated_access" ON audit_log;
CREATE POLICY "authenticated_access" ON audit_log FOR ALL USING (auth.uid() IS NOT NULL);

-- credit_limit_history
DROP POLICY IF EXISTS "Authenticated full access" ON credit_limit_history;
DROP POLICY IF EXISTS "authenticated_access" ON credit_limit_history;
CREATE POLICY "authenticated_access" ON credit_limit_history FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_rules
DROP POLICY IF EXISTS "Authenticated full access" ON cashback_rules;
DROP POLICY IF EXISTS "authenticated_access" ON cashback_rules;
CREATE POLICY "authenticated_access" ON cashback_rules FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_balance
DROP POLICY IF EXISTS "Authenticated full access" ON cashback_balance;
DROP POLICY IF EXISTS "authenticated_access" ON cashback_balance;
CREATE POLICY "authenticated_access" ON cashback_balance FOR ALL USING (auth.uid() IS NOT NULL);

-- cashback_transactions
DROP POLICY IF EXISTS "Authenticated full access" ON cashback_transactions;
DROP POLICY IF EXISTS "authenticated_access" ON cashback_transactions;
CREATE POLICY "authenticated_access" ON cashback_transactions FOR ALL USING (auth.uid() IS NOT NULL);

-- coupons
DROP POLICY IF EXISTS "Authenticated full access" ON coupons;
DROP POLICY IF EXISTS "authenticated_access" ON coupons;
CREATE POLICY "authenticated_access" ON coupons FOR ALL USING (auth.uid() IS NOT NULL);

-- customer_ratings
DROP POLICY IF EXISTS "Authenticated full access" ON customer_ratings;
DROP POLICY IF EXISTS "authenticated_access" ON customer_ratings;
CREATE POLICY "authenticated_access" ON customer_ratings FOR ALL USING (auth.uid() IS NOT NULL);

-- waiting_list
DROP POLICY IF EXISTS "Authenticated full access" ON waiting_list;
DROP POLICY IF EXISTS "authenticated_access" ON waiting_list;
CREATE POLICY "authenticated_access" ON waiting_list FOR ALL USING (auth.uid() IS NOT NULL);

-- notification_templates
DROP POLICY IF EXISTS "Authenticated full access" ON notification_templates;
DROP POLICY IF EXISTS "authenticated_access" ON notification_templates;
CREATE POLICY "authenticated_access" ON notification_templates FOR ALL USING (auth.uid() IS NOT NULL);

-- scheduled_notifications
DROP POLICY IF EXISTS "Authenticated full access" ON scheduled_notifications;
DROP POLICY IF EXISTS "authenticated_access" ON scheduled_notifications;
CREATE POLICY "authenticated_access" ON scheduled_notifications FOR ALL USING (auth.uid() IS NOT NULL);

-- Storage policies
DROP POLICY IF EXISTS "Authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_reads" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_deletes" ON storage.objects;

CREATE POLICY "authenticated_uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_deletes" ON storage.objects
  FOR DELETE USING (bucket_id = 'files' AND auth.uid() IS NOT NULL);

-- =============================================
-- CONCLUÍDO! Execute este script completo e teste novamente
-- =============================================
