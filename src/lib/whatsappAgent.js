import { WhatsAppFlowEngine, WhatsAppAgent, processMessage } from "@/lib/whatsappFlowEngine";

export { WhatsAppAgent as WhatsAppAgent, processMessage };

export class WhatsAppAgentLegacy {
  constructor(sessionId = "DEFAULT_SESSION") {
    this._engine = new WhatsAppFlowEngine(sessionId);
  }

  async initialize() {
    return this._engine.initialize();
  }

  async processMessage(phoneNumber, messageText) {
    return this._engine.processMessage(phoneNumber, messageText);
  }

  buildResponse(message, payload = null) {
    return {
      message,
      payload,
      conexao: {
        provedor: "baileys_qrcode_free",
        metodo_autenticacao: "QR_CODE",
        custo_api: 0,
      },
    };
  }
}

export async function getAgentResponse(phoneNumber, messageText, sessionId = "DEFAULT_SESSION") {
  return WhatsAppAgent(phoneNumber, messageText, sessionId);
}
