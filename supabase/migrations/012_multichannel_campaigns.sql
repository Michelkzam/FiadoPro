-- =============================================
-- 012: Multi-Channel Campaigns System
-- =============================================

-- =============================================
-- 1. conexoes_redes (Social Network Connections)
-- =============================================
CREATE TABLE IF NOT EXISTS conexoes_redes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rede_social TEXT NOT NULL CHECK (rede_social IN ('whatsapp', 'telegram', 'instagram', 'facebook', 'tiktok', 'kwai')),
  nome_conexao TEXT NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'erro', 'expirado')),
  
  -- WhatsApp (Baileys / Evolution API)
  whatsapp_instance_id TEXT,
  whatsapp_api_url TEXT,
  whatsapp_api_key TEXT,
  whatsapp_phone_number TEXT,
  whatsapp_qr_code TEXT,
  whatsapp_connected BOOLEAN DEFAULT false,
  
  -- Telegram Bot API
  telegram_bot_token TEXT,
  telegram_bot_username TEXT,
  
  -- Instagram / Facebook (Meta Graph API)
  meta_access_token TEXT,
  meta_page_id TEXT,
  meta_ig_user_id TEXT,
  meta_app_id TEXT,
  meta_page_name TEXT,
  
  -- TikTok
  tiktok_access_token TEXT,
  tiktok_open_id TEXT,
  tiktok_refresh_token TEXT,
  
  -- Kwai
  kwai_cookies JSONB,
  kwai_session_id TEXT,
  kwai_username TEXT,
  
  -- Meta
  avatar_url TEXT,
  ultimo_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conexoes_rede ON conexoes_redes(rede_social);
CREATE INDEX IF NOT EXISTS idx_conexoes_status ON conexoes_redes(status);

-- =============================================
-- 2. campanhas (Campaigns)
-- =============================================
CREATE TABLE IF NOT EXISTS campanhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'em_progresso', 'pausada', 'concluida', 'cancelada', 'erro')),
  
  -- Content
  legenda TEXT NOT NULL,
  tipoconteudo TEXT DEFAULT 'texto' CHECK (tipoconteudo IN ('texto', 'imagem', 'video', 'carrossel')),
  
  -- Targeting
  canais TEXT[] NOT NULL DEFAULT '{}',
  publico_alvo TEXT DEFAULT 'todos' CHECK (publico_alvo IN ('todos', 'fiado', 'inadimplente', 'ativo', 'canal_especifico')),
  canal_whatsapp_id UUID,
  tags TEXT[],
  
  -- Scheduling
  agendamento_tipo TEXT DEFAULT 'agora' CHECK (agendamento_tipo IN ('agora', 'agendada', 'recorrente')),
  agendado_para TIMESTAMPTZ,
  recorrencia_cron TEXT,
  
  -- WhatsApp Config
  whatsapp_delay_segundos INTEGER DEFAULT 20,
  whatsapp_delay_max_segundos INTEGER DEFAULT 30,
  
  -- Stats
  total_enviados INTEGER DEFAULT 0,
  total_sucesso INTEGER DEFAULT 0,
  total_falha INTEGER DEFAULT 0,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_agendamento ON campanhas(agendado_para) WHERE status = 'agendada';

-- =============================================
-- 3. campanha_midia (Campaign Media)
-- =============================================
CREATE TABLE IF NOT EXISTS campanha_midia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagem', 'video', 'documento')),
  url TEXT NOT NULL,
  file_path TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanha_midia_campanha ON campanha_midia(campanha_id);

-- =============================================
-- 4. fila_envio (Send Queue)
-- =============================================
CREATE TABLE IF NOT EXISTS fila_envio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campanha_id UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
  conexao_id UUID NOT NULL REFERENCES conexoes_redes(id) ON DELETE CASCADE,
  rede_social TEXT NOT NULL,
  
  -- Recipient
  destinatario_id TEXT,
  destinatario_nome TEXT,
  destinatario_telefone TEXT,
  
  -- Status
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviando', 'sucesso', 'falha', 'cancelado', 'retry')),
  tentativas INTEGER DEFAULT 0,
  max_tentativas INTEGER DEFAULT 3,
  
  -- Scheduling
  agendado_para TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  
  -- Result
  resultado JSONB,
  erro_mensagem TEXT,
  external_id TEXT,
  
  -- WhatsApp delay
  proximo_envio_em TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fila_status ON fila_envio(status);
CREATE INDEX IF NOT EXISTS idx_fila_agendado ON fila_envio(agendado_para) WHERE status IN ('pendente', 'retry');
CREATE INDEX IF NOT EXISTS idx_fila_proximo ON fila_envio(proximo_envio_em) WHERE status = 'enviando';
CREATE INDEX IF NOT EXISTS idx_fila_campanha ON fila_envio(campanha_id);

-- =============================================
-- 5. campanha_analytics (Per-recipient tracking)
-- =============================================
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

CREATE INDEX IF NOT EXISTS idx_analytics_campanha ON campanha_analytics(campanha_id);
CREATE INDEX IF NOT EXISTS idx_analytics_evento ON campanha_analytics(evento);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE conexoes_redes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_midia ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'conexoes_redes') THEN
    CREATE POLICY "Authenticated full access" ON conexoes_redes FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'campanhas') THEN
    CREATE POLICY "Authenticated full access" ON campanhas FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'campanha_midia') THEN
    CREATE POLICY "Authenticated full access" ON campanha_midia FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'fila_envio') THEN
    CREATE POLICY "Authenticated full access" ON fila_envio FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'campanha_analytics') THEN
    CREATE POLICY "Authenticated full access" ON campanha_analytics FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- =============================================
-- Triggers
-- =============================================
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_conexoes_redes_updated_at ON conexoes_redes;
  CREATE TRIGGER update_conexoes_redes_updated_at BEFORE UPDATE ON conexoes_redes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_campanhas_updated_at ON campanhas;
  CREATE TRIGGER update_campanhas_updated_at BEFORE UPDATE ON campanhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_fila_envio_updated_at ON fila_envio;
  CREATE TRIGGER update_fila_envio_updated_at BEFORE UPDATE ON fila_envio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN OTHERS THEN NULL; END $$;
