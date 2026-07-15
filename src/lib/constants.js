export const ORDER_STATUS = {
  PENDENTE: "pendente",
  APROVADO: "aprovado",
  RECUSADO: "recusado",
  SAIU_PARA_ENTREGA: "saiu_para_entrega",
  FINALIZADO: "finalizado",
};

export const ORDER_STATUS_CONFIG = {
  [ORDER_STATUS.PENDENTE]: { label: "Pendente", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  [ORDER_STATUS.APROVADO]: { label: "Aprovado", color: "text-green-600 bg-green-50 border-green-200" },
  [ORDER_STATUS.RECUSADO]: { label: "Recusado", color: "text-red-600 bg-red-50 border-red-200" },
  [ORDER_STATUS.SAIU_PARA_ENTREGA]: { label: "Saiu p/ Entrega", color: "text-purple-600 bg-purple-50 border-purple-200" },
  [ORDER_STATUS.FINALIZADO]: { label: "Finalizado", color: "text-blue-600 bg-blue-50 border-blue-200" },
};

export const TRANSACTION_TYPE = {
  COMPRA: "compra",
  PAGAMENTO: "pagamento",
};

export const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
];

export const PRODUCT_CATEGORIES = ["Produto", "Serviço", "Pratos", "Bebidas", "Combos"];

export const STORE_NAME_FALLBACK = "FiadoPro";

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const NOTIFICATION_POLL_INTERVAL = 15000;
export const PENDING_ORDERS_POLL_INTERVAL = 30000;

export const PERIODS = [
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "Tudo", days: 9999 },
];

export const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const formatCurrency = (value) => CURRENCY_FORMATTER.format(value || 0);

export const parseDateBR = (dateStr) => {
  if (!dateStr) return new Date(0);
  if (dateStr.includes("/")) {
    const [dd, mm, yyyy] = dateStr.split("/");
    return new Date(`${yyyy}-${mm}-${dd}`);
  }
  return new Date(dateStr);
};

export const parseDateToTimestamp = (dateStr) => parseDateBR(dateStr).getTime();

export const formatDateBR = (date = new Date()) => date.toLocaleDateString("pt-BR");

export const formatTimeBR = (date = new Date()) =>
  date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const generateAccessCode = () => {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
};

export const sanitizePhone = (phone) => (phone || "").replace(/\D/g, "");

export const openWhatsApp = (phone, message) => {
  const clean = sanitizePhone(phone);
  if (!clean) return;
  window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(message)}`, "_blank");
};
