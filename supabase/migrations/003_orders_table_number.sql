-- Adicionar suporte a pedidos por mesa
-- Torna customer_id nullable para pedidos de mesa
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;

-- Adiciona coluna table_number
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number TEXT;

-- Índice para buscas por mesa
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number) WHERE table_number IS NOT NULL;
