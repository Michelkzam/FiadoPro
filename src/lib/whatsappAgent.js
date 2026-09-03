import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/constants";

const TYPING_DELAY_MS = 1500;
const MIN_RESPONSE_DELAY_MS = 2000;
const MAX_RESPONSE_DELAY_MS = 5000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = () => delay(MIN_RESPONSE_DELAY_MS + Math.random() * (MAX_RESPONSE_DELAY_MS - MIN_RESPONSE_DELAY_MS));

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

function parseMessageIntent(text) {
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

async function lookupCustomerByCpf(cpf) {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .eq("cpf", cpf)
    .single();
  
  if (error || !customers) return null;
  return customers;
}

async function lookupCustomerByPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, "");
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .or(`phone.eq.${cleanPhone},phone.eq.55${cleanPhone},phone.eq.${cleanPhone.replace(/^55/, "")}`)
    .limit(1)
    .single();
  
  if (error || !customers) return null;
  return customers;
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

async function createOrderFromMessage(customer, description) {
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      description: description,
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
  const now = new Date();
  const { format: formatDate } = await import("date-fns");
  
  const { data: result, error } = await supabase.rpc("register_transaction_atomic", {
    p_customer_id: customer.id,
    p_customer_name: customer.name,
    p_type: "pagamento",
    p_amount: amount,
    p_date: formatDate(now, "dd/MM/yyyy"),
    p_time: formatDate(now, "HH:mm"),
    p_description: "Pagamento via WhatsApp Agent",
  });
  
  if (error) throw error;
  return result;
}

export class WhatsAppAgent {
  constructor(sessionId = "DEFAULT_SESSION") {
    this.sessionId = sessionId;
    this.flowData = null;
    this.storeProfile = null;
  }

  async initialize() {
    const { data: flows } = await supabase
      .from("wa_fluxos")
      .select("*")
      .eq("active", true)
      .order("priority", { ascending: false })
      .limit(1);
    
    if (flows && flows.length > 0) {
      this.flowData = flows[0].flow_data;
    }
    
    const { data: profiles } = await supabase
      .from("store_profiles")
      .select("*")
      .limit(1);
    
    if (profiles && profiles.length > 0) {
      this.storeProfile = profiles[0];
    }
  }

  async processMessage(phoneNumber, messageText) {
    await this.initialize();
    
    const { data: conversa } = await supabase.rpc("wa_get_or_create_conversa", {
      p_phone_number: phoneNumber,
      p_session_id: this.sessionId,
    });
    
    if (!conversa) {
      return this.buildResponse("Desculpe, houve um erro. Tente novamente.", null);
    }
    
    await supabase.rpc("wa_register_message", {
      p_conversa_id: conversa.id,
      p_phone_number: phoneNumber,
      p_direction: "incoming",
      p_content: messageText,
    });
    
    const intent = parseMessageIntent(messageText);
    const response = await this.executeFlow(conversa, intent, messageText);
    
    await supabase.rpc("wa_register_message", {
      p_conversa_id: conversa.id,
      p_phone_number: phoneNumber,
      p_direction: "outgoing",
      p_content: response.message,
      p_agent_payload: response.payload || null,
    });
    
    return response;
  }

  async executeFlow(conversa, intent, rawMessage) {
    const flowState = conversa.flow_state || "menu_inicial";
    const context = conversa.context || {};
    const storeName = this.storeProfile?.store_name || "FiadoPro";
    
    if (intent.intent === "transbordo_humano") {
      await supabase.rpc("wa_transfer_to_human", {
        p_conversa_id: conversa.id,
        p_reason: "Solicitação do cliente",
      });
      
      const protocol = conversa.protocol || generateProtocol();
      return this.buildResponse(
        `👨‍💼 Entendi! Vou transferir para um atendente.\n\nAguarde um momento, em breve alguém irá atendê-lo.\n\n📋 Protocolo: *${protocol}*`,
        { evento: "TRANSBORDO_HUMANO", transbordo_humano: true, protocol }
      );
    }
    
    if (flowState === "menu_inicial" || intent.intent === "menu_inicial") {
      const menuMsg = this.flowData?.initial_menu?.message || 
        `Olá! Bem-vindo(a) ao *${storeName}*! 👋\n\nComo posso ajudar?\n\n1️⃣ Ver meu saldo e débitos\n2️⃣ Fazer um pedido\n3️⃣ Registrar pagamento\n4️⃣ Ver cardápio/produtos\n5️⃣ Falar com atendente\n\nDigite o número da opção desejada.`;
      
      await supabase.rpc("wa_update_flow_state", {
        p_conversa_id: conversa.id,
        p_new_state: "menu_inicial",
      });
      
      return this.buildResponse(interpolateTemplate(menuMsg, { store_name: storeName }), {
        evento: "MENU_INICIAL",
        categoria_ou_fluxo: "MENU",
      });
    }
    
    if (flowState === "menu_inicial") {
      const option = this.flowData?.initial_menu?.options?.[intent.intent];
      if (option) {
        await supabase.rpc("wa_update_flow_state", {
          p_conversa_id: conversa.id,
          p_new_state: option,
        });
        return this.executeFlow({ ...conversa, flow_state: option }, intent, rawMessage);
      }
    }
    
    if (flowState === "saldo" || intent.intent === "saldo") {
      if (intent.intent === "cpf_input" || /^\d{11}$/.test(rawMessage.replace(/\D/g, ""))) {
        const cpf = intent.data?.cpf || rawMessage.replace(/\D/g, "");
        const customer = await lookupCustomerByCpf(cpf);
        
        if (!customer) {
          await supabase.rpc("wa_update_flow_state", {
            p_conversa_id: conversa.id,
            p_new_state: "cpf_nao_encontrado",
          });
          return this.buildResponse(
            "❌ CPF não encontrado em nossa base.\n\nDeseja:\n1️⃣ Cadastrar-se\n2️⃣ Tentar novamente\n3️⃣ Falar com atendente",
            { evento: "CPF_NAO_ENCONTRADO" }
          );
        }
        
        await supabase.rpc("wa_update_flow_state", {
          p_conversa_id: conversa.id,
          p_new_state: "saldo_resultado",
          p_context: JSON.stringify({ customer_id: customer.id, customer_name: customer.name }),
        });
        
        const balance = formatCurrency(customer.balance || 0);
        const limit = formatCurrency(customer.credit_limit || 0);
        
        return this.buildResponse(
          `📋 *Dados da sua conta:*\n\nNome: ${customer.name}\nSaldo devedor: *${balance}*\nLimite de crédito: *${limit}*\n\nDeseja algo mais?\n1️⃣ Fazer pedido\n2️⃣ Registrar pagamento\n3️⃣ Voltar ao menu\n4️⃣ Sair`,
          {
            evento: "CONSULTA_SALDO",
            cliente: { nome: customer.name, telefone_whatsapp: customer.phone, cpf: customer.cpf },
            dados_contextuais: { saldo: customer.balance, limite: customer.credit_limit },
          }
        );
      }
      
      await supabase.rpc("wa_update_flow_state", {
        p_conversa_id: conversa.id,
        p_new_state: "saldo",
      });
      return this.buildResponse(
        "Para consultar seu saldo, preciso do seu *CPF*:\n\nDigite apenas os números do CPF.",
        { evento: "SOLICITACAO_CPF" }
      );
    }
    
    if (flowState === "pedido" || intent.intent === "pedido") {
      if (intent.intent === "cardapio") {
        await supabase.rpc("wa_update_flow_state", {
          p_conversa_id: conversa.id,
          p_new_state: "cardapio",
        });
      } else {
        await supabase.rpc("wa_update_flow_state", {
          p_conversa_id: conversa.id,
          p_new_state: "pedido",
        });
        return this.buildResponse(
          "Pedido realizado! 🛒\n\nEnvie os itens desejados ou acesse nosso cardápio:\n\n1️⃣ Ver cardápio\n2️⃣ Digitar pedido livre\n3️⃣ Voltar ao menu",
          { evento: "MENU_PEDIDO" }
        );
      }
    }
    
    if (flowState === "cardapio" || intent.intent === "cardapio") {
      const productList = await fetchProducts();
      await supabase.rpc("wa_update_flow_state", {
        p_conversa_id: conversa.id,
        p_new_state: "pedido_livre",
      });
      return this.buildResponse(
        `📋 *Nosso Cardápio:*\n${productList}\n\nPara fazer um pedido, digite o nome do produto.`,
        { evento: "CARDAPIO_EXIBIDO" }
      );
    }
    
    if (flowState === "pedido_livre" || (flowState === "pedido" && intent.intent === "free_text")) {
      const customer = context.customer_id ? await lookupCustomerByCpf(context.customer_cpf) : await lookupCustomerByPhone(conversa.phone_number);
      
      if (customer) {
        const order = await createOrderFromMessage(customer, rawMessage);
        await supabase.rpc("wa_update_flow_state", {
          p_conversa_id: conversa.id,
          p_new_state: "menu_inicial",
        });
        
        return this.buildResponse(
          `✅ Pedido registrado!\n\nDescrição: ${rawMessage}\nStatus: Aguardando aprovação\n\nVocê receberá uma confirmação em breve!`,
          {
            evento: "NOVO_REGISTRO_SISTEMA",
            cliente: { nome: customer.name, telefone_whatsapp: customer.phone },
            dados_contextuais: {
              categoria_ou_fluxo: "PEDIDO",
              titulo_resumido: "Novo pedido via WhatsApp",
              detalhes_completos: rawMessage,
              metadados_especificos: { order_id: order.id, status: "pendente" },
            },
          }
        );
      }
      
      return this.buildResponse(
        "Para registrar o pedido, preciso identificá-lo.\n\nDigite seu *CPF*:",
        { evento: "PEDIDO_SEM_CLIENTE" }
      );
    }
    
    if (flowState === "pagamento" || intent.intent === "pagamento") {
      if (intent.intent === "valor_input" || /^\d+[.,]?\d*$/.test(rawMessage.replace(/[R$\s]/g, ""))) {
        const amount = intent.data?.amount || parseFloat(rawMessage.replace(/[R$\s]/g, "").replace(",", "."));
        
        if (amount > 0) {
          const customer = await lookupCustomerByPhone(conversa.phone_number);
          
          if (customer) {
            const result = await registerPayment(customer, amount);
            const newBalance = result?.new_balance ?? 0;
            
            await supabase.rpc("wa_update_flow_state", {
              p_conversa_id: conversa.id,
              p_new_state: "menu_inicial",
            });
            
            return this.buildResponse(
              `✅ Pagamento de *${formatCurrency(amount)}* registrado!\n\nNovo saldo: *${formatCurrency(newBalance)}*\n\nObrigado! 🙏`,
              {
                evento: "NOVO_REGISTRO_SISTEMA",
                cliente: { nome: customer.name, telefone_whatsapp: customer.phone },
                dados_contextuais: {
                  categoria_ou_fluxo: "PAGAMENTO",
                  titulo_resumido: "Pagamento via WhatsApp",
                  prioridade_ou_urgencia: "NORMAL",
                  metadados_especificos: { amount, new_balance: newBalance },
                },
              }
            );
          }
        }
      }
      
      await supabase.rpc("wa_update_flow_state", {
        p_conversa_id: conversa.id,
        p_new_state: "pagamento",
      });
      return this.buildResponse(
        "💰 *Registrar Pagamento*\n\nEnvie o valor que deseja pagar.\n\nEx: *150,00*\n\nOu envie *pix* para ver nossas chaves.",
        { evento: "SOLICITACAO_PAGAMENTO" }
      );
    }
    
    if (flowState === "despedida" || intent.intent === "despedida") {
      await supabase.rpc("wa_update_flow_state", {
        p_conversa_id: conversa.id,
        p_new_state: "finalizada",
      });
      return this.buildResponse(
        `Obrigado por nos contatar! 😊\n\n*${storeName}* - Estamos aqui quando precisar!\nAté mais! 👋`,
        { evento: "CONVERSAS_FINALIZADA", action: "end_conversation" }
      );
    }
    
    const menuMsg = this.flowData?.initial_menu?.message || 
      `Olá! Bem-vindo(a) ao *${storeName}*! 👋\n\nComo posso ajudar?\n\n1️⃣ Ver meu saldo e débitos\n2️⃣ Fazer um pedido\n3️⃣ Registrar pagamento\n4️⃣ Ver cardápio/produtos\n5️⃣ Falar com atendente\n\nDigite o número da opção desejada.`;
    
    await supabase.rpc("wa_update_flow_state", {
      p_conversa_id: conversa.id,
      p_new_state: "menu_inicial",
    });
    
    return this.buildResponse(menuMsg, { evento: "FALLBACK_MENU" });
  }

  buildResponse(message, payload = null) {
    return {
      message,
      payload,
      engine_whatsapp: {
        provedor: "evolution",
        sessao_id: this.sessionId,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function getAgentResponse(phoneNumber, messageText, sessionId = "DEFAULT_SESSION") {
  const agent = new WhatsAppAgent(sessionId);
  await randomDelay();
  return agent.processMessage(phoneNumber, messageText);
}
