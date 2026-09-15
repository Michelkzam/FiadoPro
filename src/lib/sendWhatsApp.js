const sanitizePhone = (phone) => (phone || "").replace(/\D/g, "");
const getServerUrl = () => {
  if (window.location.port === "5173" || window.location.port === "3000") return "";
  return "http://localhost:3001";
};

export const sendWhatsApp = async (phone, message) => {
  const clean = sanitizePhone(phone);
  if (!clean) return { method: "skipped", success: false, reason: "no_phone" };

  const serverUrl = getServerUrl();
  try {
    const res = await fetch(`${serverUrl}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: clean, message }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { method: "baileys", success: true };
    }
  } catch {
    // Server offline, try next method
  }

  try {
    const { sendTextMessage, getConfig } = await import("@/services/whatsappApi");
    const { instanceId, token } = getConfig();
    if (instanceId && token) {
      await sendTextMessage(clean, message);
      return { method: "zapi", success: true };
    }
  } catch {
    // Z-API not configured
  }

  window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(message)}`, "_blank");
  return { method: "manual", success: true };
};
