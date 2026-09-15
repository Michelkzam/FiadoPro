-- =============================================
-- 019: Secure API Configuration Storage
-- =============================================

-- Tabela para armazenar configurações de API de forma segura
-- Substitui o localStorage para credenciais sensíveis
CREATE TABLE IF NOT EXISTS api_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_config_key ON api_config(config_key);

-- RLS: Apenas usuários autenticados podem acessar
ALTER TABLE api_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access' AND tablename = 'api_config') THEN
    CREATE POLICY "Authenticated full access" ON api_config FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_api_config_updated_at ON api_config;
CREATE TRIGGER update_api_config_updated_at BEFORE UPDATE ON api_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC para buscar configuração
CREATE OR REPLACE FUNCTION get_api_config(p_key TEXT)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT config_value INTO result FROM api_config WHERE config_key = p_key;
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para salvar configuração (upsert)
CREATE OR REPLACE FUNCTION set_api_config(p_key TEXT, p_value JSONB, p_description TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  INSERT INTO api_config (config_key, config_value, description)
  VALUES (p_key, p_value, p_description)
  ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = COALESCE(EXCLUDED.description, api_config.description),
    updated_at = NOW()
  RETURNING row_to_json(api_config.*) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
