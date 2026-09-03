-- =============================================
-- 017: WhatsApp AI Agent - Engine Baileys/ Evolution API
-- =============================================

-- =============================================
-- Tabela: wa_sessions (Sessões WhatsApp)
-- =============================================
CREATE TABLE IF NOT EXISTS wa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE DEFAULT 'DEFAULT_SESSION',
  status TEXT DEFAULT 'desconectado' CHECK (status IN ('aguardando_qr', 'conectado', 'desconectado', 'erro')),
  phone_number TEXT,
  instance_id TEXT,
  api_url TEXT DEFAULT 'https://api.evolutionapi.com.br',
  api_key TEXT,
  provider TEXT DEFAULT 'evolution' CHECK (provider IN ('evolution', 'baileys', 'zapi')),
  qr_code TEXT,
  connected_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  robot_active BOOLEAN DEFAULT true,
  human_mode BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: wa_conversas (Conversas Ativas)
-- =============================================
CREATE TABLE IF NOT EXISTS wa_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT DEFAULT 'DEFAULT_SESSION',
  phone_number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'transbordo_humano', 'finalizada', 'arquivada')),
  flow_state TEXT DEFAULT 'menu_inicial',
  context JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  protocol TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: wa_mensagens (Histórico de Mensagens)
-- =============================================
CREATE TABLE IF NOT EXISTS wa_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES wa_conversas(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'template')),
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  agent_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: wa_fluxos (Fluxos de Atendimento)
-- =============================================
CREATE TABLE IF NOT EXISTS wa_fluxos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT DEFAULT 'crm_vendas' CHECK (domain IN ('crm_vendas', 'helpdesk', 'agendamento', 'custom')),
  flow_data JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: wa_respostas_rapidas (Respostas Rápidas)
-- =============================================
CREATE TABLE IF NOT EXISTS wa_respostas_rapidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_keyword TEXT NOT NULL,
  response_text TEXT NOT NULL,
  category TEXT DEFAULT 'geral',
  active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: wa_fila_atendimento (Fila de Transbordo Humano)
-- =============================================
CREATE TABLE IF NOT EXISTS wa_fila_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES wa_conversas(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  reason TEXT,
  status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'atendendo', 'finalizado')),
  assigned_to TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: wa_analytics (Métricas do Agent)
-- =============================================
CREATE TABLE IF NOT EXISTS wa_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  total_conversas INTEGER DEFAULT 0,
  resolvidas_bot INTEGER DEFAULT 0,
  transbordo_humano INTEGER DEFAULT 0,
  tempo_medio_resposta_ms INTEGER DEFAULT 0,
  mensagens_recebidas INTEGER DEFAULT 0,
  mensagens_enviadas INTEGER DEFAULT 0,
  pedidos_criados INTEGER DEFAULT 0,
  pagamentos_registrados INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Índices
-- =============================================
CREATE INDEX IF NOT EXISTS idx_wa_sessions_status ON wa_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_session_id ON wa_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_phone ON wa_conversas(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_status ON wa_conversas(status);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_customer ON wa_conversas(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_mensagens_conversa ON wa_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_wa_mensagens_created ON wa_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_fila_status ON wa_fila_atendimento(status);
CREATE INDEX IF NOT EXISTS idx_wa_analytics_date ON wa_analytics(date DESC);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_fluxos ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_respostas_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_fila_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON wa_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_conversas FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_mensagens FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_fluxos FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_respostas_rapidas FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_fila_atendimento FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON wa_analytics FOR ALL USING (true);

-- Políticas públicas para webhook do Evolution API (sem auth)
CREATE POLICY "Public insert for webhooks" ON wa_mensagens FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for webhooks" ON wa_mensagens FOR UPDATE USING (true);
CREATE POLICY "Public insert for webhooks" ON wa_conversas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update for webhooks" ON wa_conversas FOR UPDATE USING (true);
CREATE POLICY "Public update for webhooks" ON wa_sessions FOR UPDATE USING (true);

-- =============================================
-- Triggers para updated_at
-- =============================================
DROP TRIGGER IF EXISTS update_wa_sessions_updated_at ON wa_sessions;
CREATE TRIGGER update_wa_sessions_updated_at BEFORE UPDATE ON wa_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wa_conversas_updated_at ON wa_conversas;
CREATE TRIGGER update_wa_conversas_updated_at BEFORE UPDATE ON wa_conversas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wa_fluxos_updated_at ON wa_fluxos;
CREATE TRIGGER update_wa_fluxos_updated_at BEFORE UPDATE ON wa_fluxos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Dados iniciais: Fluxo padrão CRM/Vendas (FiadoPro)
-- =============================================
INSERT INTO wa_fluxos (name, description, domain, flow_data, active, priority) VALUES
('Fluxo Padrão FiadoPro', 'Atendimento automatizado para comércio com crédito/fiado', 'crm_vendas',
'{
  "initial_menu": {
    "message": "Olá! Bem-vindo(a) ao *{store_name}*! 👋\\n\\nComo posso ajudar?\\n\\n1️⃣ Ver meu saldo e débitos\\n2️⃣ Fazer um pedido\\n3️⃣ Registrar pagamento\\n4️⃣ Ver cardápio/produtos\\n5️⃣ Falar com atendente\\n\\nDigite o número da opção desejada.",
    "options": {
      "1": "saldo",
      "2": "pedido",
      "3": "pagamento",
      "4": "cardapio",
      "5": "transbordo_humano"
    }
  },
  "saldo": {
    "message": "Para consultar seu saldo, preciso do seu *CPF*:\\n\\nDigite apenas os números do CPF.",
    "next": "validar_cpf_saldo",
    "collect_field": "cpf"
  },
  "validar_cpf_saldo": {
    "action": "lookup_customer_by_cpf",
    "on_found": "saldo_resultado",
    "on_not_found": "cpf_nao_encontrado"
  },
  "saldo_resultado": {
    "message": "📋 *Dados da sua conta:*\\n\\nNome: {customer_name}\\nSaldo devedor: *{balance}*\\nLimite de crédito: *{credit_limit}*\\n\\nDeseja algo mais?\\n1️⃣ Fazer pedido\\n2️⃣ Registrar pagamento\\n3️⃣ Voltar ao menu\\n4️⃣ Sair",
    "options": {
      "1": "pedido",
      "2": "pagamento",
      "3": "menu_inicial",
      "4": "despedida"
    }
  },
  "pedido": {
    "message": "Pedido realizado! 🛒\\n\\nEnvie os itens desejados ou acesse nosso cardápio:\\n\\n1️⃣ Ver cardápio\\n2️⃣ Digitar pedido livre\\n3️⃣ Voltar ao menu",
    "options": {
      "1": "cardapio",
      "2": "pedido_livre",
      "3": "menu_inicial"
    }
  },
  "pedido_livre": {
    "message": "Digite seu pedido. Ex: *2x Hambúrguer, 1x Refri*\\n\\n(Envie sua mensagem com o pedido)",
    "next": "confirmar_pedido",
    "collect_field": "pedido_descricao"
  },
  "confirmar_pedido": {
    "action": "create_order",
    "message": "✅ Pedido registrado!\\n\\nDescrição: {order_description}\\nValor: *{order_amount}*\\nStatus: Aguardando aprovação\\n\\nVocê receberá uma confirmação em breve!",
    "next": "menu_inicial"
  },
  "pagamento": {
    "message": "💰 *Registrar Pagamento*\\n\\nEnvie o valor que deseja pagar.\\n\\nEx: *150,00*\\n\\nOu envie *pix* para ver nossas chaves.",
    "next": "processar_pagamento",
    "collect_field": "valor_pagamento"
  },
  "processar_pagamento": {
    "action": "register_payment",
    "message": "✅ Pagamento de *{payment_amount}* registrado!\\n\\nNovo saldo: *{new_balance}*\\n\\nObrigado! 🙏",
    "next": "menu_inicial"
  },
  "cardapio": {
    "action": "fetch_products",
    "message": "📋 *Nosso Cardápio:*\\n\\n{product_list}\\n\\nPara fazer um pedido, digite o nome do produto.",
    "next": "pedido_livre"
  },
  "transbordo_humano": {
    "action": "transfer_to_human",
    "message": "👨‍💼 Entendi! Vou transferir para um atendente.\\n\\nAguarde um momento, em breve alguém irá atendê-lo.\\n\\n📋 Protocolo: {protocol}"
  },
  "cpf_nao_encontrado": {
    "message": "❌ CPF não encontrado em nossa base.\\n\\nDeseja:\\n1️⃣ Cadastrar-se\\n2️⃣ Tentar novamente\\n3️⃣ Falar com atendente",
    "options": {
      "1": "cadastro",
      "2": "saldo",
      "3": "transbordo_humano"
    }
  },
  "cadastro": {
    "message": "📝 *Cadastro Rápido*\\n\\nPreciso de algumas informações:\\n\\n1️⃣ Nome completo\\n2️⃣ Telefone (WhatsApp)\\n3️⃣ Endereço\\n\\nComece pelo *nome completo*:",
    "next": "coletar_cadastro_nome",
    "collect_field": "customer_name"
  },
  "coletar_cadastro_nome": {
    "next": "coletar_cadastro_telefone",
    "collect_field": "customer_phone"
  },
  "coletar_cadastro_telefone": {
    "next": "coletar_cadastro_endereco",
    "collect_field": "customer_address"
  },
  "coletar_cadastro_endereco": {
    "action": "create_customer",
    "message": "✅ Cadastro realizado!\\n\\nBem-vindo(a), *{customer_name}*!\\nSeu código de acesso: *{access_code}*\\n\\nUse seu CPF + código para acessar o portal.",
    "next": "menu_inicial"
  },
  "despedida": {
    "message": "Obrigado por nos contatar! 😊\\n\\n*{store_name}* - Estamos aqui quando precisar!\\nAté mais! 👋",
    "action": "end_conversation"
  },
  "fallback": {
    "message": "🤔 Não entendi sua mensagem.\\n\\nPor favor, digite um número de 1 a 5 ou envie sua dúvida.\\n\\nDigite *0* para falar com um atendente.",
    "next": "menu_inicial"
  }
}',
true, 1)
ON CONFLICT DO NOTHING;

-- =============================================
-- RPCs para o AI Agent
-- =============================================

-- Buscar sessão ativa
CREATE OR REPLACE FUNCTION wa_get_session(p_session_id TEXT DEFAULT 'DEFAULT_SESSION')
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT row_to_json(s) INTO result
  FROM wa_sessions s
  WHERE s.session_id = p_session_id;
  
  IF result IS NULL THEN
    result := '{}'::json;
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar ou atualizar sessão
CREATE OR REPLACE FUNCTION wa_upsert_session(
  p_session_id TEXT DEFAULT 'DEFAULT_SESSION',
  p_status TEXT DEFAULT 'desconectado',
  p_phone_number TEXT DEFAULT NULL,
  p_instance_id TEXT DEFAULT NULL,
  p_api_url TEXT DEFAULT NULL,
  p_api_key TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT 'evolution',
  p_qr_code TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  INSERT INTO wa_sessions (session_id, status, phone_number, instance_id, api_url, api_key, provider, qr_code, connected_at, last_activity)
  VALUES (p_session_id, p_status, p_phone_number, p_instance_id, p_api_url, p_api_key, p_provider, p_qr_code,
    CASE WHEN p_status = 'conectado' THEN NOW() ELSE NULL END,
    NOW())
  ON CONFLICT (session_id) DO UPDATE SET
    status = EXCLUDED.status,
    phone_number = COALESCE(EXCLUDED.phone_number, wa_sessions.phone_number),
    instance_id = COALESCE(EXCLUDED.instance_id, wa_sessions.instance_id),
    api_url = COALESCE(EXCLUDED.api_url, wa_sessions.api_url),
    api_key = COALESCE(EXCLUDED.api_key, wa_sessions.api_key),
    provider = EXCLUDED.provider,
    qr_code = EXCLUDED.qr_code,
    connected_at = CASE WHEN EXCLUDED.status = 'conectado' THEN NOW() ELSE wa_sessions.connected_at END,
    last_activity = NOW(),
    updated_at = NOW()
  RETURNING row_to_json(wa_sessions.*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buscar ou criar conversa
CREATE OR REPLACE FUNCTION wa_get_or_create_conversa(
  p_phone_number TEXT,
  p_session_id TEXT DEFAULT 'DEFAULT_SESSION'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  existing RECORD;
BEGIN
  SELECT * INTO existing FROM wa_conversas
  WHERE phone_number = p_phone_number AND session_id = p_session_id AND status IN ('ativa', 'transbordo_humano')
  ORDER BY created_at DESC LIMIT 1;
  
  IF FOUND THEN
    SELECT row_to_json(c) INTO result FROM wa_conversas c WHERE c.id = existing.id;
  ELSE
    INSERT INTO wa_conversas (session_id, phone_number, flow_state, protocol)
    VALUES (p_session_id, p_phone_number, 'menu_inicial', 'FP' || TO_CHAR(NOW(), 'YYMMDDHH24MISS') || FLOOR(RANDOM() * 1000)::TEXT)
    RETURNING row_to_json(wa_conversas.*) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registrar mensagem
CREATE OR REPLACE FUNCTION wa_register_message(
  p_conversa_id UUID,
  p_phone_number TEXT,
  p_direction TEXT,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_agent_payload JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  INSERT INTO wa_mensagens (conversa_id, phone_number, direction, content, message_type, agent_payload)
  VALUES (p_conversa_id, p_phone_number, p_direction, p_content, p_message_type, p_agent_payload)
  RETURNING row_to_json(wa_mensagens.*) INTO result;
  
  UPDATE wa_conversas SET last_message_at = NOW(), updated_at = NOW() WHERE id = p_conversa_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar estado do fluxo
CREATE OR REPLACE FUNCTION wa_update_flow_state(
  p_conversa_id UUID,
  p_new_state TEXT,
  p_context JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE wa_conversas 
  SET flow_state = p_new_state,
      context = COALESCE(p_context, context),
      updated_at = NOW()
  WHERE id = p_conversa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transferir para fila humana
CREATE OR REPLACE FUNCTION wa_transfer_to_human(
  p_conversa_id UUID,
  p_reason TEXT DEFAULT 'Solicitação do cliente'
)
RETURNS JSON AS $$
DECLARE
  conv RECORD;
  result JSON;
BEGIN
  SELECT * INTO conv FROM wa_conversas WHERE id = p_conversa_id;
  
  UPDATE wa_conversas SET status = 'transbordo_humano', updated_at = NOW() WHERE id = p_conversa_id;
  
  INSERT INTO wa_fila_atendimento (conversa_id, phone_number, customer_name, priority, reason)
  VALUES (p_conversa_id, conv.phone_number, conv.customer_name, conv.priority, p_reason)
  RETURNING row_to_json(wa_fila_atendimento.*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buscar métricas do dia
CREATE OR REPLACE FUNCTION wa_get_daily_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'total_conversas', COUNT(DISTINCT c.id),
    'resolvidas_bot', COUNT(DISTINCT CASE WHEN c.status = 'finalizada' AND c.flow_state != 'transbordo_humano' THEN c.id END),
    'transbordo_humano', COUNT(DISTINCT CASE WHEN c.status = 'transbordo_humano' THEN c.id END),
    'mensagens_recebidas', (SELECT COUNT(*) FROM wa_mensagens m WHERE m.direction = 'incoming' AND m.created_at::date = p_date),
    'mensagens_enviadas', (SELECT COUNT(*) FROM wa_mensagens m WHERE m.direction = 'outgoing' AND m.created_at::date = p_date)
  ) INTO result
  FROM wa_conversas c
  WHERE c.created_at::date = p_date;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
