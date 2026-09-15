import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/constants";

const SESSION_ID = "DEFAULT_SESSION";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => delay(2000 + Math.random() * 3000);

function interpolateTemplate(template, vars = {}) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value ?? "");
  }
  return result;
}

function generateProtocol() {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `FP${datePart}${timePart}${random}`;
}

function parseIntent(text) {
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

function buildPayload(evento, transbordo, cliente, dados) {
  return {
    conexao: { provedor: "baileys_qrcode_free", metodo_autenticacao: "QR_CODE", custo_api: 0 },
    evento,
    transbordo_humano: transbordo,
    cliente: {
      nome: cliente?.nome || null,
      telefone_whatsapp: cliente?.telefone || null,
      documento_ou_empresa: cliente?.documento || null,
    },
    dados_contextuais: dados,
  };
}

async function getSession(sessionId = SESSION_ID) {
  const { data } = await supabase.rpc("wa_get_session", { p_session_id: sessionId });
  return data;
}

async function getActiveFlow() {
  const { data } = await supabase
    .from("wa_fluxos")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: false })
    .limit(1);
  return data?.[0]?.flow_data || null;
}

async function getStoreName() {
  const { data } = await supabase.from("store_profiles").select("store_name").limit(1);
  return data?.[0]?.store_name || "FiadoPro";
}

async function lookupCustomerByCpf(cpf) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("cpf", cpf)
    .single();
  if (error || !data) return null;
  return data;
}

async function lookupCustomerByPhone(phone) {
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

async function fetchProducts() {
  const { data: products, error } = await supabase
    .from("products")
    .select("name, price, category")
    .eq("available", true)
    .order("category");

  if (error || !products || products.length === 0) return "Nenhum produto disponível no momento.";

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
      list += `• ${item.name} — ${formatCurrency(item.price)}\n`;
    });
  }
  return list;
}

async function createOrder(customer, description) {
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

async function registerPayment(customer, amount) {
  const { format: formatDate } = await import("date-fns");
  const now = new Date();

  const { data: result, error } = await supabase.rpc("register_transaction_atomic", {
    p_customer_id: customer.id,
    p_customer_name: customer.name,
    p_type: "pagamento",
    p_amount: amount,
    p_date: formatDate(now, "dd/MM/yyyy"),
    p_time: formatDate(now, "HH:mm"),
    p_description: "Pagamento via WhatsApp",
  });

  if (error) throw error;
  return result;
}

async function getOrCreateConversation(phoneNumber, sessionId = SESSION_ID) {
  const { data: conversa } = await supabase.rpc("wa_get_or_create_conversa", {
    p_phone_number: phoneNumber,
    p_session_id: sessionId,
  });
  return conversa;
}

async function registerIncomingMessage(conversaId, phoneNumber, content) {
  await supabase.rpc("wa_register_message", {
    p_conversa_id: conversaId,
    p_phone_number: phoneNumber,
    p_direction: "incoming",
    p_content: content,
  });
}

async function registerOutgoingMessage(conversaId, phoneNumber, content, payload = null) {
  await supabase.rpc("wa_register_message", {
    p_conversa_id: conversaId,
    p_phone_number: phoneNumber,
    p_direction: "outgoing",
    p_content: content,
    p_agent_payload: payload || null,
  });
}

async function updateFlowState(conversaId, newState, context = null) {
  const params = { p_conversa_id: conversaId, p_new_state: newState };
  if (context) params.p_context = JSON.stringify(context);
  await supabase.rpc("wa_update_flow_state", params);
}

async function transferToHuman(conversaId, reason = "Solicitação do cliente") {
  await supabase.rpc("wa_transfer_to_human", { p_conversa_id: conversaId, p_reason: reason });
}

async function executeFlow(conversa, intent, rawMessage, flowData, storeName) {
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
          detalhes_completos: "Cliente solicitou atendente humano",
          atributos_especificos: { protocol },
        }
      ),
    };
  }

  if (flowState === "menu_inicial" || intent.intent === "menu_inicial") {
    const menuMsg =
      flowData?.initial_menu?.message ||
      `Olá! Bem-vindo(a) ao *${storeName}*!\n\nComo posso ajudar?\n\n1 - Ver meu saldo e débitos\n2 - Fazer um pedido\n3 - Registrar pagamento\n4 - Ver cardápio/produtos\n5 - Falar com atendente\n\nDigite o número da opção desejada.`;

    await updateFlowState(conversa.id, "menu_inicial");
    return {
      message: interpolateTemplate(menuMsg, { store_name: storeName }),
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
            "❌ CPF não encontrado em nossa base.\n\nDeseja:\n1 - Cadastrar-se\n2 - Tentar novamente\n3 - Falar com atendente",
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

      const balance = formatCurrency(customer.balance || 0);
      const limit = formatCurrency(customer.credit_limit || 0);

      return {
        message: `📋 *Dados da sua conta:*\n\nNome: ${customer.name}\nSaldo devedor: *${balance}*\nLimite de crédito: *${limit}*\n\nDeseja algo mais?\n1 - Fazer pedido\n2 - Registrar pagamento\n3 - Voltar ao menu\n4 - Sair`,
        payload: buildPayload(
          "CONSULTA_SALDO",
          false,
          { nome: customer.name, telefone: customer.phone, documento: customer.cpf },
          {
            categoria_ou_modulo: "VENDAS",
            prioridade_ou_urgencia: "BAIXA",
            assunto_resumido: "Consulta de saldo",
            detalhes_completos: `Saldo devedor: ${balance}, Limite: ${limit}`,
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
        "Pedido realizado!\n\nEnvie os itens desejados ou acesse nosso cardápio:\n\n1 - Ver cardápio\n2 - Digitar pedido livre\n3 - Voltar ao menu",
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
    if (
      intent.intent === "valor_input" ||
      /^\d+[.,]?\d*$/.test(rawMessage.replace(/[R$\s]/g, ""))
    ) {
      const amount =
        intent.data?.amount ||
        parseFloat(rawMessage.replace(/[R$\s]/g, "").replace(",", "."));

      if (amount > 0) {
        const customer = await lookupCustomerByPhone(conversa.phone_number);

        if (customer) {
          const result = await registerPayment(customer, amount);
          const newBalance = result?.new_balance ?? 0;

          await updateFlowState(conversa.id, "menu_inicial");
          return {
            message: `✅ Pagamento de *${formatCurrency(amount)}* registrado!\n\nNovo saldo: *${formatCurrency(newBalance)}*\n\nObrigado! 🙏`,
            payload: buildPayload(
              "REGISTRO_PROCESSADO",
              false,
              { nome: customer.name, telefone: customer.phone, documento: customer.cpf },
              {
                categoria_ou_modulo: "VENDAS",
                prioridade_ou_urgencia: "BAIXA",
                assunto_resumido: "Pagamento registrado via WhatsApp",
                detalhes_completos: `Pagamento de ${formatCurrency(amount)}`,
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

  const menuMsg =
    flowData?.initial_menu?.message ||
    `Olá! Bem-vindo(a) ao *${storeName}*!\n\nComo posso ajudar?\n\n1 - Ver meu saldo e débitos\n2 - Fazer um pedido\n3 - Registrar pagamento\n4 - Ver cardápio/produtos\n5 - Falar com atendente\n\nDigite o número da opção desejada.`;

  await updateFlowState(conversa.id, "menu_inicial");
  return {
    message: interpolateTemplate(menuMsg, { store_name: storeName }),
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

export class WhatsAppFlowEngine {
  constructor(sessionId = SESSION_ID) {
    this.sessionId = sessionId;
    this.flowData = null;
    this.storeProfile = null;
  }

  async initialize() {
    this.flowData = await getActiveFlow();

    const { data: profiles } = await supabase
      .from("store_profiles")
      .select("*")
      .limit(1);

    if (profiles && profiles.length > 0) {
      this.storeProfile = profiles[0];
    }
  }

  async processMessage(phoneNumber, messageText) {
    const session = await getSession(this.sessionId);

    if (session && !session.robot_active) return null;
    if (session && session.human_mode) return null;

    await this.initialize();

    const conversa = await getOrCreateConversation(phoneNumber, this.sessionId);
    if (!conversa) return null;

    await registerIncomingMessage(conversa.id, phoneNumber, messageText);

    const intent = parseIntent(messageText);
    const storeName = this.storeProfile?.store_name || "FiadoPro";
    const response = await executeFlow(conversa, intent, messageText, this.flowData, storeName);

    await registerOutgoingMessage(
      conversa.id,
      phoneNumber,
      response.message,
      response.payload
    );

    return response;
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

export async function WhatsAppAgent(phoneNumber, messageText, sessionId = SESSION_ID) {
  const engine = new WhatsAppFlowEngine(sessionId);
  await randomDelay();
  return engine.processMessage(phoneNumber, messageText);
}

export async function processMessage(phone, text, options = {}) {
  const sessionId = options.sessionId || SESSION_ID;
  const engine = new WhatsAppFlowEngine(sessionId);
  return engine.processMessage(phone, text);
}

export {
  parseIntent,
  lookupCustomerByCpf,
  lookupCustomerByPhone,
  fetchProducts,
  createOrder,
  registerPayment,
  generateProtocol,
  buildPayload,
  executeFlow,
  getSession,
  getActiveFlow,
  getStoreName,
};
