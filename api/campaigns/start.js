import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { campanha_id } = req.body;

    if (!campanha_id) {
      return res.status(400).json({ error: "campanha_id is required" });
    }

    // Get campaign details
    const { data: campanha, error: campanhaError } = await supabase
      .from("campanhas")
      .select("*")
      .eq("id", campanha_id)
      .single();

    if (campanhaError || !campanha) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }

    if (campanha.status !== "rascunho" && campanha.status !== "agendada") {
      return res.status(400).json({ error: `Campanha com status "${campanha.status}" não pode ser iniciada` });
    }

    // Get connections for target channels
    const { data: conexoes, error: connError } = await supabase
      .from("conexoes_redes")
      .select("*")
      .in("rede_social", campanhas.canais)
      .eq("status", "ativo");

    if (connError) throw connError;

    if (!conexoes || conexoes.length === 0) {
      return res.status(400).json({ error: "Nenhuma conexão ativa para os canais selecionados" });
    }

    // Get media
    const { data: midias } = await supabase
      .from("campanha_midia")
      .select("*")
      .eq("campanha_id", campanha_id)
      .order("ordem");

    const firstMedia = midias?.[0] || null;

    // Get target recipients
    let recipients = [];

    if (campanha.publico_alvo === "canal_especifico" && campanha.canal_whatsapp_id) {
      const { data: canalClients } = await supabase
        .from("clientes_canal")
        .select("*")
        .eq("canal_id", campanha.canal_whatsapp_id)
        .eq("status", "ativo");
      recipients = canalClients || [];
    } else if (campanha.publico_alvo === "todos" || campanha.publico_alvo === "ativo") {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("status", "ativo");
      recipients = customers || [];
    } else if (campanha.publico_alvo === "fiado") {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("status", "ativo")
        .gt("balance", 0);
      recipients = customers || [];
    } else if (campanha.publico_alvo === "inadimplente") {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("status", "ativo")
        .gt("balance", 0);
      recipients = customers || [];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: "Nenhum destinatário encontrado para o público selecionado" });
    }

    // Create queue items
    const queueItems = [];
    for (const conexao of conexoes) {
      for (const recipient of recipients) {
        const telefone = recipient.phone || recipient.telefone;
        const telegramId = recipient.telegram_chat_id;

        // Skip if no valid identifier for the channel
        if (conexao.rede_social === "whatsapp" && !telefone) continue;
        if (conexao.rede_social === "telegram" && !telegramId) continue;

        queueItems.push({
          campanha_id,
          conexao_id: conexao.id,
          rede_social: conexao.rede_social,
          destinatario_id: telegramId || recipient.id || recipient.cliente_id,
          destinatario_nome: recipient.name || recipient.nome,
          destinatario_telefone: telefone,
          status: "pendente",
          agendado_para: campanha.agendamento_tipo === "agora"
            ? new Date().toISOString()
            : campanha.agendado_para,
          proximo_envio_em: campanha.agendamento_tipo === "agora"
            ? new Date().toISOString()
            : campanha.agendado_para,
          legenda: campanha.legenda,
          midia_url: firstMedia?.url || null,
        });
      }
    }

    if (queueItems.length === 0) {
      return res.status(400).json({ error: "Nenhum item válido para enviar (verifique telefones/IDs)" });
    }

    // Batch insert queue items
    const { error: insertError } = await supabase
      .from("fila_envio")
      .insert(queueItems);

    if (insertError) throw insertError;

    // Update campaign status
    await supabase
      .from("campanhas")
      .update({
        status: campanha.agendamento_tipo === "agora" ? "em_progresso" : "agendada",
        total_enviados: queueItems.length,
      })
      .eq("id", campanha_id);

    return res.status(200).json({
      success: true,
      queue_items_created: queueItems.length,
      channels: conexoes.map((c) => c.rede_social),
      message: `${queueItems.length} itens adicionados à fila de envio`,
    });
  } catch (error) {
    console.error("Start campaign error:", error);
    return res.status(500).json({ error: error.message });
  }
}
