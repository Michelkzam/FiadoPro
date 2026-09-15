import { verifyWebhookSignature, checkRateLimit, getClientIp, handleCors, applySecurityHeaders } from "../lib/security.js";
import { processAgentMessage, getSession, supabase, randomDelay, SESSION_ID } from "./shared/engine.js";

async function sendEvolutionMessage(instanceId, apiKey, apiUrl, phone, message) {
  if (!instanceId || !apiKey || !apiUrl) return;

  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    await fetch(`${apiUrl}/message/sendText/${instanceId}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number: formattedPhone, text: message }),
    });
  } catch (error) {
    console.error("[Evolution API] Erro ao enviar:", error.message);
  }
}

export default async function handler(req, res) {
  handleCors(res);
  applySecurityHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(`webhook:${ip}`)) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  try {
    const body = req.body;
    const event = body.event;

    if (event === "messages.upsert") {
      const messageData = body.data;

      if (!messageData || messageData.key?.fromMe) {
        return res.status(200).json({ ok: true });
      }

      const phoneNumber = messageData.key?.remoteJid
        ?.replace("@s.whatsapp.net", "")
        ?.replace("@g.us", "") || "";
      const messageText =
        messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || "";

      if (!phoneNumber || !messageText) {
        return res.status(200).json({ ok: true });
      }

      const fullPhone = phoneNumber.startsWith("55") ? phoneNumber : `55${phoneNumber}`;

      const response = await processAgentMessage(fullPhone, messageText);

      if (response?.message) {
        const session = await getSession();
        if (session) {
          await randomDelay();
          await sendEvolutionMessage(
            session.instance_id,
            session.api_key,
            session.api_url,
            fullPhone,
            response.message
          );
        }
      }

      return res.status(200).json({
        ok: true,
        response: response?.message,
        payload: response?.payload,
      });
    }

    if (event === "connection.update") {
      const instanceId = body.instance || body.instanceId;
      const status = body.data?.state || "disconnected";
      const mappedStatus =
        status === "open" ? "conectado" : status === "close" ? "desconectado" : "aguardando_qr";

      await supabase.rpc("wa_upsert_session", {
        p_session_id: SESSION_ID,
        p_status: mappedStatus,
        p_instance_id: instanceId,
        p_provider: "evolution",
      });

      return res.status(200).json({ ok: true });
    }

    if (event === "qrcode.updated") {
      const qrCode = body.data?.base64 || body.data;

      await supabase.rpc("wa_upsert_session", {
        p_session_id: SESSION_ID,
        p_status: "aguardando_qr",
        p_qr_code: qrCode,
        p_instance_id: body.instance || body.instanceId,
        p_provider: "evolution",
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]", error.message);
    return res.status(500).json({ error: error.message });
  }
}
