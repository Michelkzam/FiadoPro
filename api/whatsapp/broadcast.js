import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const metaAccessToken = process.env.META_ACCESS_TOKEN;
const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrency = (value) => CURRENCY_FORMATTER.format(value || 0);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const buildCardapioMessage = (products, storeName, customMessage = "") => {
  const today = new Date().toLocaleDateString("pt-BR");
  const greeting = getGreeting();

  const available = products.filter((p) => p.available !== false);
  const grouped = available.reduce((acc, p) => {
    const cat = p.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  let msg = `${greeting}, ${storeName}! 🍽️\n\n`;
  msg += `📋 *Cardápio do Dia - ${today}*\n`;
  msg += "━━━━━━━━━━━━━━━━━━━━━━\n\n";

  for (const [category, items] of Object.entries(grouped)) {
    msg += `*${category}*\n`;
    for (const item of items) {
      const price = formatCurrency(item.price);
      const desc = item.description ? ` - ${item.description}` : "";
      msg += `✅ ${item.name}${desc}\n`;
      msg += `   💰 ${price}\n`;
    }
    msg += "\n";
  }

  msg += "━━━━━━━━━━━━━━━━━━━━━━\n";

  if (customMessage) {
    msg += `\n${customMessage}\n\n`;
  }

  msg += `🛒 *Faça seu pedido:* https://fiado-pro.vercel.app/portal\n`;
  msg += `💬 *Fale conosco:* https://wa.me/5511999999999\n`;
  msg += `\nObrigado pela preferência! 😊`;

  return msg;
};

const sendWhatsAppMessage = async (phoneNumberId, to, message) => {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${metaAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Erro ao enviar mensagem");
  }

  return data;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios" });
  }

  if (!metaAccessToken || !phoneNumberId) {
    return res.status(500).json({ error: "META_ACCESS_TOKEN e META_PHONE_NUMBER_ID são obrigatórios" });
  }

  try {
    const { canal_id, custom_message } = req.body;

    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("available", true)
      .order("category");

    const { data: storeProfile } = await supabase
      .from("store_profiles")
      .select("*")
      .limit(1)
      .single();

    const storeName = storeProfile?.store_name || "Nossa Loja";
    const message = buildCardapioMessage(products || [], storeName, custom_message);

    let query = supabase
      .from("clientes_canal")
      .select("*")
      .eq("status", "ativo");

    if (canal_id) {
      query = query.eq("canal_id", canal_id);
    }

    const { data: recipients } = await query;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: "Nenhum destinatário encontrado" });
    }

    const { data: history } = await supabase
      .from("historico_envios")
      .insert({
        canal_id: canal_id || null,
        tipo_mensagem: "cardapio",
        conteudo: message,
        total_destinatarios: recipients.length,
        status: "enviado",
      })
      .select()
      .single();

    let sucesso = 0;
    let falha = 0;

    for (const recipient of recipients) {
      try {
        await sendWhatsAppMessage(phoneNumberId, recipient.telefone, message);
        sucesso++;
      } catch (error) {
        console.error(`Erro ao enviar para ${recipient.telefone}:`, error.message);
        falha++;
      }

      if (recipients.indexOf(recipient) < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (history) {
      await supabase
        .from("historico_envios")
        .update({ sucesso, falha })
        .eq("id", history.id);
    }

    if (canal_id) {
      await supabase
        .from("canais_whatsapp")
        .update({
          ultima_mensagem: message,
          ultima_envio: new Date().toISOString(),
          total_enviados: sucesso,
        })
        .eq("id", canal_id);
    }

    return res.status(200).json({
      success: true,
      total: recipients.length,
      sucesso,
      falha,
      message: `Cardápio enviado para ${sucesso} destinatários`,
    });
  } catch (error) {
    console.error("Erro no broadcast:", error);
    return res.status(500).json({ error: error.message });
  }
}
