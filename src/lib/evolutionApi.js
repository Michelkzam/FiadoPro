const EVOLUTION_API_URL = "https://api.evolutionapi.com.br";

let config = {
  apiUrl: localStorage.getItem("wa_api_url") || EVOLUTION_API_URL,
  apiKey: localStorage.getItem("wa_api_key") || "",
  instance: localStorage.getItem("wa_instance") || "fiadopro",
};

export function getEvolutionConfig() {
  return { ...config };
}

export function setEvolutionConfig(apiUrl, apiKey, instance) {
  config = { apiUrl, apiKey, instance };
  localStorage.setItem("wa_api_url", apiUrl);
  localStorage.setItem("wa_api_key", apiKey);
  localStorage.setItem("wa_instance", instance);
}

export function isConfigured() {
  return !!(config.apiKey && config.instance);
}

async function evoFetch(path, options = {}) {
  const url = `${config.apiUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "apikey": config.apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erro ${res.status}`);
  }
  
  return res.json();
}

export async function createInstance() {
  try {
    const data = await evoFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: config.instance,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        reject_call: false,
        always_online: true,
        webhook: {
          url: window.location.origin + "/api/whatsapp/webhook",
          by_events: false,
          base64: true,
          events: ["messages.upsert"],
        },
      }),
    });
    return { ok: true, data };
  } catch (error) {
    if (error.message?.includes("already")) {
      return { ok: true, data: { instance: { instanceName: config.instance } } };
    }
    return { ok: false, error: error.message };
  }
}

export async function getQRCode() {
  try {
    const data = await evoFetch(`/instance/connect/${config.instance}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function getConnectionState() {
  try {
    const data = await evoFetch(`/instance/connectionState/${config.instance}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function sendTextMessage(phone, message) {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  
  try {
    const data = await evoFetch(`/message/sendText/${config.instance}`, {
      method: "POST",
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function sendTyping(phone) {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  
  try {
    await evoFetch(`/chat/sendTyping/${config.instance}`, {
      method: "POST",
      body: JSON.stringify({
        number: formattedPhone,
        delay: 1500,
      }),
    });
  } catch (error) {
    // Ignorar erro de typing
  }
}

export async function deleteInstance() {
  try {
    await evoFetch(`/instance/delete/${config.instance}`, {
      method: "DELETE",
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
