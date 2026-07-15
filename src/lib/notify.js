import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/constants";

export async function createNotification({ title, body, url = "/", tag = null, userId = null }) {
  const { error } = await supabase.from("notifications").insert({
    title,
    body,
    url,
    tag: tag || `notif-${Date.now()}`,
    user_id: userId,
  });

  if (error) {
    console.error("Failed to create notification:", error);
  }
}

export function notifyNewOrder(order) {
  return createNotification({
    title: "Novo Pedido!",
    body: `${order.customer_name} fez um pedido${order.amount > 0 ? ` de ${formatCurrency(order.amount)}` : ""}`,
    url: "/pedidos",
    tag: `order-${order.id}`,
  });
}

export function notifyPaymentReceived(customerName, amount) {
  return createNotification({
    title: "Pagamento Recebido",
    body: `${customerName} realizou um pagamento de ${formatCurrency(amount)}`,
    url: "/compras",
    tag: `payment-${Date.now()}`,
  });
}

export function notifyNewCustomer(customerName) {
  return createNotification({
    title: "Novo Cliente",
    body: `${customerName} foi cadastrado no sistema`,
    url: "/clientes",
    tag: `customer-${Date.now()}`,
  });
}
