import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { processAgentMessage, getSession, supabase, delay, SESSION_ID } from "./shared/engine.js";

const TYPING_DELAY_MS = 1500;

const logger = pino({ level: "silent" });

let sock = null;
let qrCode = null;
let connectionStatus = "desconectado";

async function updateSessionStatus(status, additionalData = {}) {
  await supabase.rpc("wa_upsert_session", {
    p_session_id: SESSION_ID,
    p_status: status,
    ...additionalData,
  });
  connectionStatus = status;
}

async function sendTypingEvent(phoneNumber) {
  if (!sock) return;
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const jid = `${cleanPhone}@s.whatsapp.net`;
    await sock.sendPresenceUpdate("composing", jid);
    await delay(TYPING_DELAY_MS);
  } catch {
    // Typing event is non-critical
  }
}

async function sendWhatsAppMessage(phoneNumber, message) {
  if (!sock) return;

  await sendTypingEvent(phoneNumber);

  try {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const jid = `${cleanPhone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar mensagem:", error.message);
  }
}

async function handleIncomingMessage(message) {
  try {
    const phoneNumber = message.key?.remoteJid
      ?.replace("@s.whatsapp.net", "")
      ?.replace("@g.us", "") || "";
    const messageText =
      message.message?.conversation || message.message?.extendedTextMessage?.text || "";

    if (!phoneNumber || !messageText) return;
    if (message.key?.fromMe) return;

    const fullPhone = phoneNumber.startsWith("55") ? phoneNumber : `55${phoneNumber}`;

    const response = await processAgentMessage(fullPhone, messageText);

    if (response?.message) {
      await sendWhatsAppMessage(fullPhone, response.message);
    }
  } catch (error) {
    console.error("[Agent] Erro ao processar mensagem:", error.message);
  }
}

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth_info");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: true,
      browser: ["FiadoPro", "Chrome", "4.0.0"],
      generateHighQualityLinkPreview: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = qr;
        await updateSessionStatus("aguardando_qr");
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          await updateSessionStatus("desconectado");
          connectToWhatsApp();
        } else {
          qrCode = null;
          await updateSessionStatus("desconectado");
        }
      }

      if (connection === "open") {
        qrCode = null;
        const phoneNumber = sock.user?.id?.replace(/:.*@/, "@")?.split("@")[0] || "";
        await updateSessionStatus("conectado", { p_phone_number: phoneNumber });
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const message of messages) {
        if (!message.key.fromMe && message.message) {
          await handleIncomingMessage(message);
        }
      }
    });
  } catch (error) {
    console.error("[Baileys] Erro na conexão:", error.message);
    await updateSessionStatus("erro");
  }
}

export function getQRCode() {
  return qrCode;
}

export function getConnectionStatus() {
  return connectionStatus;
}

export function startBaileys() {
  connectToWhatsApp();
}

export async function disconnectBaileys() {
  if (sock) {
    await sock.logout();
    sock = null;
    qrCode = null;
    await updateSessionStatus("desconectado");
  }
}

export { sendWhatsAppMessage };
