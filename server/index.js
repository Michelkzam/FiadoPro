import express from "express";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { createClient } from "@supabase/supabase-js";
import pino from "pino";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SESSION_ID = "DEFAULT_SESSION";
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;
const TYPING_DELAY_MS = 1500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => delay(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

const logger = pino({ level: "silent" });

let sock = null;
let qrCode = null;
let connectionStatus = "desconectado";

// ==================== DATABASE ====================

async function getSessionConfig() {
  const { data } = await supabase.rpc("wa_get_session", { p_session_id: SESSION_ID });
  return data;
}

async function updateSessionStatus(status, additionalData = {}) {
  await supabase.rpc("wa_upsert_session", {
    p_session_id: SESSION_ID,
    p_status: status,
    ...additionalData,
  });
  connectionStatus = status;
}

async function getActiveFlow() {
  const { data } = await supabase.from("wa_fluxos").select("*").eq("active", true).order("priority", { ascending: false }).limit(1);
  return data?.[0]?.flow_data || null;
}

async function getStoreName() {
  const { data } = await supabase.from("store_profiles").select("store_name").limit(1);
  return data?.[0]?.store_name || "FiadoPro";
}

async function lookupCustomerByCpf(cpf) {
  const { data, error } = await supabase.from("customers").select("*").eq("cpf", cpf).single();
  if (error || !data) return null;
  return data;
}

async function lookupCustomerByPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, "");
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(`phone.eq.${cleanPhone},phone.eq.55${cleanPhone},phone.eq.${cleanPhone.replace(/^55/, "")}`)
    .limit(1)
    .single();
  if (error || !data) return null;
  return data;
}

async function fetchProducts() {
  const { data: products } = await supabase.from("products").select("name, price, category").eq("available", true).order("category");
  if (!products || products.length === 0) return "Nenhum produto disponivel no momento.";
  
  const grouped = {};
  products.forEach((p) => {
    const cat = p.category || "Outros";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });
  
  let list = "";
  for (const [category, items] of Object.entries(grouped)) {
    list += `\n*${category}*\n`;
    items.forEach((item) => { list += `• ${item.name} — R$ ${item.price?.toFixed(2) || "0,00"}\n`; });
  }
  return list;
}

async function createOrderFromMessage(customer, description) {
  const { data: order, error } = await supabase.from("orders").insert({
    customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone,
    description, amount: 0, status: "pendente", service_type: "online_entrega",
  }).select().single();
  if (error) throw error;
  return order;
}

async function registerPayment(customer, amount) {
  const { format: formatDate } = await import("date-fns");
  const now = new Date();
  const { data: result, error } = await supabase.rpc("register_transaction_atomic", {
    p_customer_id: customer.id, p_customer_name: customer.name, p_type: "pagamento",
    p_amount: amount, p_date: formatDate(now, "dd/MM/yyyy"), p_time: formatDate(now, "HH:mm"),
    p_description: "Pagamento via WhatsApp Agent",
  });
  if (error) throw error;
  return result;
}

// ==================== INTENT PARSER ====================

function parseMessageIntent(text) {
  const normalized = text.trim().toLowerCase();
  
  if (/^(0|atendente|humano|falar com|ajuda|suporte)/i.test(normalized)) return { intent: "transbordo_humano" };
  if (/^(1|saldo|divida|devedor|quanto devo|ver saldo)/i.test(normalized)) return { intent: "saldo" };
  if (/^(2|pedido|comprar|quero|encomendar)/i.test(normalized)) return { intent: "pedido" };
  if (/^(3|pagamento|pagar|pix|dinheiro|quitar)/i.test(normalized)) return { intent: "pagamento" };
  if (/^(4|cardapio|cardápio|produtos|menu|lista)/i.test(normalized)) return { intent: "cardapio" };
  if (/^(5|sair|tchau|obrigad|até)/i.test(normalized)) return { intent: "despedida" };
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(normalized) || /^\d{11}$/.test(normalized)) {
    return { intent: "cpf_input", data: { cpf: normalized.replace(/\D/g, "") } };
  }
  if (/^r?\$?\s*\d+[.,]?\d*$/.test(normalized)) {
    const value = parseFloat(normalized.replace(/[R$\s]/g, "").replace(",", "."));
    if (value > 0) return { intent: "valor_input", data: { amount: value } };
  }
  return { intent: "free_text", data: { text: normalized } };
}

function generateProtocol() {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `FP${datePart}${timePart}${random}`;
}

function buildPayload(evento, transbordo, cliente, dadosContextuais) {
  return {
    conexao: { provedor: "baileys_qrcode_free", metodo_autenticacao: "QR_CODE", custo_api: 0.00 },
    evento,
    transbordo_humano: transbordo,
    cliente: { nome: cliente?.nome || null, telefone_whatsapp: cliente?.telefone || null, documento_ou_empresa: cliente?.documento || null },
    dados_contextuais: dadosContextuais,
  };
}

// ==================== FLOW EXECUTOR ====================

async function executeFlow(conversa, intent, rawMessage, flowData, storeName) {
  const flowState = conversa.flow_state || "menu_inicial";
  
  if (intent.intent === "transbordo_humano") {
    const protocol = conversa.protocol || generateProtocol();
    await supabase.rpc("wa_transfer_to_human", { p_conversa_id: conversa.id, p_reason: "Solicitacao do cliente" });
    return {
      message: `Ola! Vou transferir para um atendente.\n\nAguarde um momento.\n\nProtocolo: *${protocol}*`,
      payload: buildPayload("TRANSBORDO_HUMANO", true, { telefone: conversa.phone_number }, { categoria_ou_modulo: "SUPORTE", prioridade_ou_urgencia: "URGENTE", assunto_resumido: "Transferencia para humano", detalhes_completos: "Solicitacao do cliente", atributos_especificos: { protocol } }),
    };
  }
  
  if (flowState === "menu_inicial" || intent.intent === "menu_inicial") {
    const menuMsg = flowData?.initial_menu?.message || `Ola! Bem-vindo(a) ao *${storeName}*!\n\nComo posso ajudar?\n\n1 - Ver meu saldo e debitos\n2 - Fazer um pedido\n3 - Registrar pagamento\n4 - Ver cardapio/produtos\n5 - Falar com atendente\n\nDigite o numero da opcao desejada.`;
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "menu_inicial" });
    return { message: menuMsg.replace(/\{store_name\}/g, storeName), payload: buildPayload("MENU_INICIAL", false, { telefone: conversa.phone_number }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Menu principal", detalhes_completos: "Exibicao do menu", atributos_especificos: {} }) };
  }
  
  if (flowState === "saldo" || intent.intent === "saldo") {
    if (intent.intent === "cpf_input" || /^\d{11}$/.test(rawMessage.replace(/\D/g, ""))) {
      const cpf = intent.data?.cpf || rawMessage.replace(/\D/g, "");
      const customer = await lookupCustomerByCpf(cpf);
      if (!customer) {
        await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "cpf_nao_encontrado" });
        return { message: "CPF nao encontrado em nossa base.\n\nDeseja:\n1 - Cadastrar-se\n2 - Tentar novamente\n3 - Falar com atendente", payload: buildPayload("CPF_NAO_ENCONTRADO", false, { telefone: conversa.phone_number, documento: cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "CPF nao encontrado", detalhes_completos: "Consulta de saldo com CPF inexistente", atributos_especificos: {} }) };
      }
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "saldo_resultado", p_context: JSON.stringify({ customer_id: customer.id, customer_name: customer.name }) });
      const balance = `R$ ${(customer.balance || 0).toFixed(2)}`;
      const limit = `R$ ${(customer.credit_limit || 0).toFixed(2)}`;
      return { message: `*Dados da sua conta:*\n\nNome: ${customer.name}\nSaldo devedor: *${balance}*\nLimite de credito: *${limit}*\n\nDeseja algo mais?\n1 - Fazer pedido\n2 - Registrar pagamento\n3 - Voltar ao menu\n4 - Sair`, payload: buildPayload("CONSULTA_SALDO", false, { nome: customer.name, telefone: customer.phone, documento: customer.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Consulta de saldo", detalhes_completos: `Saldo: ${balance}, Limite: ${limit}`, atributos_especificos: { saldo: customer.balance, limite: customer.credit_limit } }) };
    }
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "saldo" });
    return { message: "Para consultar seu saldo, preciso do seu *CPF*:\n\nDigite apenas os numeros do CPF.", payload: buildPayload("SOLICITACAO_CPF", false, { telefone: conversa.phone_number }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Solicitacao de CPF", detalhes_completos: "Aguardando CPF do cliente", atributos_especificos: {} }) };
  }
  
  if (flowState === "pedido" || intent.intent === "pedido") {
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "pedido" });
    return { message: "Pedido realizado!\n\nEnvie os itens desejados ou acesse nosso cardapio:\n\n1 - Ver cardapio\n2 - Digitar pedido livre\n3 - Voltar ao menu", payload: buildPayload("MENU_PEDIDO", false, { telefone: conversa.phone_number }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Menu de pedido", detalhes_completos: "Exibicao do menu de pedido", atributos_especificos: {} }) };
  }
  
  if (flowState === "cardapio" || intent.intent === "cardapio") {
    const productList = await fetchProducts();
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "pedido_livre" });
    return { message: `*Nosso Cardapio:*\n${productList}\n\nPara fazer um pedido, digite o nome do produto.`, payload: buildPayload("CARDAPIO_EXIBIDO", false, { telefone: conversa.phone_number }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Cardapio exibido", detalhes_completos: "Lista de produtos enviada", atributos_especificos: {} }) };
  }
  
  if (flowState === "pedido_livre" || (flowState === "pedido" && intent.intent === "free_text")) {
    const customer = await lookupCustomerByPhone(conversa.phone_number);
    if (customer) {
      const order = await createOrderFromMessage(customer, rawMessage);
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "menu_inicial" });
      return { message: `Pedido registrado!\n\nDescricao: ${rawMessage}\nStatus: Aguardando aprovacao\n\nVoce recebera uma confirmacao em breve!`, payload: buildPayload("REGISTRO_PROCESSADO", false, { nome: customer.name, telefone: customer.phone, documento: customer.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Novo pedido via WhatsApp", detalhes_completos: rawMessage, atributos_especificos: { order_id: order.id, status: "pendente" } }) };
    }
    return { message: "Para registrar o pedido, preciso identifica-lo.\n\nDigite seu *CPF*:", payload: buildPayload("PEDIDO_SEM_CLIENTE", false, { telefone: conversa.phone_number }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Pedido sem cliente", detalhes_completos: "Aguardando identificacao do cliente", atributos_especificos: {} }) };
  }
  
  if (flowState === "pagamento" || intent.intent === "pagamento") {
    if (intent.intent === "valor_input" || /^\d+[.,]?\d*$/.test(rawMessage.replace(/[R$\s]/g, ""))) {
      const amount = intent.data?.amount || parseFloat(rawMessage.replace(/[R$\s]/g, "").replace(",", "."));
      if (amount > 0) {
        const customer = await lookupCustomerByPhone(conversa.phone_number);
        if (customer) {
          const result = await registerPayment(customer, amount);
          const newBalance = result?.new_balance ?? 0;
          await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "menu_inicial" });
          return { message: `Pagamento de *R$ ${amount.toFixed(2)}* registrado!\n\nNovo saldo: *R$ ${newBalance.toFixed(2)}*\n\nObrigado!`, payload: buildPayload("REGISTRO_PROCESSADO", false, { nome: customer.name, telefone: customer.phone, documento: customer.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Pagamento registrado", detalhes_completos: `Pagamento de R$ ${amount.toFixed(2)}`, atributos_especificos: { amount, new_balance: newBalance } }) };
        }
      }
    }
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "pagamento" });
    return { message: "*Registrar Pagamento*\n\nEnvie o valor que deseja pagar.\n\nEx: *150,00*\n\nOu envie *pix* para ver nossas chaves.", payload: buildPayload("SOLICITACAO_PAGAMENTO", false, { telefone: conversa.phone_number }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Solicitacao de pagamento", detalhes_completos: "Aguardando valor do pagamento", atributos_especificos: {} }) };
  }
  
  if (flowState === "despedida" || intent.intent === "despedida") {
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "finalizada" });
    return { message: `Obrigado por nos contatar!\n\n*${storeName}* - Estamos aqui quando precisar!\nAte mais!`, payload: buildPayload("CONVERSAS_FINALIZADA", false, { telefone: conversa.phone_number }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Conversa finalizada", detalhes_completos: "Despedida do cliente", atributos_especificos: {} }) };
  }
  
  const menuMsg = flowData?.initial_menu?.message || `Ola! Bem-vindo(a) ao *${storeName}*!\n\nComo posso ajudar?\n\n1 - Ver meu saldo e debitos\n2 - Fazer um pedido\n3 - Registrar pagamento\n4 - Ver cardapio/produtos\n5 - Falar com atendente\n\nDigite o numero da opcao desejada.`;
  await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "menu_inicial" });
  return { message: menuMsg.replace(/\{store_name\}/g, storeName), payload: buildPayload("FALLBACK_MENU", false, { telefone: conversa.phone_number }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Fallback menu", detalhes_completos: "Mensagem nao reconhecida", atributos_especificos: {} }) };
}

// ==================== WHATSAPP ====================

async function handleIncomingMessage(message) {
  try {
    const session = await getSessionConfig();
    
    if (session && !session.robot_active) return;
    if (session && session.human_mode) return;
    
    const phoneNumber = message.key?.remoteJid?.replace("@s.whatsapp.net", "")?.replace("@g.us", "") || "";
    const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
    
    if (!phoneNumber || !messageText || message.key?.fromMe) return;
    
    console.log(`[MSG] ${phoneNumber}: ${messageText}`);
    
    const flowData = await getActiveFlow();
    const storeName = await getStoreName();
    
    const { data: conversa } = await supabase.rpc("wa_get_or_create_conversa", {
      p_phone_number: phoneNumber,
      p_session_id: SESSION_ID,
    });
    
    if (!conversa) return;
    
    await supabase.rpc("wa_register_message", {
      p_conversa_id: conversa.id,
      p_phone_number: phoneNumber,
      p_direction: "incoming",
      p_content: messageText,
    });
    
    const intent = parseMessageIntent(messageText);
    const response = await executeFlow(conversa, intent, messageText, flowData, storeName);
    
    await supabase.rpc("wa_register_message", {
      p_conversa_id: conversa.id,
      p_phone_number: phoneNumber,
      p_direction: "outgoing",
      p_content: response.message,
      p_agent_payload: response.payload || null,
    });
    
    await sendWhatsAppMessage(phoneNumber, response.message);
    
  } catch (error) {
    console.error("[ERROR]", error.message);
  }
}

async function sendWhatsAppMessage(phoneNumber, message) {
  if (!sock) return;
  
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const jid = `${cleanPhone}@s.whatsapp.net`;
    
    // Simular "digitando..."
    await sock.sendPresenceUpdate("composing", jid);
    await delay(TYPING_DELAY_MS);
    
    // Delay humanizado antes de enviar
    await randomDelay();
    
    await sock.sendMessage(jid, { text: message });
    console.log(`[ENViado] ${phoneNumber}`);
  } catch (error) {
    console.error("[ENVIO ERRO]", error.message);
  }
}

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth");
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
    });
    
    sock.ev.on("creds.update", saveCreds);
    
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        qrCode = qr;
        await updateSessionStatus("aguardando_qr");
        console.log("[QR] Novo QR Code gerado");
      }
      
      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(`[CLOSE] Status: ${statusCode}, Reconectar: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          await updateSessionStatus("desconectado");
          setTimeout(connectToWhatsApp, 3000);
        } else {
          qrCode = null;
          await updateSessionStatus("desconectado");
        }
      }
      
      if (connection === "open") {
        qrCode = null;
        const phoneNumber = sock.user?.id?.replace(/:.*@/, "@")?.split("@")[0] || "";
        await updateSessionStatus("conectado", { p_phone_number: phoneNumber });
        console.log(`[CONECTADO] Numero: ${phoneNumber}`);
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
    console.error("[CONECTAO ERRO]", error.message);
    await updateSessionStatus("erro");
    setTimeout(connectToWhatsApp, 5000);
  }
}

// ==================== API ENDPOINTS ====================

app.get("/health", (req, res) => {
  res.json({ ok: true, status: connectionStatus, qr: !!qrCode });
});

app.get("/status", async (req, res) => {
  const session = await getSessionConfig();
  res.json({
    ok: true,
    status: session?.status || connectionStatus,
    qr_code: qrCode || session?.qr_code || null,
    phone_number: session?.phone_number || null,
    robot_active: session?.robot_active ?? true,
    human_mode: session?.human_mode ?? false,
  });
});

app.post("/send", async (req, res) => {
  const { phone, message } = req.body;
  
  if (!phone || !message) {
    return res.status(400).json({ ok: false, error: "phone e message sao obrigatorios" });
  }
  
  await sendWhatsAppMessage(phone, message);
  res.json({ ok: true });
});

// ==================== START ====================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n[SERVER] Rodando na porta ${PORT}`);
  console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
  console.log(`[SERVER] Status: http://localhost:${PORT}/status\n`);
  connectToWhatsApp();
});
