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

// =============================================
// Delay Configuration (Antiban)
// =============================================
const DEFAULT_DELAYS = {
  whatsapp: { min: 15000, max: 30000 },
  telegram: { min: 1000, max: 2000 },
  instagram: { min: 5000, max: 10000 },
  facebook: { min: 3000, max: 5000 },
  tiktok: { min: 10000, max: 20000 },
  kwai: { min: 0, max: 0 },
};

function getDelay(redeSocial, minOverride, maxOverride) {
  const range = DEFAULT_DELAYS[redeSocial] || { min: 5000, max: 10000 };
  const min = minOverride || range.min;
  const max = maxOverride || range.max;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// =============================================
// Caption Builder (Variable Substitution)
// =============================================
function buildCaption(item) {
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

// =============================================
// Channel Processors
// =============================================
async function processWhatsApp(item, conexao) {
  if (!conexao.whatsapp_instance_id || !conexao.whatsapp_api_url || !conexao.whatsapp_api_key) {
    throw new Error("WhatsApp: credenciais incompletas (instance_id, api_url, api_key)");
  }
  if (!item.destinatario_telefone) {
    throw new Error("WhatsApp: destinatário sem telefone");
  }

  const result = await sendWhatsAppMessage(
    conexao.whatsapp_instance_id,
    conexao.whatsapp_api_url,
    conexao.whatsapp_api_key,
    item.destinatario_telefone,
    buildCaption(item),
    getMediaUrl(item)
  );

  if (result.error || result.key?.fromMe === undefined) {
    throw new Error(result.error?.message || result.message || "Erro ao enviar WhatsApp");
  }

  return result;
}

async function processTelegram(item, conexao) {
  if (!conexao.telegram_bot_token) {
    throw new Error("Telegram: bot_token não configurado");
  }
  if (!item.destinatario_id) {
    throw new Error("Telegram: destinatário sem chat_id");
  }

  const result = await sendTelegramMessage(
    conexao.telegram_bot_token,
    item.destinatario_id,
    buildCaption(item),
    getMediaUrl(item)
  );

  if (!result.ok) {
    throw new Error(result.description || "Erro ao enviar Telegram");
  }

  return result;
}

async function processInstagram(item, conexao) {
  if (!conexao.meta_access_token || !conexao.meta_ig_user_id) {
    throw new Error("Instagram: credenciais incompletas (access_token, ig_user_id)");
  }
  if (!getMediaUrl(item)) {
    throw new Error("Instagram: requer mídia (imagem ou vídeo)");
  }

  return sendInstagramMessage(
    conexao.meta_access_token,
    conexao.meta_ig_user_id,
    buildCaption(item),
    getMediaUrl(item)
  );
}

async function processFacebook(item, conexao) {
  if (!conexao.meta_access_token || !conexao.meta_page_id) {
    throw new Error("Facebook: credenciais incompletas (access_token, page_id)");
  }

  return sendFacebookMessage(
    conexao.meta_access_token,
    conexao.meta_page_id,
    buildCaption(item),
    getMediaUrl(item)
  );
}

async function processTikTok(item, conexao) {
  if (!conexao.tiktok_access_token || !conexao.tiktok_open_id) {
    throw new Error("TikTok: credenciais incompletas");
  }
  if (!getMediaUrl(item)) {
    throw new Error("TikTok: requer vídeo");
  }

  return sendTikTokVideo(
    conexao.tiktok_access_token,
    conexao.tiktok_open_id,
    getMediaUrl(item),
    item.campanha_nome || "Video",
    buildCaption(item)
  );
}

async function processKwai(item) {
  return prepareKwaiPost(getMediaUrl(item), buildCaption(item));
}

const processors = {
  whatsapp: processWhatsApp,
  telegram: processTelegram,
  instagram: processInstagram,
  facebook: processFacebook,
  tiktok: processTikTok,
  kwai: processKwai,
};

// =============================================
// Update Campaign Stats
// =============================================
async function incrementStat(campanhaId, stat) {
  try {
    if (stat === "total_sucesso") {
      await supabase.rpc("increment_campaign_stat", { p_campanha_id: campanhaId, p_stat: "total_sucesso" });
    } else if (stat === "total_falha") {
      await supabase.rpc("increment_campaign_stat", { p_campanha_id: campanhaId, p_stat: "total_falha" });
    }
  } catch {
    // Fallback: direct update
    const field = stat;
    await supabase
      .from("campanhas")
      .update({ [field]: supabase.rpc ? undefined : 0 })
      .eq("id", campanhaId);
  }
}

// =============================================
// Main Worker Handler
// =============================================
export default async function handler(req, res) {
  // Allow both GET (from cron) and POST (manual trigger)
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Fetch pending items with related data
    const { data: items, error: fetchError } = await supabase
      .from("fila_envio")
      .select("*")
      .in("status", ["pendente", "retry"])
      .lte("agendado_para", new Date().toISOString())
      .order("agendado_para", { ascending: true })
      .limit(20);

    if (fetchError) throw fetchError;

    if (!items || items.length === 0) {
      return res.status(200).json({ processed: 0, message: "Fila vazia" });
    }

    // Fetch related data for each item
    const enrichedItems = [];
    for (const item of items) {
      const [campanhaResult, conexaoResult] = await Promise.all([
        supabase.from("campanhas").select("*").eq("id", item.campanha_id).single(),
        supabase.from("conexoes_redes").select("*").eq("id", item.conexao_id).single(),
      ]);

      if (campanhaResult.data && conexaoResult.data) {
        enrichedItems.push({
          ...item,
          campanha: campanhaResult.data,
          conexao: conexaoResult.data,
        });
      }
    }

    if (enrichedItems.length === 0) {
      return res.status(200).json({ processed: 0, message: "Nenhum item válido encontrado" });
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const item of enrichedItems) {
      // Skip cancelled/paused campaigns
      if (["cancelada", "pausada"].includes(item.campanha?.status)) {
        await supabase
          .from("fila_envio")
          .update({ status: "cancelado", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        continue;
      }

      // Mark as sending
      await supabase
        .from("fila_envio")
        .update({
          status: "enviando",
          tentativas: (item.tentativas || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      try {
        const processor = processors[item.rede_social];
        if (!processor) throw new Error(`Canal não suportado: ${item.rede_social}`);

        const result = await processor(item, item.conexao);

        // Mark as success
        await supabase
          .from("fila_envio")
          .update({
            status: "sucesso",
            enviado_em: new Date().toISOString(),
            resultado: result,
            external_id: result?.key?.id || result?.message_id || result?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        await incrementStat(item.campanha_id, "total_sucesso");
        succeeded++;

        // Apply delay (WhatsApp antiban)
        const delay = item.rede_social === "whatsapp"
          ? getDelay("whatsapp", (item.campanha?.whatsapp_delay_segundos || 15) * 1000, (item.campanha?.whatsapp_delay_max_segundos || 30) * 1000)
          : getDelay(item.rede_social);

        if (delay > 0) await sleep(delay);

      } catch (error) {
        const newAttempts = (item.tentativas || 0) + 1;
        const maxAttempts = item.max_tentativas || 3;
        const newStatus = newAttempts >= maxAttempts ? "falha" : "retry";
        const retryDelay = newStatus === "retry" ? getDelay(item.rede_social) * newAttempts : 0;

        await supabase
          .from("fila_envio")
          .update({
            status: newStatus,
            tentativas: newAttempts,
            erro_mensagem: error.message?.slice(0, 500),
            proximo_envio_em: newStatus === "retry"
              ? new Date(Date.now() + retryDelay).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (newStatus === "falha") {
          await incrementStat(item.campanha_id, "total_falha");
        }

        failed++;
      }

      processed++;
    }

    return res.status(200).json({
      processed,
      succeeded,
      failed,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Worker error:", error);
    return res.status(500).json({ error: error.message });
  }
}
