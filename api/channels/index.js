import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================
// Telegram Bot API - Custo Zero
// =============================================
export async function sendTelegramMessage(botToken, chatId, text, mediaUrl = null) {
  if (mediaUrl) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: mediaUrl,
        caption: text,
        parse_mode: "HTML",
      }),
    });
    return await response.json();
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  return await response.json();
}

// =============================================
// WhatsApp via Evolution API (Self-Hosted, Custo Zero)
// =============================================
export async function sendWhatsAppMessage(instanceId, apiUrl, apiKey, phone, text, mediaUrl = null) {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  if (mediaUrl) {
    const response = await fetch(`${apiUrl}/message/sendMedia/${instanceId}`, {
      method: "POST",
      headers: {
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: formattedPhone,
        mediatype: mediaUrl.match(/\.(mp4|mov|avi)$/i) ? "video" : "image",
        media: mediaUrl,
        caption: text,
      }),
    });
    return await response.json();
  }

  const response = await fetch(`${apiUrl}/message/sendText/${instanceId}`, {
    method: "POST",
    headers: {
      "apikey": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: formattedPhone,
      text,
    }),
  });
  return await response.json();
}

// =============================================
// Instagram via Meta Graph API (Custo Zero)
// =============================================
export async function sendInstagramMessage(accessToken, igUserId, caption, mediaUrl) {
  // Step 1: Create media container
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: mediaUrl,
        caption,
        access_token: accessToken,
      }),
    }
  );
  const container = await containerResponse.json();

  if (container.error) {
    throw new Error(container.error.message);
  }

  // Step 2: Publish
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: accessToken,
      }),
    }
  );
  return await publishResponse.json();
}

// =============================================
// Facebook via Meta Graph API (Custo Zero)
// =============================================
export async function sendFacebookMessage(accessToken, pageId, message, link = null) {
  const payload = {
    message,
    access_token: accessToken,
  };
  if (link) payload.link = link;

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return await response.json();
}

// =============================================
// TikTok Content Posting API (Custo Zero)
// =============================================
export async function sendTikTokVideo(accessToken, openId, videoUrl, title, description) {
  // Step 1: Initialize upload
  const initResponse = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title,
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "URL",
          video_url: videoUrl,
        },
      }),
    }
  );
  return await initResponse.json();
}

// =============================================
// Kwai - Fallback Manual (notifica o usuário)
// =============================================
export async function prepareKwaiPost(videoUrl, caption) {
  return {
    status: "manual_required",
    message: "Kwai requer postagem manual. Link e legenda preparados.",
    video_url: videoUrl,
    caption,
    instructions: [
      "1. Abra o Kwai Creator",
      "2. Clique em 'Criar vídeo'",
      "3. Faça upload do vídeo",
      "4. Cole a legenda abaixo",
      "5. Publique",
    ],
  };
}

export default async function handler(req, res) {
  res.status(200).json({ message: "Channel APIs module loaded" });
}
