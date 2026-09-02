import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const verifyAuth = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  return user;
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios" });
  }

  const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: "VAPID keys não configuradas" });
  }

  const user = await verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Não autorizado. Faça login para continuar." });
  }

  try {
    const { title, body, url, user_id, tag } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Título e corpo são obrigatórios" });
    }

    let query = supabase
      .from("push_subscriptions")
      .select("*");

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      throw new Error("Erro ao buscar inscrições: " + subError.message);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: "Nenhuma inscrição push encontrada",
        sent: 0,
        failed: 0
      });
    }

    const webPush = (await import("web-push")).default;

    webPush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:michel@kzan.com.br",
      vapidPublicKey,
      vapidPrivateKey
    );

    const pushPayload = JSON.stringify({
      title,
      body,
      url: url || "/",
      tag: tag || "notification",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png"
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        await webPush.sendNotification(pushSubscription, pushPayload);
        sent++;
      } catch (error) {
        console.error(`Push failed: ${error.message}`);
        
        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
        
        failed++;
      }
    }

    await supabase.from("notifications").insert({
      user_id: user_id || user.id,
      title,
      body,
      url: url || null,
      tag: tag || "notification"
    });

    return res.status(200).json({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
      message: `Notificação enviada para ${sent} dispositivos`
    });
  } catch (error) {
    console.error("Erro ao enviar push:", error);
    return res.status(500).json({ error: error.message });
  }
}
