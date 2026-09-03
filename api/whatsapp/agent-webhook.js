import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TYPING_DELAY_MS = 1500;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => delay(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

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
  if (!products || products.length === 0) return "Nenhum produto disponível no momento.";
  
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

async function getStoreName() {
  const { data } = await supabase.from("store_profiles").select("store_name").limit(1);
  return data?.[0]?.store_name || "FiadoPro";
}

async function getActiveFlow() {
  const { data } = await supabase.from("wa_fluxos").select("*").eq("active", true).order("priority", { ascending: false }).limit(1);
  return data?.[0]?.flow_data || null;
}

async function sendEvolutionMessage(instanceId, apiKey, apiUrl, phone, message) {
  if (!instanceId || !apiKey || !apiUrl) return;
  
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    
    await fetch(`${apiUrl}/message/sendText/${instanceId}`, {
      method: "POST",
      headers: { "apikey": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number: formattedPhone, text: message }),
    });
  } catch (error) {
    console.error("[Evolution API] Erro ao enviar mensagem:", error.message);
  }
}

async function processAgentMessage(phoneNumber, messageText, sessionId = "DEFAULT_SESSION") {
  const flowData = await getActiveFlow();
  const storeName = await getStoreName();
  
  const { data: conversa } = await supabase.rpc("wa_get_or_create_conversa", {
    p_phone_number: phoneNumber,
    p_session_id: sessionId,
  });
  
  if (!conversa) return { message: "Desculpe, houve um erro. Tente novamente." };
  
  await supabase.rpc("wa_register_message", {
    p_conversa_id: conversa.id,
    p_phone_number: phoneNumber,
    p_direction: "incoming",
    p_content: messageText,
  });
  
  const intent = parseMessageIntent(messageText);
  const flowState = conversa.flow_state || "menu_inicial";
  const context = conversa.context || {};
  
  let responseMessage = "";
  let payload = null;
  
  if (intent.intent === "transbordo_humano") {
    const protocol = conversa.protocol || `FP${Date.now()}`;
    await supabase.rpc("wa_transfer_to_human", { p_conversa_id: conversa.id, p_reason: "Solicitação do cliente" });
    responseMessage = `👨‍💼 Entendi! Vou transferir para um atendente.\n\nAguarde um momento, em breve alguém irá atendê-lo.\n\n📋 Protocolo: *${protocol}*`;
    payload = { evento: "TRANSBORDO_HUMANO", transbordo_humano: true, protocol };
  }
  else if (flowState === "menu_inicial" || intent.intent === "menu_inicial") {
    const menuMsg = flowData?.initial_menu?.message || `Olá! Bem-vindo(a) ao *${storeName}*! 👋\n\nComo posso ajudar?\n\n1️⃣ Ver meu saldo e débitos\n2️⃣ Fazer um pedido\n3️⃣ Registrar pagamento\n4️⃣ Ver cardápio/produtos\n5️⃣ Falar com atendente\n\nDigite o número da opção desejada.`;
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "menu_inicial" });
    responseMessage = menuMsg.replace(/\{store_name\}/g, storeName);
    payload = { evento: "MENU_INICIAL", categoria_ou_fluxo: "MENU" };
  }
  else if (flowState === "saldo" || intent.intent === "saldo") {
    if (intent.intent === "cpf_input" || /^\d{11}$/.test(messageText.replace(/\D/g, ""))) {
      const cpf = intent.data?.cpf || messageText.replace(/\D/g, "");
      const customer = await lookupCustomerByCpf(cpf);
      
      if (!customer) {
        await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "cpf_nao_encontrado" });
        responseMessage = "❌ CPF não encontrado em nossa base.\n\nDeseja:\n1️⃣ Cadastrar-se\n2️⃣ Tentar novamente\n3️⃣ Falar com atendente";
        payload = { evento: "CPF_NAO_ENCONTRADO" };
      } else {
        await supabase.rpc("wa_update_flow_state", {
          p_conversa_id: conversa.id, p_new_state: "saldo_resultado",
          p_context: JSON.stringify({ customer_id: customer.id, customer_name: customer.name }),
        });
        const balance = `R$ ${(customer.balance || 0).toFixed(2)}`;
        const limit = `R$ ${(customer.credit_limit || 0).toFixed(2)}`;
        responseMessage = `📋 *Dados da sua conta:*\n\nNome: ${customer.name}\nSaldo devedor: *${balance}*\nLimite de crédito: *${limit}*\n\nDeseja algo mais?\n1️⃣ Fazer pedido\n2️⃣ Registrar pagamento\n3️⃣ Voltar ao menu\n4️⃣ Sair`;
        payload = { evento: "CONSULTA_SALDO", cliente: { nome: customer.name, telefone_whatsapp: customer.phone }, dados_contextuais: { saldo: customer.balance, limite: customer.credit_limit } };
      }
    } else {
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "saldo" });
      responseMessage = "Para consultar seu saldo, preciso do seu *CPF*:\n\nDigite apenas os números do CPF.";
      payload = { evento: "SOLICITACAO_CPF" };
    }
  }
  else if (flowState === "pedido" || intent.intent === "pedido") {
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "pedido" });
    responseMessage = "Pedido realizado! 🛒\n\nEnvie os itens desejados ou acesse nosso cardápio:\n\n1️⃣ Ver cardápio\n2️⃣ Digitar pedido livre\n3️⃣ Voltar ao menu";
    payload = { evento: "MENU_PEDIDO" };
  }
  else if (flowState === "cardapio" || intent.intent === "cardapio") {
    const productList = await fetchProducts();
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "pedido_livre" });
    responseMessage = `📋 *Nosso Cardápio:*\n${productList}\n\nPara fazer um pedido, digite o nome do produto.`;
    payload = { evento: "CARDAPIO_EXIBIDO" };
  }
  else if (flowState === "pedido_livre" || (flowState === "pedido" && intent.intent === "free_text")) {
    const customer = await lookupCustomerByPhone(conversa.phone_number);
    if (customer) {
      const { data: order } = await supabase.from("orders").insert({
        customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone,
        description: messageText, amount: 0, status: "pendente", service_type: "online_entrega",
      }).select().single();
      
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "menu_inicial" });
      responseMessage = `✅ Pedido registrado!\n\nDescrição: ${messageText}\nStatus: Aguardando aprovação\n\nVocê receberá uma confirmação em breve!`;
      payload = { evento: "NOVO_REGISTRO_SISTEMA", cliente: { nome: customer.name, telefone_whatsapp: customer.phone }, dados_contextuais: { categoria_ou_fluxo: "PEDIDO", titulo_resumido: "Novo pedido via WhatsApp", detalhes_completos: messageText, metadados_especificos: { order_id: order?.id, status: "pendente" } } };
    } else {
      responseMessage = "Para registrar o pedido, preciso identificá-lo.\n\nDigite seu *CPF*:";
      payload = { evento: "PEDIDO_SEM_CLIENTE" };
    }
  }
  else if (flowState === "pagamento" || intent.intent === "pagamento") {
    if (intent.intent === "valor_input" || /^\d+[.,]?\d*$/.test(messageText.replace(/[R$\s]/g, ""))) {
      const amount = intent.data?.amount || parseFloat(messageText.replace(/[R$\s]/g, "").replace(",", "."));
      if (amount > 0) {
        const customer = await lookupCustomerByPhone(conversa.phone_number);
        if (customer) {
          const { format: formatDate } = await import("date-fns");
          const now = new Date();
          const { data: result } = await supabase.rpc("register_transaction_atomic", {
            p_customer_id: customer.id, p_customer_name: customer.name, p_type: "pagamento",
            p_amount: amount, p_date: formatDate(now, "dd/MM/yyyy"), p_time: formatDate(now, "HH:mm"),
            p_description: "Pagamento via WhatsApp Agent",
          });
          const newBalance = result?.new_balance ?? 0;
          await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "menu_inicial" });
          responseMessage = `✅ Pagamento de *R$ ${amount.toFixed(2)}* registrado!\n\nNovo saldo: *R$ ${newBalance.toFixed(2)}*\n\nObrigado! 🙏`;
          payload = { evento: "NOVO_REGISTRO_SISTEMA", cliente: { nome: customer.name, telefone_whatsapp: customer.phone }, dados_contextuais: { categoria_ou_fluxo: "PAGAMENTO", titulo_resumido: "Pagamento via WhatsApp", metadados_especificos: { amount, new_balance: newBalance } } };
        }
      }
    }
    if (!responseMessage) {
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "pagamento" });
      responseMessage = "💰 *Registrar Pagamento*\n\nEnvie o valor que deseja pagar.\n\nEx: *150,00*\n\nOu envie *pix* para ver nossas chaves.";
      payload = { evento: "SOLICITACAO_PAGAMENTO" };
    }
  }
  else if (flowState === "despedida" || intent.intent === "despedida") {
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "finalizada" });
    responseMessage = `Obrigado por nos contatar! 😊\n\n*${storeName}* - Estamos aqui quando precisar!\nAté mais! 👋`;
    payload = { evento: "CONVERSAS_FINALIZADA" };
  }
  else {
    const menuMsg = flowData?.initial_menu?.message || `Olá! Bem-vindo(a) ao *${storeName}*! 👋\n\nComo posso ajudar?\n\n1️⃣ Ver meu saldo e débitos\n2️⃣ Fazer um pedido\n3️⃣ Registrar pagamento\n4️⃣ Ver cardápio/produtos\n5️⃣ Falar com atendente\n\nDigite o número da opção desejada.`;
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conversa.id, p_new_state: "menu_inicial" });
    responseMessage = menuMsg.replace(/\{store_name\}/g, storeName);
    payload = { evento: "FALLBACK_MENU" };
  }
  
  await supabase.rpc("wa_register_message", {
    p_conversa_id: conversa.id, p_phone_number: phoneNumber, p_direction: "outgoing",
    p_content: responseMessage, p_agent_payload: payload || null,
  });
  
  return { message: responseMessage, payload };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    const body = req.body;
    
    const instanceId = body.instance || body.instanceId;
    const apiKey = body.apikey || body.apiKey;
    const event = body.event;
    
    if (event === "messages.upsert") {
      const messageData = body.data;
      
      if (!messageData || messageData.key?.fromMe) {
        return res.status(200).json({ ok: true });
      }
      
      const phoneNumber = messageData.key?.remoteJid?.replace("@s.whatsapp.net", "")?.replace("@g.us", "") || "";
      const messageText = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || "";
      
      if (!phoneNumber || !messageText) {
        return res.status(200).json({ ok: true });
      }
      
      const { data: session } = await supabase.rpc("wa_get_session", { p_session_id: "DEFAULT_SESSION" });
      
      if (session && !session.robot_active) {
        return res.status(200).json({ ok: true, note: "Robot paused" });
      }
      
      if (session && session.human_mode) {
        return res.status(200).json({ ok: true, note: "Human mode active" });
      }
      
      const fullPhone = phoneNumber.startsWith("55") ? phoneNumber : `55${phoneNumber}`;
      
      const response = await processAgentMessage(fullPhone, messageText, session?.session_id || "DEFAULT_SESSION");
      
      if (response.message && session) {
        await randomDelay();
        
        await sendEvolutionMessage(
          session.instance_id,
          session.api_key,
          session.api_url,
          fullPhone,
          response.message
        );
      }
      
      return res.status(200).json({
        ok: true,
        response: response.message,
        payload: response.payload,
      });
    }
    
    if (event === "connection.update") {
      const status = body.data?.state || "disconnected";
      const mappedStatus = status === "open" ? "conectado" : status === "close" ? "desconectado" : "aguardando_qr";
      
      await supabase.rpc("wa_upsert_session", {
        p_session_id: "DEFAULT_SESSION",
        p_status: mappedStatus,
        p_instance_id: instanceId,
        p_provider: "evolution",
      });
      
      return res.status(200).json({ ok: true });
    }
    
    if (event === "qrcode.updated") {
      const qrCode = body.data?.base64 || body.data;
      
      await supabase.rpc("wa_upsert_session", {
        p_session_id: "DEFAULT_SESSION",
        p_status: "aguardando_qr",
        p_qr_code: qrCode,
        p_instance_id: instanceId,
        p_provider: "evolution",
      });
      
      return res.status(200).json({ ok: true });
    }
    
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]", error);
    return res.status(500).json({ error: error.message });
  }
}
