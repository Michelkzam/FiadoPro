-- Adicionar tipos de atendimento e pagamento aos pedidos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'presencial_retirada'
  CHECK (service_type IN ('presencial_mesa', 'presencial_retirada', 'online_entrega', 'online_retirada'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_card_type TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_service_type ON orders(service_type);
