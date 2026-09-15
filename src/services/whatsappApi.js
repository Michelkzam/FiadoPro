import { getApiConfig, setApiConfig } from "@/lib/secureConfig";

const ZAPI_BASE_URL = "https://api.z-api.io/v1";

let config = {
  instanceId: "",
  token: "",
};

let initialized = false;

async function ensureConfig() {
  if (initialized) return config;
  try {
    const saved = await getApiConfig("zapi");
    if (saved && saved.instanceId && saved.token) {
      config = { instanceId: saved.instanceId, token: saved.token };
    } else {
      const local = loadFromLocalStorage();
      if (local && local.instanceId) {
        config = local;
        await setApiConfig("zapi", local, "Z-API WhatsApp configuration");
      }
    }
  } catch {
    const local = loadFromLocalStorage();
    if (local) config = local;
  }
  initialized = true;
  return config;
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem("whatsapp_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.instanceId && parsed.token) return parsed;
    }
  } catch {}
  return null;
}

export const configureWhatsApp = async (instanceId, token) => {
  config = { instanceId, token };
  try {
    await setApiConfig("zapi", config, "Z-API WhatsApp configuration");
  } catch {}
  try {
    localStorage.setItem("whatsapp_config", JSON.stringify(config));
  } catch {}
};

export const getConfig = () => ({ ...config });

const sendRequest = async (endpoint, body) => {
  await ensureConfig();
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
  return sendRequest("send-text", { phone: formattedPhone, message });
};

export const sendImageMessage = async (phone, imageUrl, caption = "") => {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  return sendRequest("send-image", { phone: formattedPhone, image: imageUrl, caption });
};

export const sendBulkMessages = async (recipients, message, onProgress, imageUrl = null) => {
  const results = [];
  const total = recipients.length;
  for (let i = 0; i < total; i++) {
    const recipient = recipients[i];
    try {
      let result;
      if (imageUrl) {
        result = await sendImageMessage(recipient.phone, imageUrl, message);
      } else {
        result = await sendTextMessage(recipient.phone, message);
      }
      results.push({ success: true, phone: recipient.phone, id: recipient.id, result });
    } catch (error) {
      results.push({ success: false, phone: recipient.phone, id: recipient.id, error: error.message });
    }
    if (onProgress) onProgress(i + 1, total);
    if (i < total - 1) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return results;
};

export const checkConnection = async () => {
  await ensureConfig();
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
