import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("[WhatsApp Engine] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_ANON_KEY) devem ser definidas");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const SESSION_ID = "DEFAULT_SESSION";
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const randomDelay = () => delay(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));

// =============================================
// INTENT PARSING (única implementação)
// =============================================

export function parseMessageIntent(text) {
  const normalized = text.trim().toLowerCase();

  if (/^(0|atendente|humano|falar com|ajuda|suporte)/i.test(normalized)) {
    return { intent: "transbordo_humano" };
  }
  if (/^(1|saldo|divida|devedor|quanto devo|ver saldo)/i.test(normalized)) {
    return { intent: "saldo" };
  }
  if (/^(2|pedido|comprar|quero|encomendar)/i.test(normalized)) {
    return { intent: "pedido" };
  }
  if (/^(3|pagamento|pagar|pix|dinheiro|quitar)/i.test(normalized)) {
    return { intent: "pagamento" };
  }
  if (/^(4|cardapio|cardápio|produtos|menu|lista)/i.test(normalized)) {
    return { intent: "cardapio" };
  }
  if (/^(5|sair|tchau|obrigad|até)/i.test(normalized)) {
    return { intent: "despedida" };
  }
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(normalized) || /^\d{11}$/.test(normalized)) {
    return { intent: "cpf_input", data: { cpf: normalized.replace(/\D/g, "") } };
  }
  if (/^r?\$?\s*\d+[.,]?\d*$/.test(normalized)) {
    const value = parseFloat(normalized.replace(/[R$\s]/g, "").replace(",", "."));
    if (value > 0) {
      return { intent: "valor_input", data: { amount: value } };
    }
  }
  return { intent: "free_text", data: { text: normalized } };
}

// =============================================
// DATABASE LOOKUPS (única implementação)
// =============================================

export async function lookupCustomerByCpf(cpf) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("cpf", cpf)
    .single();
  if (error || !data) return null;
  return data;
}

export async function lookupCustomerByPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, "");
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(
      `phone.eq.${cleanPhone},phone.eq.55${cleanPhone},phone.eq.${cleanPhone.replace(/^55/, "")}`
    )
    .limit(1)
    .single();
  if (error || !data) return null;
  return data;
}

export async function fetchProducts() {
  const { data: products } = await supabase
    .from("products")
    .select("name, price, category")
    .eq("available", true)
    .order("category");

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
    items.forEach((item) => {
      list += `• ${item.name} — R$ ${(item.price || 0).toFixed(2)}\n`;
    });
  }
  return list;
}

// =============================================
// SESSION & FLOW MANAGEMENT
// =============================================

export async function getSession(sessionId = SESSION_ID) {
  const { data } = await supabase.rpc("wa_get_session", { p_session_id: sessionId });
  return data;
}

export async function getActiveFlow() {
  const { data } = await supabase
    .from("wa_fluxos")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: false })
    .limit(1);
  return data?.[0]?.flow_data || null;
}

export async function getStoreName() {
  const { data } = await supabase
    .from("store_profiles")
    .select("store_name")
    .limit(1);
  return data?.[0]?.store_name || "FiadoPro";
}

export async function getOrCreateConversation(phoneNumber, sessionId = SESSION_ID) {
  const { data: conversa } = await supabase.rpc("wa_get_or_create_conversa", {
    p_phone_number: phoneNumber,
    p_session_id: sessionId,
  });
  return conversa;
}

export async function registerMessage(conversaId, phoneNumber, direction, content, agentPayload = null) {
  await supabase.rpc("wa_register_message", {
    p_conversa_id: conversaId,
    p_phone_number: phoneNumber,
    p_direction: direction,
    p_content: content,
    p_agent_payload: agentPayload,
  });
}

export async function updateFlowState(conversaId, newState, context = null) {
  const params = { p_conversa_id: conversaId, p_new_state: newState };
  if (context) params.p_context = JSON.stringify(context);
  await supabase.rpc("wa_update_flow_state", params);
}

export async function transferToHuman(conversaId, reason = "Solicitação do cliente") {
  await supabase.rpc("wa_transfer_to_human", {
    p_conversa_id: conversaId,
    p_reason: reason,
  });
}

// =============================================
// BUSINESS OPERATIONS
// =============================================

export async function createOrder(customer, description) {
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      description,
      amount: 0,
      status: "pendente",
      service_type: "online_entrega",
    })
    .select()
    .single();
  if (error) throw error;
  return order;
}

export async function registerPayment(customer, amount) {
  const now = new Date();
  const d = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const { data: result, error } = await supabase.rpc("register_transaction_atomic", {
    p_customer_id: customer.id,
    p_customer_name: customer.name,
    p_type: "pagamento",
    p_amount: amount,
    p_date: d,
    p_time: t,
    p_description: "Pagamento via WhatsApp",
  });
  if (error) throw error;
  return result;
}

// =============================================
// PAYLOAD & PROTOCOL BUILDERS
// =============================================

export function generateProtocol() {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `FP${datePart}${timePart}${random}`;
}

export function buildPayload(evento, transbordo, cliente, dadosContextuais) {
  return {
    conexao: {
      provedor: "baileys_qrcode_free",
      metodo_autenticacao: "QR_CODE",
      custo_api: 0.0,
    },
    evento,
    transbordo_humano: transbordo,
    cliente: {
      nome: cliente?.nome || null,
      telefone_whatsapp: cliente?.telefone || null,
      documento_ou_empresa: cliente?.documento || null,
    },
    dados_contextuais: dadosContextuais,
  };
}

// =============================================
// FLOW EXECUTION (única implementação)
// =============================================

export async function executeFlow(conversa, intent, rawMessage, flowData, storeName) {
  const flowState = conversa.flow_state || "menu_inicial";

  if (intent.intent === "transbordo_humano") {
    const protocol = conversa.protocol || generateProtocol();
    await transferToHuman(conversa.id);
    return {
      message: `👨‍💼 Entendi! Vou transferir para um atendente.\n\nAguarde um momento, em breve alguém irá atendê-lo.\n\n📋 Protocolo: *${protocol}*`,
      payload: buildPayload(
        "TRANSBORDO_HUMANO",
        true,
        { telefone: conversa.phone_number },
        {
          categoria_ou_modulo: "SUPORTE",
          prioridade_ou_urgencia: "URGENTE",
          assunto_resumido: "Transferência para atendente humano",
          detalhes_completos: "Solicitação do cliente",
          atributos_especificos: { protocol },
        }
      ),
    };
  }

  if (flowState === "menu_inicial" || intent.intent === "menu_inicial") {
    const menuMsg =
      flowData?.initial_menu?.message ||
      `Olá! Bem-vindo(a) ao *${storeName}*! 👋\n\nComo posso ajudar?\n\n1️⃣ Ver meu saldo e débitos\n2️⃣ Fazer um pedido\n3️⃣ Registrar pagamento\n4️⃣ Ver cardápio/produtos\n5️⃣ Falar com atendente\n\nDigite o número da opção desejada.`;
    await updateFlowState(conversa.id, "menu_inicial");
    return {
      message: menuMsg.replace(/\{store_name\}/g, storeName),
      payload: buildPayload(
        "MENU_INICIAL",
        false,
        { telefone: conversa.phone_number },
        {
          categoria_ou_modulo: "VENDAS",
          prioridade_ou_urgencia: "BAIXA",
          assunto_resumido: "Menu principal",
          detalhes_completos: "Exibição do menu",
          atributos_especificos: {},
        }
      ),
    };
  }

  if (flowState === "saldo" || intent.intent === "saldo") {
    if (intent.intent === "cpf_input" || /^\d{11}$/.test(rawMessage.replace(/\D/g, ""))) {
      const cpf = intent.data?.cpf || rawMessage.replace(/\D/g, "");
      const customer = await lookupCustomerByCpf(cpf);
      if (!customer) {
        await updateFlowState(conversa.id, "cpf_nao_encontrado");
        return {
          message:
            "❌ CPF não encontrado em nossa base.\n\nDeseja:\n1️⃣ Cadastrar-se\n2️⃣ Tentar novamente\n3️⃣ Falar com atendente",
          payload: buildPayload(
            "CPF_NAO_ENCONTRADO",
            false,
            { telefone: conversa.phone_number, documento: cpf },
            {
              categoria_ou_modulo: "VENDAS",
              prioridade_ou_urgencia: "BAIXA",
              assunto_resumido: "CPF não encontrado",
              detalhes_completos: "Consulta de saldo com CPF inexistente",
              atributos_especificos: {},
            }
          ),
        };
      }
      await updateFlowState(conversa.id, "saldo_resultado", {
        customer_id: customer.id,
        customer_name: customer.name,
      });
      const balance = `R$ ${(customer.balance || 0).toFixed(2)}`;
      const limit = `R$ ${(customer.credit_limit || 0).toFixed(2)}`;
      return {
        message: `📋 *Dados da sua conta:*\n\nNome: ${customer.name}\nSaldo devedor: *${balance}*\nLimite de crédito: *${limit}*\n\nDeseja algo mais?\n1️⃣ Fazer pedido\n2️⃣ Registrar pagamento\n3️⃣ Voltar ao menu\n4️⃣ Sair`,
        payload: buildPayload(
          "CONSULTA_SALDO",
          false,
          { nome: customer.name, telefone: customer.phone, documento: customer.cpf },
          {
            categoria_ou_modulo: "VENDAS",
            prioridade_ou_urgencia: "BAIXA",
            assunto_resumido: "Consulta de saldo",
            detalhes_completos: `Saldo: ${balance}, Limite: ${limit}`,
            atributos_especificos: { saldo: customer.balance, limite: customer.credit_limit },
          }
        ),
      };
    }
    await updateFlowState(conversa.id, "saldo");
    return {
      message: "Para consultar seu saldo, preciso do seu *CPF*:\n\nDigite apenas os números do CPF.",
      payload: buildPayload(
        "SOLICITACAO_CPF",
        false,
        { telefone: conversa.phone_number },
        {
          categoria_ou_modulo: "VENDAS",
          prioridade_ou_urgencia: "BAIXA",
          assunto_resumido: "Solicitação de CPF",
          detalhes_completos: "Aguardando CPF do cliente",
          atributos_especificos: {},
        }
      ),
    };
  }

  if (flowState === "pedido" || intent.intent === "pedido") {
    await updateFlowState(conversa.id, "pedido");
    return {
      message:
        "Pedido realizado! 🛒\n\nEnvie os itens desejados ou acesse nosso cardápio:\n\n1️⃣ Ver cardápio\n2️⃣ Digitar pedido livre\n3️⃣ Voltar ao menu",
      payload: buildPayload(
        "MENU_PEDIDO",
        false,
        { telefone: conversa.phone_number },
        {
          categoria_ou_modulo: "VENDAS",
          prioridade_ou_urgencia: "MEDIA",
          assunto_resumido: "Menu de pedido",
          detalhes_completos: "Exibição do menu de pedido",
          atributos_especificos: {},
        }
      ),
    };
  }

  if (flowState === "cardapio" || intent.intent === "cardapio") {
    const productList = await fetchProducts();
    await updateFlowState(conversa.id, "pedido_livre");
    return {
      message: `📋 *Nosso Cardápio:*\n${productList}\n\nPara fazer um pedido, digite o nome do produto.`,
      payload: buildPayload(
        "CARDAPIO_EXIBIDO",
        false,
        { telefone: conversa.phone_number },
        {
          categoria_ou_modulo: "VENDAS",
          prioridade_ou_urgencia: "BAIXA",
          assunto_resumido: "Cardápio exibido",
          detalhes_completos: "Lista de produtos enviada",
          atributos_especificos: {},
        }
      ),
    };
  }

  if (flowState === "pedido_livre" || (flowState === "pedido" && intent.intent === "free_text")) {
    const customer = await lookupCustomerByPhone(conversa.phone_number);
    if (customer) {
      const order = await createOrder(customer, rawMessage);
      await updateFlowState(conversa.id, "menu_inicial");
      return {
        message: `✅ Pedido registrado!\n\nDescrição: ${rawMessage}\nStatus: Aguardando aprovação\n\nVocê receberá uma confirmação em breve!`,
        payload: buildPayload(
          "REGISTRO_PROCESSADO",
          false,
          { nome: customer.name, telefone: customer.phone, documento: customer.cpf },
          {
            categoria_ou_modulo: "VENDAS",
            prioridade_ou_urgencia: "MEDIA",
            assunto_resumido: "Novo pedido via WhatsApp",
            detalhes_completos: rawMessage,
            atributos_especificos: { order_id: order.id, status: "pendente" },
          }
        ),
      };
    }
    return {
      message: "Para registrar o pedido, preciso identificá-lo.\n\nDigite seu *CPF*:",
      payload: buildPayload(
        "PEDIDO_SEM_CLIENTE",
        false,
        { telefone: conversa.phone_number },
        {
          categoria_ou_modulo: "VENDAS",
          prioridade_ou_urgencia: "MEDIA",
          assunto_resumido: "Pedido sem cliente",
          detalhes_completos: "Aguardando identificação do cliente",
          atributos_especificos: {},
        }
      ),
    };
  }

  if (flowState === "pagamento" || intent.intent === "pagamento") {
    if (intent.intent === "valor_input" || /^\d+[.,]?\d*$/.test(rawMessage.replace(/[R$\s]/g, ""))) {
      const amount =
        intent.data?.amount || parseFloat(rawMessage.replace(/[R$\s]/g, "").replace(",", "."));
      if (amount > 0) {
        const customer = await lookupCustomerByPhone(conversa.phone_number);
        if (customer) {
          const result = await registerPayment(customer, amount);
          const newBalance = result?.new_balance ?? 0;
          await updateFlowState(conversa.id, "menu_inicial");
          return {
            message: `✅ Pagamento de *R$ ${amount.toFixed(2)}* registrado!\n\nNovo saldo: *R$ ${newBalance.toFixed(2)}*\n\nObrigado! 🙏`,
            payload: buildPayload(
              "REGISTRO_PROCESSADO",
              false,
              { nome: customer.name, telefone: customer.phone, documento: customer.cpf },
              {
                categoria_ou_modulo: "VENDAS",
                prioridade_ou_urgencia: "BAIXA",
                assunto_resumido: "Pagamento registrado via WhatsApp",
                detalhes_completos: `Pagamento de R$ ${amount.toFixed(2)}`,
                atributos_especificos: { amount, new_balance: newBalance },
              }
            ),
          };
        }
      }
    }
    await updateFlowState(conversa.id, "pagamento");
    return {
      message:
        "💰 *Registrar Pagamento*\n\nEnvie o valor que deseja pagar.\n\nEx: *150,00*\n\nOu envie *pix* para ver nossas chaves.",
      payload: buildPayload(
        "SOLICITACAO_PAGAMENTO",
        false,
        { telefone: conversa.phone_number },
        {
          categoria_ou_modulo: "VENDAS",
          prioridade_ou_urgencia: "BAIXA",
          assunto_resumido: "Solicitação de pagamento",
          detalhes_completos: "Aguardando valor do pagamento",
          atributos_especificos: {},
        }
      ),
    };
  }

  if (flowState === "despedida" || intent.intent === "despedida") {
    await updateFlowState(conversa.id, "finalizada");
    return {
      message: `Obrigado por nos contatar! 😊\n\n*${storeName}* - Estamos aqui quando precisar!\nAté mais! 👋`,
      payload: buildPayload(
        "CONVERSAS_FINALIZADA",
        false,
        { telefone: conversa.phone_number },
        {
          categoria_ou_modulo: "VENDAS",
          prioridade_ou_urgencia: "BAIXA",
          assunto_resumido: "Conversa finalizada",
          detalhes_completos: "Despedida do cliente",
          atributos_especificos: {},
        }
      ),
    };
  }

  // Fallback
  const menuMsg =
    flowData?.initial_menu?.message ||
    `Olá! Bem-vindo(a) ao *${storeName}*! 👋\n\nComo posso ajudar?\n\n1️⃣ Ver meu saldo e débitos\n2️⃣ Fazer um pedido\n3️⃣ Registrar pagamento\n4️⃣ Ver cardápio/produtos\n5️⃣ Falar com atendente\n\nDigite o número da opção desejada.`;
  await updateFlowState(conversa.id, "menu_inicial");
  return {
    message: menuMsg.replace(/\{store_name\}/g, storeName),
    payload: buildPayload(
      "FALLBACK_MENU",
      false,
      { telefone: conversa.phone_number },
      {
        categoria_ou_modulo: "VENDAS",
        prioridade_ou_urgencia: "BAIXA",
        assunto_resumido: "Fallback menu",
        detalhes_completos: "Mensagem não reconhecida",
        atributos_especificos: {},
      }
    ),
  };
}

// =============================================
// MAIN PROCESSOR (único ponto de entrada)
// =============================================

export async function processAgentMessage(phoneNumber, messageText, sessionId = SESSION_ID) {
  const session = await getSession(sessionId);

  if (session && !session.robot_active) return null;
  if (session && session.human_mode) return null;

  const flowData = await getActiveFlow();
  const storeName = await getStoreName();
  const conversa = await getOrCreateConversation(phoneNumber, sessionId);
  if (!conversa) return null;

  await registerMessage(conversa.id, phoneNumber, "incoming", messageText);

  const intent = parseMessageIntent(messageText);
  const response = await executeFlow(conversa, intent, messageText, flowData, storeName);

  await registerMessage(conversa.id, phoneNumber, "outgoing", response.message, response.payload);

  return response;
}

export { SESSION_ID };
