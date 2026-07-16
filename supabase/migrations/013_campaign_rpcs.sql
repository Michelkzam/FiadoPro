-- =============================================
-- 013: Campaign Stats RPC + Cron Fix
-- =============================================

-- RPC: Increment campaign stat
CREATE OR REPLACE FUNCTION increment_campaign_stat(
  p_campanha_id UUID,
  p_stat TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_stat = 'total_sucesso' THEN
    UPDATE campanhas SET total_sucesso = total_sucesso + 1 WHERE id = p_campanha_id;
  ELSIF p_stat = 'total_falha' THEN
    UPDATE campanhas SET total_falha = total_falha + 1 WHERE id = p_campanha_id;
  ELSIF p_stat = 'total_enviados' THEN
    UPDATE campanhas SET total_enviados = total_enviados + 1 WHERE id = p_campanha_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Process pending queue items (called by Vercel Cron)
CREATE OR REPLACE FUNCTION get_pending_queue_items(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  item_id UUID,
  campanha_id UUID,
  conexao_id UUID,
  rede_social TEXT,
  destinatario_id TEXT,
  destinatario_nome TEXT,
  destinatario_telefone TEXT,
  legenda TEXT,
  midia_url TEXT,
  whatsapp_delay_min INTEGER,
  whatsapp_delay_max INTEGER,
  tentativas INTEGER,
  max_tentativas INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.campanha_id,
    f.conexao_id,
    f.rede_social,
    f.destinatario_id,
    f.destinatario_nome,
    f.destinatario_telefone,
    f.legenda,
    f.midia_url,
    c.whatsapp_delay_segundos,
    c.whatsapp_delay_max_segundos,
    f.tentativas,
    f.max_tentativas
  FROM fila_envio f
  JOIN campanhas c ON c.id = f.campanha_id
  WHERE f.status IN ('pendente', 'retry')
    AND f.agendado_para <= NOW()
    AND c.status NOT IN ('cancelada', 'pausada')
  ORDER BY f.agendado_para ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
