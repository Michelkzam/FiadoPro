import { useState, useCallback } from "react";
import { format } from "date-fns";
import db from "@/lib/db";
import { formatCurrency, openWhatsApp, sanitizePhone } from "@/lib/constants";
import { notifyPaymentReceived } from "@/lib/notify";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 100;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function useTransactionActions(customer) {
  const [loading, setLoading] = useState(false);

  const registerTransaction = useCallback(
    async ({ type, amount, description }, retryCount = 0) => {
      if (!customer || !amount || amount <= 0) return null;

      setLoading(true);
      try {
        const currentCustomer = await db.entities.Customer.get(customer.id);
        if (!currentCustomer) {
          throw new Error("Cliente não encontrado");
        }

        const currentBalance = currentCustomer.balance || 0;
        const parsedAmount = parseFloat(amount);
        const newBalance =
          type === "compra"
            ? currentBalance + parsedAmount
            : currentBalance - parsedAmount;

        const now = new Date();
        const dateStr = format(now, "dd/MM/yyyy");
        const timeStr = format(now, "HH:mm");

        await db.entities.Transaction.create({
          customer_id: customer.id,
          customer_name: customer.name,
          type,
          amount: parsedAmount,
          date: dateStr,
          time: timeStr,
          description,
        });

        await db.entities.Customer.update(customer.id, { balance: newBalance });

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

      openWhatsApp(customer.phone, msg);
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
      const customer = await db.entities.Customer.get(order.customer_id);
      const previousBalance = customer?.balance || 0;
      const newBalance = previousBalance + total;

      await db.entities.Order.update(order.id, { status: "aprovado" });

      await db.entities.Transaction.create({
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        type: "compra",
        amount: total,
        date: format(new Date(), "dd/MM/yyyy"),
        time: format(new Date(), "HH:mm"),
        description: order.description || "Pedido aprovado",
      });

      await db.entities.Customer.update(order.customer_id, { balance: newBalance });

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
        openWhatsApp(order.customer_phone, msg);
      }

      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback((orderId, status, customer) => {
    db.entities.Order.update(orderId, { status });

    if (customer?.phone) {
      const messages = {
        recusado: `❌ *Pedido Recusado*\n\nOlá ${customer.name}, seu pedido não pôde ser aprovado no momento.\n\nObrigado pela compreensão! 😊`,
        saiu_para_entrega: `🚚 *Pedido Saiu para Entrega!*\n\nOlá ${customer.name}, seu pedido saiu para entrega e chegará em breve! 😊`,
        finalizado: `✅ *Pedido Finalizado!*\n\nOlá ${customer.name}, seu pedido foi entregue com sucesso! Obrigado pela preferência! 😊`,
      };

      if (messages[status]) {
        openWhatsApp(customer.phone, messages[status]);
      }
    }
  }, []);

  return { approveOrder, updateOrderStatus, loading };
}
