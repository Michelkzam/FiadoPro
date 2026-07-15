const ZAPI_BASE_URL = "https://api.z-api.io/v1";
const DEFAULT_INSTANCE = "";
const DEFAULT_TOKEN = "";

let config = {
  instanceId: DEFAULT_INSTANCE,
  token: DEFAULT_TOKEN,
};

export const configureWhatsApp = (instanceId, token) => {
  config = { instanceId, token };
};

export const getConfig = () => ({ ...config });

const sendRequest = async (endpoint, body) => {
  const { instanceId, token } = config;

  if (!instanceId || !token) {
    throw new Error("Configure a Z-API primeiro (Instance ID e Token)");
  }

  const url = `${ZAPI_BASE_URL}/${instanceId}/${token}/${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Erro ao enviar mensagem via WhatsApp");
  }

  return data;
};

export const sendTextMessage = async (phone, message) => {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  return sendRequest("send-text", {
    phone: formattedPhone,
    message,
  });
};

export const sendBulkMessages = async (recipients, message, onProgress) => {
  const results = [];
  const total = recipients.length;

  for (let i = 0; i < total; i++) {
    const recipient = recipients[i];
    try {
      const result = await sendTextMessage(recipient.phone, message);
      results.push({ success: true, phone: recipient.phone, id: recipient.id, result });
    } catch (error) {
      results.push({ success: false, phone: recipient.phone, id: recipient.id, error: error.message });
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }

    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
};

export const checkConnection = async () => {
  const { instanceId, token } = config;

  if (!instanceId || !token) {
    return { connected: false, error: "Credenciais não configuradas" };
  }

  try {
    const url = `${ZAPI_BASE_URL}/${instanceId}/${token}/connection`;
    const response = await fetch(url);
    const data = await response.json();
    return { connected: data.connected || false, data };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};
