-- Adicionar campo de bandeira do cartão aos pedidos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_card_brand TEXT;
