-- =============================================
-- WhatsApp Channels - Tabelas para Canais
-- =============================================

-- Tabela: canais_whatsapp (Canais do WhatsApp)
CREATE TABLE IF NOT EXISTS canais_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_channel_id TEXT,
  nome_canal TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  ultima_mensagem TEXT,
  ultima_envio TIMESTAMPTZ,
  total_enviados INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: clientes_canal (Clientes vinculados aos canais)
CREATE TABLE IF NOT EXISTS clientes_canal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canal_id UUID NOT NULL REFERENCES canais_whatsapp(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: historico_envios (Histórico de mensagens enviadas)
CREATE TABLE IF NOT EXISTS historico_envios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canal_id UUID REFERENCES canais_whatsapp(id) ON DELETE SET NULL,
  tipo_mensagem TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  total_destinatarios INTEGER DEFAULT 0,
  sucesso INTEGER DEFAULT 0,
  falha INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_canal_canal ON clientes_canal(canal_id);
CREATE INDEX IF NOT EXISTS idx_clientes_canal_cliente ON clientes_canal(cliente_id);
CREATE INDEX IF NOT EXISTS idx_historico_envios_canal ON historico_envios(canal_id);
CREATE INDEX IF NOT EXISTS idx_historico_envios_criado ON historico_envios(criado_em DESC);

-- RLS
ALTER TABLE canais_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON canais_whatsapp FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON clientes_canal FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON historico_envios FOR ALL USING (true);

-- Triggers
CREATE TRIGGER update_canais_whatsapp_updated_at BEFORE UPDATE ON canais_whatsapp
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
