import { useState, useCallback } from "react";
import { format } from "date-fns";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { notifyPaymentReceived } from "@/lib/notify";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function useTransactionActions(customer) {
  const [loading, setLoading] = useState(false);

  const registerTransaction = useCallback(
    async ({ type, amount, description }, retryCount = 0) => {
      if (!customer || !amount || amount <= 0) return null;

      setLoading(true);
      try {
        const parsedAmount = parseFloat(amount);
        const now = new Date();
        const dateStr = format(now, "dd/MM/yyyy");
        const timeStr = format(now, "HH:mm");

        const { data: result, error } = await supabase.rpc("register_transaction_atomic", {
          p_customer_id: customer.id,
          p_customer_name: customer.name,
          p_type: type,
          p_amount: parsedAmount,
          p_date: dateStr,
          p_time: timeStr,
          p_description: description || null,
        });

        if (error) throw error;

        const newBalance = result?.new_balance ?? 0;
        return { newBalance, type, amount: parsedAmount };
      } catch (error) {
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          await delay(RETRY_DELAY_MS * (retryCount + 1));
          return registerTransaction({ type, amount, description }, retryCount + 1);
        }
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [customer]
  );

  const sendTransactionWhatsApp = useCallback(
    (transactionResult, storeName) => {
      if (!customer?.phone || !transactionResult) return;

      const { newBalance, type, amount } = transactionResult;

      if (type === "pagamento") {
        notifyPaymentReceived(customer.name, amount);
      }

      const hora =
        new Date().getHours() < 12
          ? "Bom dia"
          : new Date().getHours() < 18
          ? "Boa tarde"
          : "Boa noite";

      let msg = "";
      if (type === "compra") {
        msg = `*****************************************************
${hora} Sr(a) ${customer.name}
Sua compra de hoje foi no valor de ${formatCurrency(amount)}
Seu saldo devedor total atual é de ${formatCurrency(newBalance)}.
Em caso de dúvidas, entre em contato para mais informações.
Nós do ${storeName} agradecemos a preferência
*****************************************************`;
      } else {
        if (newBalance < 0) {
          msg = `*****************************************************
${hora} Sr(a) ${customer.name}
Recebemos seu pagamento de ${formatCurrency(amount)}.
Sua conta está QUITADA e você possui um CRÉDITO de ${formatCurrency(newBalance)} para as próximas compras.
Nós do ${storeName} agradecemos a preferência
*****************************************************`;
        } else if (newBalance === 0) {
          msg = `*****************************************************
${hora} Sr(a) ${customer.name}
Recebemos seu pagamento de ${formatCurrency(amount)}.
Sua conta está totalmente QUITADA. Saldo devedor: R$ 0,00.
Nós do ${storeName} agradecemos a preferência
*****************************************************`;
        } else {
          msg = `*****************************************************
${hora} Sr(a) ${customer.name}
Recebemos seu pagamento de ${formatCurrency(amount)}.
Seu saldo devedor restante é de ${formatCurrency(newBalance)}.
Nós do ${storeName} agradecemos a preferência
*****************************************************`;
        }
      }

      sendWhatsApp(customer.phone, msg);
    },
    [customer]
  );

  return { registerTransaction, sendTransactionWhatsApp, loading };
}

export function useOrderActions() {
  const [loading, setLoading] = useState(false);

  const approveOrder = useCallback(async (order, { total, itemLines }) => {
    setLoading(true);
    try {
      const previousBalance = order.customer_id
        ? (await db.entities.Customer.get(order.customer_id))?.balance || 0
        : 0;

      const { data: result, error } = await supabase.rpc("approve_order_atomic", {
        p_order_id: order.id,
        p_total: total,
        p_description: order.description || "Pedido aprovado",
      });

      if (error) throw error;

      const newBalance = result?.new_balance ?? 0;

      if (order.customer_phone) {
        const totalFmt = formatCurrency(total);
        const prevFmt = formatCurrency(previousBalance);
        const newFmt = formatCurrency(newBalance);
        const msg =
          `✅ *Pedido Aprovado!*\n\n` +
          `Olá ${order.customer_name}! Seu pedido foi aprovado.\n\n` +
          `*Itens da compra:*\n${itemLines}\n\n` +
          `*Valor desta compra:* ${totalFmt}\n` +
          `*Dívida anterior:* ${prevFmt}\n` +
          `*Total em débito:* ${newFmt}\n\n` +
          `Qualquer dúvida, entre em contato. 😊`;
        sendWhatsApp(order.customer_phone, msg);
      }

      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId, status, customer) => {
    try {
      await db.entities.Order.update(orderId, { status });

      if (customer?.phone) {
        const messages = {
          recusado: `❌ *Pedido Recusado*\n\nOlá ${customer.name}, seu pedido não pôde ser aprovado no momento.\n\nObrigado pela compreensão! 😊`,
          saiu_para_entrega: `🚚 *Pedido Saiu para Entrega!*\n\nOlá ${customer.name}, seu pedido saiu para entrega e chegará em breve! 😊`,
          finalizado: `✅ *Pedido Finalizado!*\n\nOlá ${customer.name}, seu pedido foi entregue com sucesso! Obrigado pela preferência! 😊`,
        };

        if (messages[status]) {
          sendWhatsApp(customer.phone, messages[status]);
        }
      }
      return true;
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }, []);

  return { approveOrder, updateOrderStatus, loading };
}

export function useComandaActions() {
  const [loading, setLoading] = useState(false);

  const addItem = useCallback(async (comandaId, item) => {
    setLoading(true);
    try {
      const subtotal = (item.quantity || 1) * (item.unit_price || 0);
      await db.entities.ComandaItem.create({
        comanda_id: comandaId,
        product_id: item.product_id || null,
        product_name: item.product_name,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        subtotal,
        notes: item.notes || "",
        status: "pendente",
      });

      const comanda = await db.entities.Comanda.get(comandaId);
      const newTotal = (comanda.total || 0) + subtotal;
      await db.entities.Comanda.update(comandaId, { total: newTotal });

      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (itemId, comandaId) => {
    setLoading(true);
    try {
      const item = await db.entities.ComandaItem.get(itemId);
      await db.entities.ComandaItem.delete(itemId);

      if (comandaId) {
        const comanda = await db.entities.Comanda.get(comandaId);
        const newTotal = Math.max(0, (comanda.total || 0) - (item.subtotal || 0));
        await db.entities.Comanda.update(comandaId, { total: newTotal });
      }

      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateItemStatus = useCallback(async (itemId, status) => {
    await db.entities.ComandaItem.update(itemId, { status });
  }, []);

  const closeComanda = useCallback(async (comandaId, paymentMethod = null) => {
    setLoading(true);
    try {
      const comanda = await db.entities.Comanda.get(comandaId);
      if (!comanda) throw new Error("Comanda não encontrada");

      const updates = { status: "fechada" };
      if (paymentMethod) {
        updates.payment_method = paymentMethod;
        updates.status = "paga";
      }
      await db.entities.Comanda.update(comandaId, updates);

      if (comanda.customer_id && comanda.total > 0) {
        const now = new Date();
        const { format: formatDate } = await import("date-fns");

        const { error: txError } = await supabase.rpc("register_transaction_atomic", {
          p_customer_id: comanda.customer_id,
          p_customer_name: comanda.customer_name || "",
          p_type: "compra",
          p_amount: comanda.total,
          p_date: formatDate(now, "dd/MM/yyyy"),
          p_time: formatDate(now, "HH:mm"),
          p_description: `Comanda Mesa ${comanda.table_number} - ${comanda.label}`,
        });

        if (txError) throw txError;
      }

      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const reopenComanda = useCallback(async (comandaId) => {
    await db.entities.Comanda.update(comandaId, { status: "aberta", payment_method: null });
  }, []);

  const cancelComanda = useCallback(async (comandaId) => {
    setLoading(true);
    try {
      const items = await db.entities.ComandaItem.filter({ comanda_id: comandaId }, "-created_at", 500);
      for (const item of items) {
        await db.entities.ComandaItem.delete(item.id);
      }
      await db.entities.Comanda.delete(comandaId);
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  return { addItem, removeItem, updateItemStatus, closeComanda, reopenComanda, cancelComanda, loading };
}
