import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SESSION_ID = "DEFAULT_SESSION";

async function getSession() {
  const { data } = await supabase.rpc("wa_get_session", { p_session_id: SESSION_ID });
  return data;
}

async function updateSession(params) {
  const { data, error } = await supabase.rpc("wa_upsert_session", {
    p_session_id: SESSION_ID,
    ...params,
  });
  if (error) throw error;
  return data;
}

async function getFlow() {
  const { data } = await supabase.from("wa_fluxos").select("*").eq("active", true).order("priority", { ascending: false }).limit(1);
  return data?.[0]?.flow_data || null;
}

async function getStoreName() {
  const { data } = await supabase.from("store_profiles").select("store_name").limit(1);
  return data?.[0]?.store_name || "FiadoPro";
}

async function findCustomerByCpf(cpf) {
  const { data } = await supabase.from("customers").select("*").eq("cpf", cpf).single();
  return data || null;
}

async function findCustomerByPhone(phone) {
  const clean = phone.replace(/\D/g, "");
  const { data } = await supabase.from("customers").select("*").or(`phone.eq.${clean},phone.eq.55${clean}`).limit(1).single();
  return data || null;
}

async function getProducts() {
  const { data } = await supabase.from("products").select("name, price, category").eq("available", true).order("category");
  if (!data || data.length === 0) return "Nenhum produto disponivel.";
  
  const grouped = {};
  data.forEach(p => {
    const cat = p.category || "Outros";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });
  
  let list = "";
  for (const [cat, items] of Object.entries(grouped)) {
    list += `\n*${cat}*\n`;
    items.forEach(i => { list += `• ${i.name} — R$ ${(i.price || 0).toFixed(2)}\n`; });
  }
  return list;
}

async function createOrder(customer, desc) {
  const { data } = await supabase.from("orders").insert({
    customer_id: customer.id, customer_name: customer.name, customer_phone: customer.phone,
    description: desc, amount: 0, status: "pendente", service_type: "online_entrega",
  }).select().single();
  return data;
}

async function createPayment(customer, amount) {
  const now = new Date();
  const d = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const { data } = await supabase.rpc("register_transaction_atomic", {
    p_customer_id: customer.id, p_customer_name: customer.name, p_type: "pagamento",
    p_amount: amount, p_date: d, p_time: t, p_description: "Pagamento via WhatsApp",
  });
  return data;
}

function makeProtocol() {
  const now = new Date();
  return `FP${now.toISOString().slice(2,10).replace(/-/g,'')}${now.toTimeString().slice(0,8).replace(/:/g,'')}${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;
}

function parseIntent(text) {
  const n = text.trim().toLowerCase();
  if (/^(0|atendente|humano|falar com|ajuda|suporte)/i.test(n)) return { i: "humano" };
  if (/^(1|saldo|divida|devedor|quanto devo|ver saldo)/i.test(n)) return { i: "saldo" };
  if (/^(2|pedido|comprar|quero|encomendar)/i.test(n)) return { i: "pedido" };
  if (/^(3|pagamento|pagar|pix|dinheiro|quitar)/i.test(n)) return { i: "pagamento" };
  if (/^(4|cardapio|cardápio|produtos|menu|lista)/i.test(n)) return { i: "cardapio" };
  if (/^(5|sair|tchau|obrigad|até)/i.test(n)) return { i: "sair" };
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(n) || /^\d{11}$/.test(n)) return { i: "cpf", v: n.replace(/\D/g,"") };
  if (/^r?\$?\s*\d+[.,]?\d*$/.test(n)) return { i: "valor", v: parseFloat(n.replace(/[R$\s]/g,"").replace(",",".")) };
  return { i: "texto", v: n };
}

function msg(evento, transbordo, cliente, dados) {
  return {
    conexao: { provedor: "baileys_qrcode_free", metodo_autenticacao: "QR_CODE", custo_api: 0 },
    evento, transbordo_humano: transbordo,
    cliente: { nome: cliente?.nome || null, telefone_whatsapp: cliente?.tel || null, documento_ou_empresa: cliente?.doc || null },
    dados_contextuais: dados,
  };
}

export async function processMessage(phone, text) {
  const session = await getSession();
  if (!session?.robot_active) return null;
  if (session?.human_mode) return null;
  
  const flow = await getFlow();
  const store = await getStoreName();
  
  const { data: conv } = await supabase.rpc("wa_get_or_create_conversa", { p_phone_number: phone, p_session_id: SESSION_ID });
  if (!conv) return null;
  
  await supabase.rpc("wa_register_message", { p_conversa_id: conv.id, p_phone_number: phone, p_direction: "incoming", p_content: text });
  
  const intent = parseIntent(text);
  const state = conv.flow_state || "menu_inicial";
  let response = null;
  
  // TRANSFERIR HUMANO
  if (intent.i === "humano") {
    const proto = conv.protocol || makeProtocol();
    await supabase.rpc("wa_transfer_to_human", { p_conversa_id: conv.id, p_reason: "Solicitacao do cliente" });
    response = { text: `Ola! Vou transferir para um atendente.\n\nAguarde um momento.\n\nProtocolo: *${proto}*`, payload: msg("TRANSBORDO_HUMANO", true, { tel: phone }, { categoria_ou_modulo: "SUPORTE", prioridade_ou_urgencia: "URGENTE", assunto_resumido: "Transferencia", detalhes_completos: "Solicitacao do cliente", atributos_especificos: { protocol: proto } }) };
  }
  // MENU INICIAL
  else if (state === "menu_inicial" || intent.i === "menu_inicial") {
    const menu = flow?.initial_menu?.message || `Ola! Bem-vindo(a) ao *${store}*!\n\nComo posso ajudar?\n\n1 - Ver meu saldo\n2 - Fazer um pedido\n3 - Registrar pagamento\n4 - Ver cardapio\n5 - Falar com atendente\n\nDigite o numero:`;
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "menu_inicial" });
    response = { text: menu.replace(/\{store_name\}/g, store), payload: msg("MENU_INICIAL", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Menu principal", detalhes_completos: "Exibicao do menu", atributos_especificos: {} }) };
  }
  // SALDO
  else if (state === "saldo" || intent.i === "saldo") {
    if (intent.i === "cpf" || /^\d{11}$/.test(text.replace(/\D/g,""))) {
      const cpf = intent.v || text.replace(/\D/g,"");
      const cust = await findCustomerByCpf(cpf);
      if (!cust) {
        await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "cpf_nao_encontrado" });
        response = { text: "CPF nao encontrado.\n\n1 - Cadastrar-se\n2 - Tentar novamente\n3 - Falar com atendente", payload: msg("CPF_NAO_ENCONTRADO", false, { tel: phone, doc: cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "CPF nao encontrado", detalhes_completos: "Consulta com CPF inexistente", atributos_especificos: {} }) };
      } else {
        await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "saldo_resultado" });
        const s = `R$ ${(cust.balance||0).toFixed(2)}`;
        const l = `R$ ${(cust.credit_limit||0).toFixed(2)}`;
        response = { text: `*Seus dados:*\n\nNome: ${cust.name}\nSaldo: *${s}*\nLimite: *${l}*\n\n1 - Fazer pedido\n2 - Pagamento\n3 - Menu\n4 - Sair`, payload: msg("CONSULTA_SALDO", false, { nome: cust.name, tel: cust.phone, doc: cust.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Consulta saldo", detalhes_completos: `Saldo: ${s}, Limite: ${l}`, atributos_especificos: { saldo: cust.balance, limite: cust.credit_limit } }) };
      }
    } else {
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "saldo" });
      response = { text: "Para consultar saldo, digite seu *CPF*:", payload: msg("SOLICITACAO_CPF", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Solicitacao CPF", detalhes_completos: "Aguardando CPF", atributos_especificos: {} }) };
    }
  }
  // PEDIDO
  else if (state === "pedido" || intent.i === "pedido") {
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "pedido" });
    response = { text: "Pedido!\n\n1 - Ver cardapio\n2 - Digitar pedido\n3 - Menu", payload: msg("MENU_PEDIDO", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Menu pedido", detalhes_completos: "Exibicao menu pedido", atributos_especificos: {} }) };
  }
  // CARDAPIO
  else if (state === "cardapio" || intent.i === "cardapio") {
    const prods = await getProducts();
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "pedido_livre" });
    response = { text: `*Cardapio:*\n${prods}\n\nDigite o item:`, payload: msg("CARDAPIO", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Cardapio", detalhes_completos: "Lista enviada", atributos_especificos: {} }) };
  }
  // PEDIDO LIVRE
  else if (state === "pedido_livre" || (state === "pedido" && intent.i === "texto")) {
    const cust = await findCustomerByPhone(phone);
    if (cust) {
      const order = await createOrder(cust, text);
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "menu_inicial" });
      response = { text: `Pedido registrado!\n\n${text}\nStatus: Aguardando aprovacao`, payload: msg("REGISTRO", false, { nome: cust.name, tel: cust.phone, doc: cust.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Novo pedido", detalhes_completos: text, atributos_especificos: { order_id: order?.id, status: "pendente" } }) };
    } else {
      response = { text: "Digite seu *CPF* para identificar:", payload: msg("PEDIDO_SEM_CPF", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Pedido sem CPF", detalhes_completos: "Aguardando CPF", atributos_especificos: {} }) };
    }
  }
  // PAGAMENTO
  else if (state === "pagamento" || intent.i === "pagamento") {
    if (intent.i === "valor" || /^\d+[.,]?\d*$/.test(text.replace(/[R$\s]/g,""))) {
      const amt = intent.v || parseFloat(text.replace(/[R$\s]/g,"").replace(",","."));
      if (amt > 0) {
        const cust = await findCustomerByPhone(phone);
        if (cust) {
          const res = await createPayment(cust, amt);
          const nb = res?.new_balance ?? 0;
          await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "menu_inicial" });
          response = { text: `Pagamento de *R$ ${amt.toFixed(2)}* registrado!\n\nSaldo: *R$ ${nb.toFixed(2)}*\n\nObrigado!`, payload: msg("REGISTRO", false, { nome: cust.name, tel: cust.phone, doc: cust.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Pagamento", detalhes_completos: `R$ ${amt.toFixed(2)}`, atributos_especificos: { amount: amt, new_balance: nb } }) };
        }
      }
    }
    if (!response) {
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "pagamento" });
      response = { text: "Digite o valor:\n\nEx: *150,00*", payload: msg("SOLICITACAO_VALOR", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Solicitacao valor", detalhes_completos: "Aguardando valor", atributos_especificos: {} }) };
    }
  }
  // SAIR
  else if (state === "despedida" || intent.i === "sair") {
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "finalizada" });
    response = { text: `Obrigado!\n\n*${store}* - Ate mais!`, payload: msg("FINALIZADA", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Despedida", detalhes_completos: "Conversa finalizada", atributos_especificos: {} }) };
  }
  // FALLBACK
  else {
    const menu = flow?.initial_menu?.message || `Ola! Bem-vindo(a) ao *${store}*!\n\n1 - Saldo\n2 - Pedido\n3 - Pagamento\n4 - Cardapio\n5 - Atendente`;
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: conv.id, p_new_state: "menu_inicial" });
    response = { text: menu.replace(/\{store_name\}/g, store), payload: msg("FALLBACK", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Fallback", detalhes_completos: "Msg nao reconhecida", atributos_especificos: {} }) };
  }
  
  if (response) {
    await supabase.rpc("wa_register_message", { p_conversa_id: conv.id, p_phone_number: phone, p_direction: "outgoing", p_content: response.text, p_agent_payload: response.payload || null });
  }
  
  return response;
}
