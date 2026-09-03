import express from "express";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  "https://yxtqafagbjkcldtikbgo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dHFhZmFnYmprY2xkdGlrYmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMjcwNDIsImV4cCI6MjA1NjgwMzA0Mn0.T_qGLVfFBfEHhY8FnSfOdlGJZVxIkIPBGkQBfBpBfmo"
);

const SESSION_ID = "DEFAULT_SESSION";
const PORT = process.env.PORT || 3001;
const AUTH_DIR = join(__dirname, "baileys_auth");

if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: "silent" });
const delay = (ms) => new Promise(r => setTimeout(r, ms));

let sock = null;
let qrCode = null;
let connectionStatus = "desconectado";

// ============ DATABASE ============

async function getSession() {
  const { data } = await supabase.rpc("wa_get_session", { p_session_id: SESSION_ID });
  return data;
}

async function updateSession(status, extra = {}) {
  await supabase.rpc("wa_upsert_session", { p_session_id: SESSION_ID, p_status: status, ...extra });
  connectionStatus = status;
}

async function getFlow() {
  const { data } = await supabase.from("wa_fluxos").select("*").eq("active", true).order("priority", { ascending: false }).limit(1);
  return data?.[0]?.flow_data || null;
}

async function getStore() {
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
  data.forEach(p => { const cat = p.category || "Outros"; if (!g[cat]) g[cat] = []; g[cat].push(p); });
  let l = "";
  for (const [cat, items] of Object.entries(g)) { l += `\n*${cat}*\n`; items.forEach(i => { l += `• ${i.name} — R$ ${(i.price||0).toFixed(2)}\n`; }); }
  return l;
}

async function createOrder(c, desc) {
  const { data } = await supabase.from("orders").insert({
    customer_id: c.id, customer_name: c.name, customer_phone: c.phone,
    description: desc, amount: 0, status: "pendente", service_type: "online_entrega",
  }).select().single();
  return data;
}

async function createPayment(c, amt) {
  const now = new Date();
  const d = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const { data } = await supabase.rpc("register_transaction_atomic", {
    p_customer_id: c.id, p_customer_name: c.name, p_type: "pagamento",
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

// ============ PROCESS ============

async function processMessage(phone, text) {
  const s = await getSession();
  if (!s?.robot_active || s?.human_mode) return null;

  const fl = await getFlow();
  const st = await getStore();
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
        const sal = `R$ ${(c.balance||0).toFixed(2)}`;
        const lim = `R$ ${(c.credit_limit||0).toFixed(2)}`;
        r = { text: `*Seus dados:*\n\nNome: ${c.name}\nSaldo: *${sal}*\nLimite: *${lim}*\n\n1 - Pedido\n2 - Pagamento\n3 - Menu`, payload: payload("SALDO", false, { nome: c.name, tel: c.phone, doc: c.cpf }, { categoria_ou_modulo: "VENDAS", prioridade_ou_urgencia: "BAIXA", assunto_resumido: "Saldo", detalhes_completos: `Saldo: ${sal}`, atributos_especificos: { saldo: c.balance, limite: c.credit_limit } }) };
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

// ============ WHATSAPP ============

async function connectWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      logger,
      printQRInTerminal: false,
      browser: ["FiadoPro", "Chrome", "4.0.0"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        try {
          qrCode = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        } catch {
          qrCode = qr;
        }
        await updateSession("aguardando_qr");
        console.log("[QR] Acesse http://localhost:3001/qr para escanear");
      }
      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut) {
          await updateSession("desconectado");
          setTimeout(connectWhatsApp, 3000);
        } else {
          qrCode = null;
          await updateSession("desconectado");
          console.log("[DESCONECTADO] Execute novamente para reconectar");
        }
      }
      if (connection === "open") {
        qrCode = null;
        const num = sock.user?.id?.replace(/:.*@/, "@")?.split("@")[0] || "";
        await updateSession("conectado", { p_phone_number: num });
        console.log(`[CONECTADO] Numero: ${num}`);
        console.log("[BOT] Ativo! Respondera automaticamente no WhatsApp");
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        if (msg.key?.fromMe || !msg.message) continue;

        const phone = msg.key.remoteJid?.replace("@s.whatsapp.net", "")?.replace("@g.us", "") || "";
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!phone || !text) continue;

        const full = phone.startsWith("55") ? phone : `55${phone}`;
        console.log(`[RECEBIDO] ${full}: ${text}`);

        // Typing indicator
        try { await sock.sendPresenceUpdate("composing", `${full}@s.whatsapp.net`); } catch {}
        await delay(1500 + Math.random() * 2000);

        const resp = await processMessage(full, text);
        if (resp?.text) {
          try { await sock.sendMessage(`${full}@s.whatsapp.net`, { text: resp.text }); } catch (e) { console.log("[ERRO ENVIO]", e.message); }
          console.log(`[ENVIADO] ${full}`);
        }
      }
    });

  } catch (err) {
    console.error("[ERRO]", err.message);
    setTimeout(connectWhatsApp, 5000);
  }
}

// ============ API ============

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><title>FiadoPro WhatsApp</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0fdf4}
.card{background:white;padding:2rem;border-radius:1rem;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;max-width:400px}
h1{color:#166534;margin-bottom:0.5rem}p{color:#666;margin:0.5rem 0}
.qr{margin:1rem 0}img{width:280px;height:280px;border:2px solid #e5e7eb;border-radius:0.5rem}
.status{padding:0.5rem 1rem;border-radius:2rem;font-weight:600;font-size:0.875rem;display:inline-block;margin:1rem 0}
.on{background:#dcfce7;color:#166534}.off{background:#fee2e2;color:#991b1b}.wait{background:#fef3c7;color:#92400e}
.info{font-size:0.75rem;color:#9ca3af;margin-top:1rem}</style></head>
<body><div class="card">
<h1>FiadoPro WhatsApp</h1><p>Motor de atendimento gratuito</p>
<div id="qr" class="qr"></div><div id="status"></div>
<p class="info">Escaneie o QR Code com o WhatsApp<br>Menu > Dispositivos conectados > Conectar dispositivo</p>
</div>
<script>
async function update(){try{
const s=await fetch("/status").then(r=>r.json());
const el=document.getElementById("status");
if(s.status==="conectado"){el.innerHTML='<div class="status on">Conectado</div>';document.getElementById("qr").innerHTML="";}
else if(s.status==="aguardando_qr"){el.innerHTML='<div class="status wait">Aguardando QR Code</div>';
const q=await fetch("/qr").then(r=>r.json());if(q.qr){document.getElementById("qr").innerHTML='<img src="'+q.qr+'"/>';}
}else{el.innerHTML='<div class="status off">Desconectado</div>';document.getElementById("qr").innerHTML="";}
}catch(e){document.getElementById("status").innerHTML='<div class="status off">Servidor offline</div>';}}
update();setInterval(update,2000);
</script></body></html>`);
});

app.get("/qr", (req, res) => res.json({ qr: qrCode }));
app.get("/status", (req, res) => res.json({ status: connectionStatus }));

app.listen(PORT, () => {
  console.log("");
  console.log("========================================");
  console.log("  FiadoPro WhatsApp Bot (100% Gratuito)");
  console.log("========================================");
  console.log(`  Porta: ${PORT}`);
  console.log(`  Status: http://localhost:${PORT}/status`);
  console.log("");
  connectWhatsApp();
});
