import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@fiadopro.com";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToRawKey(pem) {
  const lines = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const der = Buffer.from(lines, "base64");
  return der.subarray(der.length - 32);
}

async function createVapidToken(endpoint) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = base64UrlEncode(JSON.stringify({ alg: "ES256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({ aud: audience, exp: now + 43200, sub: vapidEmail }));

  const data = Buffer.from(`${header}.${payload}`);

  const privateKeyRaw = pemToRawKey(`-----BEGIN PRIVATE KEY-----\n${vapidPrivateKey}\n-----END PRIVATE KEY-----`);
  const keyObject = crypto.createPrivateKey({
    key: `-----BEGIN PRIVATE KEY-----\n${vapidPrivateKey}\n-----END PRIVATE KEY-----`,
    format: "pem",
    type: "pkcs8"
  });

  const sign = crypto.createSign("SHA256");
  sign.update(data);
  const sigDER = sign.sign(keyObject);

  const r = sigDER.subarray(0, 32);
  const s = sigDER.subarray(32, 64);

  return `${header}.${payload}.${base64UrlEncode(Buffer.concat([r, s]))}`;
}

function getPublicKeyRaw() {
  const pubKeyHex = base64UrlDecode(vapidPublicKey).toString("hex");
  const x = Buffer.from(pubKeyHex.substring(2, 66), "hex");
  const y = Buffer.from(pubKeyHex.substring(66, 130), "hex");
  return { x, y };
}

async function encryptPayload(payload, userKeyBase64, userAuthBase64) {
  const userKey = base64UrlDecode(userKeyBase64);
  const userAuth = base64UrlDecode(userAuthBase64);

  const salt = crypto.randomBytes(16);
  const localPrivateKey = crypto.createECDH("prime256v1");
  localPrivateKey.generateKeys();
  const localPublicKey = localPrivateKey.getPublicKey();

  const sharedSecret = localPrivateKey.computeSecret(userKey);

  const authInfo = Buffer.from("WebPush: info\x00");
  const ikmInput = Buffer.concat([authInfo, userKey, localPublicKey]);
  const ikm = crypto.createHmac("sha256", userAuth).update(ikmInput).digest();

  const prk = crypto.createHmac("sha256", ikm).update(salt).digest();

  const contentEncKey = crypto.createHmac("sha256", prk)
    .update(Buffer.concat([Buffer.from("Content-Encoding: aes128gcm\x00"), Buffer.from([0, 0, 0, 1])]))
    .digest();
  const nonce = crypto.createHmac("sha256", prk)
    .update(Buffer.concat([Buffer.from("Content-Encoding: nonce\x00"), Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]))
    .digest();

  const aesKey = contentEncKey.subarray(0, 16);
  const iv = nonce.subarray(0, 12);

  const plaintext = Buffer.from(JSON.stringify(payload));
  const pad = Buffer.alloc(1);
  const padded = Buffer.concat([plaintext, pad]);

  const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const recordHeader = Buffer.concat([
    salt,
    Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    Buffer.from([encrypted.length, 0, 0, 0]),
  ]);

  return Buffer.concat([recordHeader, encrypted, authTag]);
}

async function sendWebPush(subscription, payload) {
  const { endpoint, p256dh, auth } = subscription;

  const vapidToken = await createVapidToken(endpoint);
  const { x, y } = getPublicKeyRaw();
  const publicKeyBuf = Buffer.concat([Buffer.from("04", "hex"), x, y]);

  const encrypted = await encryptPayload(payload, p256dh, auth);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Authorization: `vapid t=${vapidToken}, k=${base64UrlEncode(publicKeyBuf)}`,
    },
    body: encrypted,
  });

  if (!response.ok && response.status !== 201) {
    const text = await response.text();
    const err = new Error(`Push failed: ${response.status} ${text}`);
    err.statusCode = response.status;
    throw err;
  }

  return response;
}

const verifyAuth = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios" });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({ error: "VAPID keys não configuradas" });
  }

  const user = await verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const { title, body: notifBody, url, user_id, tag } = req.body;

    if (!title || !notifBody) {
      return res.status(400).json({ error: "Título e corpo são obrigatórios" });
    }

    let query = supabase.from("push_subscriptions").select("*");
    if (user_id) query = query.eq("user_id", user_id);
    const { data: subscriptions, error: subError } = await query;
    if (subError) throw new Error("Erro ao buscar inscrições: " + subError.message);

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: "Nenhuma inscrição push", sent: 0, failed: 0 });
    }

    const pushPayload = { title, body: notifBody, url: url || "/", tag: tag || "notification" };

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await sendWebPush(sub, pushPayload);
        sent++;
      } catch (error) {
        console.error(`Push failed: ${error.message}`);
        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        failed++;
      }
    }

    await supabase.from("notifications").insert({
      user_id: user_id || user.id,
      title,
      body: notifBody,
      url: url || null,
      tag: tag || "notification",
    });

    return res.status(200).json({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
      message: `Notificação enviada para ${sent} dispositivos`,
    });
  } catch (error) {
    console.error("Erro ao enviar push:", error);
    return res.status(500).json({ error: error.message });
  }
}
