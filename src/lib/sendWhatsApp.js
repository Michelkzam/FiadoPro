import { sendTextMessage, getConfig } from "@/services/whatsappApi";

const sanitizePhone = (phone) => (phone || "").replace(/\D/g, "");

export const sendWhatsApp = async (phone, message) => {
  const clean = sanitizePhone(phone);
  if (!clean) return;

  const { instanceId, token } = getConfig();

  if (instanceId && token) {
    try {
      await sendTextMessage(clean, message);
      return { method: "api", success: true };
    } catch (error) {
      console.warn("Z-API falhou, abrindo WhatsApp:", error.message);
    }
  }

  window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(message)}`, "_blank");
  return { method: "manual", success: true };
};
