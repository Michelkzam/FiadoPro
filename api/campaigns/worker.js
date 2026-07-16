import { createClient } from "@supabase/supabase-js";
import {
  sendTelegramMessage,
  sendWhatsAppMessage,
  sendInstagramMessage,
  sendFacebookMessage,
  sendTikTokVideo,
  prepareKwaiPost,
} from "../channels/index.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const REDISPATCH_DELAY = {
  whatsapp: { min: 15000, max: 30000 },
  telegram: { min: 1000, max: 2000 },
  instagram: { min: 5000, max: 10000 },
  facebook: { min: 3000, max: 5000 },
  tiktok: { min: 10000, max: 20000 },
  kwai: { min: 0, max: 0 },
};

function getDelay(redeSocial, minOverride, maxOverride) {
  const range = REDISPATCH_DELAY[redeSocial] || { min: 5000, max: 10000 };
  const min = minOverride || range.min;
  const max = maxOverride || range.max;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function processWhatsApp(item, conexao) {
  return sendWhatsAppMessage(
    conexao.whatsapp_instance_id,
    conexao.whatsapp_api_url,
    conexao.whatsapp_api_key,
    item.destinatario_telefone,
    get CampaignCaption(item),
    getMediaUrl(item)
  );
}

async function processTelegram(item, conexao) {
  return sendTelegramMessage(
    conexao.telegram_bot_token,
    item.destinatario_id,
    getCampaignCaption(item),
    getMediaUrl(item)
  );
}

async function processInstagram(item, conexao) {
  if (!getMediaUrl(item)) {
    throw new Error("Instagram requer mídia (imagem ou vídeo)");
  }
  return sendInstagramMessage(
    conexao.meta_access_token,
    conexao.meta_ig_user_id,
    getCampaignCaption(item),
    getMediaUrl(item)
  );
}

async function processFacebook(item, conexao) {
  return sendFacebookMessage(
    conexao.meta_access_token,
    conexao.meta_page_id,
    getCampaignCaption(item),
    getMediaUrl(item)
  );
}

async function processTikTok(item, conexao) {
  if (!getMediaUrl(item)) {
    throw new Error("TikTok requer vídeo");
  }
  return sendTikTokVideo(
    conexao.tiktok_access_token,
    conexao.tiktok_open_id,
    getMediaUrl(item),
    item.campanha_nome || "Video",
    getCampaignCaption(item)
  );
}

async function processKwai(item) {
  return prepareKwaiPost(getMediaUrl(item), getCampaignCaption(item));
}

function getCampaignCaption(item) {
  let caption = item.legenda || "";
  if (item.destinatario_nome) {
    caption = caption.replace(/{nome}/gi, item.destinatario_nome);
  }
  if (item.destinatario_telefone) {
    caption = caption.replace(/{telefone}/gi, item.destinatario_telefone);
  }
  return caption;
}

function getMediaUrl(item) {
  return item.midia_url || null;
}

const processors = {
  whatsapp: processWhatsApp,
  telegram: processTelegram,
  instagram: processInstagram,
  facebook: processFacebook,
  tiktok: processTikTok,
  kwai: processKwai,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get pending items ready to send
    const { data: items, error: fetchError } = await supabase
      .from("fila_envio")
      .select(`
        *,
        campanhas!inner (nome, legenda, canais, status as campanha_status),
        conexoes_redes!inner (*)
      `)
      .in("status", ["pendente", "retry"])
      .lte("agendado_para", new Date().toISOString())
      .order("agendado_para", { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;

    if (!items || items.length === 0) {
      return res.status(200).json({ processed: 0, message: "No items to process" });
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      // Skip if campaign is cancelled/paused
      if (["cancelada", "pausada"].includes(item.campanhas?.campanha_status)) {
        await supabase
          .from("fila_envio")
          .update({ status: "cancelado", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        continue;
      }

      // Mark as sending
      await supabase
        .from("fila_envio")
        .update({ status: "enviando", tentativas: item.tentativas + 1 })
        .eq("id", item.id);

      try {
        const processor = processors[item.rede_social];
        if (!processor) throw new Error(`Canal não suportado: ${item.rede_social}`);

        const result = await processor(item, item.conexoes_redes);

        // Mark as success
        await supabase
          .from("fila_envio")
          .update({
            status: "sucesso",
            enviado_em: new Date().toISOString(),
            resultado: result,
            external_id: result?.message_id || result?.id || null,
          })
          .eq("id", item.id);

        // Update campaign stats
        await supabase.rpc("increment_campaign_stat", {
          p_campanha_id: item.campanha_id,
          p_stat: "total_sucesso",
        }).catch(() => {});

        succeeded++;

        // WhatsApp delay between messages
        if (item.rede_social === "whatsapp") {
          const delay = getDelay("whatsapp", item.campanha?.whatsapp_delay_segundos * 1000, item.campanha?.whatsapp_delay_max_segundos * 1000);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          await new Promise((r) => setTimeout(r, getDelay(item.rede_social)));
        }
      } catch (error) {
        const newAttempts = item.tentativas + 1;
        const newStatus = newAttempts >= item.max_tentativas ? "falha" : "retry";
        const retryDelay = newStatus === "retry" ? getDelay(item.rede_social) * newAttempts : 0;

        await supabase
          .from("fila_envio")
          .update({
            status: newStatus,
            tentativas: newAttempts,
            erro_mensagem: error.message,
            proximo_envio_em: newStatus === "retry"
              ? new Date(Date.now() + retryDelay).toISOString()
              : null,
          })
          .eq("id", item.id);

        if (newStatus === "falha") {
          await supabase.rpc("increment_campaign_stat", {
            p_campanha_id: item.campanha_id,
            p_stat: "total_falha",
          }).catch(() => {});
        }

        failed++;
      }

      processed++;
    }

    return res.status(200).json({
      processed,
      succeeded,
      failed,
      message: `Processed ${processed} items`,
    });
  } catch (error) {
    console.error("Worker error:", error);
    return res.status(500).json({ error: error.message });
  }
}
