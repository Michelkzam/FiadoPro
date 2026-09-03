import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

const SESSION_ID = "DEFAULT_SESSION";
const MIN_DELAY = 2000;
const MAX_DELAY = 5000;
const TYPING_DELAY = 1500;

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = () => delay(MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY));

async function getSession() {
  const { data } = await supabase.rpc("wa_get_session", { p_session_id: SESSION_ID });
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

async function findCpf(cpf) {
  const { data } = await supabase.from("customers").select("*").eq("cpf", cpf).single();
  return data;
}

async function findPhone(phone) {
  const c = phone.replace(/\D/g, "");
  const { data } = await supabase.from("customers").select("*").or(`phone.eq.${c},phone.eq.55${c}`).limit(1).single();
  return data;
}

async function getProducts() {
  const { data } = await supabase.from("products").select("name, price, category").eq("available", true).order("category");
  if (!data?.length) return "Nenhum produto.";
  const g = {};
  data.forEach(p => { const c = p.category || "Outros"; if (!g[c]) g[c] = []; g[c].push(p); });
  let l = "";
  for (const [c, i] of Object.entries(g)) { l += `\n*${c}*\n`; i.forEach(x => { l += `• ${x.name} — R$ ${(x.price||0).toFixed(2)}\n`; }); }
  return l;
}

async function createOrder(cust, desc) {
  const { data } = await supabase.from("orders").insert({
    customer_id: cust.id, customer_name: cust.name, customer_phone: cust.phone,
    description: desc, amount: 0, status: "pendente", service_type: "online_entrega",
  }).select().single();
  return data;
}

async function createPayment(cust, amt) {
  const now = new Date();
  const d = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const { data } = await supabase.rpc("register_transaction_atomic", {
    p_customer_id: cust.id, p_customer_name: cust.name, p_type: "pagamento",
    p_amount: amt, p_date: d, p_time: t, p_description: "Pagamento via WhatsApp",
  });
  return data;
}

function proto() {
  const n = new Date();
  return `FP${n.toISOString().slice(2,10).replace(/-/g,'')}${n.toTimeString().slice(0,8).replace(/:/g,'')}${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;
}

function intent(t) {
  const n = t.trim().toLowerCase();
  if (/^(0|atendente|humano|ajuda)/i.test(n)) return { i: "humano" };
  if (/^(1|saldo|divida|devedor)/i.test(n)) return { i: "saldo" };
  if (/^(2|pedido|comprar|quero)/i.test(n)) return { i: "pedido" };
  if (/^(3|pagamento|pagar|pix)/i.test(n)) return { i: "pagamento" };
  if (/^(4|cardapio|produtos|menu)/i.test(n)) return { i: "cardapio" };
  if (/^(5|sair|tchau|obrigad)/i.test(n)) return { i: "sair" };
  if (/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(n) || /^\d{11}$/.test(n)) return { i: "cpf", v: n.replace(/\D/g,"") };
  if (/^r?\$?\s*\d+[.,]?\d*$/.test(n)) return { i: "valor", v: parseFloat(n.replace(/[R$\s]/g,"").replace(",",".")) };
  return { i: "texto" };
}

function payload(ev, tb, cl, dc) {
  return { conexao: { provedor: "baileys_qrcode_free", metodo_autenticacao: "QR_CODE", custo_api: 0 }, evento: ev, transbordo_humano: tb, cliente: cl, dados_contextuais: dc };
}

async function process(phone, text) {
  const s = await getSession();
  if (!s?.robot_active || s?.human_mode) return null;
  
  const fl = await getFlow();
  const st = await getStoreName();
  const { data: cv } = await supabase.rpc("wa_get_or_create_conversa", { p_phone_number: phone, p_session_id: SESSION_ID });
  if (!cv) return null;
  
  await supabase.rpc("wa_register_message", { p_conversa_id: cv.id, p_phone_number: phone, p_direction: "incoming", p_content: text });
  
  const it = intent(text);
  const fs = cv.flow_state || "menu_inicial";
  let r = null;
  
  if (it.i === "humano") {
    const p = cv.protocol || proto();
    await supabase.rpc("wa_transfer_to_human", { p_conversa_id: cv.id, p_reason: "Solicitacao" });
    r = { text: `Transferindo para atendente...\n\nProtocolo: *${p}*`, payload: payload("TRANSBORDO", true, { tel: phone }, { categoria_ou_modulo: "SUPORTE", prioridade_ou_urgencia: "URGENTE", assunto_resumido: "Transferencia", detalhes_completos: "Solicitacao", atributos_especificos: { protocol: p } }) };
  }
  else if (fs === "menu_inicial" || it.i === "menu_inicial") {
    const m = fl?.initial_menu?.message || `Ola! Bem-vindo(a) ao *${st}*!\n\n1 - Saldo\n2 - Pedido\n3 - Pagamento\n4 - Cardapio\n5 - Atendente`;
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "menu_inicial" });
    r = { text: m.replace(/\{store_name\}/g, st), payload: payload("MENU", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Menu", detalhes_completos: "Menu", atributos_especificos: {} }) };
  }
  else if (fs === "saldo" || it.i === "saldo") {
    if (it.i === "cpf" || /^\d{11}$/.test(text.replace(/\D/g,""))) {
      const c = await findCpf(it.v || text.replace(/\D/g,""));
      if (!c) {
        await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "cpf_nao_encontrado" });
        r = { text: "CPF nao encontrado.\n\n1 - Cadastrar\n2 - Tentar\n3 - Atendente", payload: payload("CPF_NAO", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "CPF nao encontrado", detalhes_completos: "CPF inexistente", atributos_especificos: {} }) };
      } else {
        await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "saldo_resultado" });
        const s = `R$ ${(c.balance||0).toFixed(2)}`;
        const l = `R$ ${(c.credit_limit||0).toFixed(2)}`;
        r = { text: `*Seus dados:*\n\nNome: ${c.name}\nSaldo: *${s}*\nLimite: *${l}*\n\n1 - Pedido\n2 - Pagamento\n3 - Menu`, payload: payload("SALDO", false, { nome: c.name, tel: c.phone, doc: c.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Saldo", detalhes_completos: `Saldo: ${s}`, atributos_especificos: { saldo: c.balance, limite: c.credit_limit } }) };
      }
    } else {
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "saldo" });
      r = { text: "Digite seu *CPF*:", payload: payload("SOLICITA_CPF", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "CPF", detalhes_completos: "Aguardando CPF", atributos_especificos: {} }) };
    }
  }
  else if (fs === "pedido" || it.i === "pedido") {
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "pedido" });
    r = { text: "1 - Cardapio\n2 - Digitar pedido\n3 - Menu", payload: payload("PEDIDO_MENU", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Pedido", detalhes_completos: "Menu pedido", atributos_especificos: {} }) };
  }
  else if (fs === "cardapio" || it.i === "cardapio") {
    const p = await getProducts();
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "pedido_livre" });
    r = { text: `*Cardapio:*\n${p}\n\nDigite o item:`, payload: payload("CARDAPIO", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Cardapio", detalhes_completos: "Lista", atributos_especificos: {} }) };
  }
  else if (fs === "pedido_livre" || (fs === "pedido" && it.i === "texto")) {
    const c = await findPhone(phone);
    if (c) {
      const o = await createOrder(c, text);
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "menu_inicial" });
      r = { text: `Pedido: ${text}\nStatus: Pendente`, payload: payload("REGISTRO", false, { nome: c.name, tel: c.phone, doc: c.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Pedido", detalhes_completos: text, atributos_especificos: { order_id: o?.id } }) };
    } else {
      r = { text: "Digite seu *CPF*:", payload: payload("PEDIDO_CPF", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "MEDIA", assunto_resumido: "Pedido sem CPF", detalhes_completos: "Aguardando CPF", atributos_especificos: {} }) };
    }
  }
  else if (fs === "pagamento" || it.i === "pagamento") {
    if (it.i === "valor" || /^\d+[.,]?\d*$/.test(text.replace(/[R$\s]/g,""))) {
      const a = it.v || parseFloat(text.replace(/[R$\s]/g,"").replace(",","."));
      if (a > 0) {
        const c = await findPhone(phone);
        if (c) {
          const res = await createPayment(c, a);
          const nb = res?.new_balance ?? 0;
          await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "menu_inicial" });
          r = { text: `Pagamento: *R$ ${a.toFixed(2)}*\nSaldo: *R$ ${nb.toFixed(2)}*`, payload: payload("REGISTRO", false, { nome: c.name, tel: c.phone, doc: c.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Pagamento", detalhes_completos: `R$ ${a.toFixed(2)}`, atributos_especificos: { amount: a, new_balance: nb } }) };
        }
      }
    }
    if (!r) {
      await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "pagamento" });
      r = { text: "Digite o valor:\n\nEx: *150,00*", payload: payload("SOLICITA_VALOR", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Valor", detalhes_completos: "Aguardando", atributos_especificos: {} }) };
    }
  }
  else if (fs === "despedida" || it.i === "sair") {
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "finalizada" });
    r = { text: `Obrigado!\n\n*${st}* - Ate mais!`, payload: payload("FINALIZADA", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Saida", detalhes_completos: "Finalizada", atributos_especificos: {} }) };
  }
  else {
    const m = fl?.initial_menu?.message || `Ola! Bem-vindo(a) ao *${st}*!\n\n1 - Saldo\n2 - Pedido\n3 - Pagamento\n4 - Cardapio\n5 - Atendente`;
    await supabase.rpc("wa_update_flow_state", { p_conversa_id: cv.id, p_new_state: "menu_inicial" });
    r = { text: m.replace(/\{store_name\}/g, st), payload: payload("FALLBACK", false, { tel: phone }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Fallback", detalhes_completos: "Nao entendi", atributos_especificos: {} }) };
  }
  
  if (r) {
    await supabase.rpc("wa_register_message", { p_conversa_id: cv.id, p_phone_number: phone, p_direction: "outgoing", p_content: r.text, p_agent_payload: r.payload || null });
  }
  
  return r;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const body = req.body;
    
    if (body.event === "messages.upsert") {
      const msg = body.data;
      if (!msg || msg.key?.fromMe) return res.status(200).json({ ok: true });
      
      const phone = msg.key?.remoteJid?.replace("@s.whatsapp.net", "")?.replace("@g.us", "") || "";
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
      
      if (!phone || !text) return res.status(200).json({ ok: true });
      
      const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
      
      // Delay humanizado
      await delay(1500 + Math.random() * 2000);
      
      const response = await process(fullPhone, text);
      
      return res.status(200).json({ ok: true, response: response?.text });
    }
    
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[Webhook Error]", error);
    return res.status(500).json({ error: error.message });
  }
}
