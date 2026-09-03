import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SESSION_ID = "DEFAULT_SESSION";

async function getSessionConfig() {
  const { data } = await supabase.rpc("wa_get_session", { p_session_id: SESSION_ID });
  return data;
}

async function createEvolutionInstance(apiUrl, apiKey, instanceName) {
  try {
    const response = await fetch(`${apiUrl}/instance/create`, {
      method: "POST",
      headers: { "apikey": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: {
          url: `${process.env.VERCEL_URL || process.env.APP_URL || "https://fiadopro.vercel.app"}/api/whatsapp/webhook`,
          by_events: false,
          base64: true,
          events: ["messages.upsert", "connection.update", "qrcode.updated"],
        },
      }),
    });
    
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function getEvolutionQRCode(apiUrl, apiKey, instanceName) {
  try {
    const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { "apikey": apiKey },
    });
    
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function getEvolutionStatus(apiUrl, apiKey, instanceName) {
  try {
    const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { "apikey": apiKey },
    });
    
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  try {
    const session = await getSessionConfig();
    
    if (req.method === "GET") {
      const status = session?.status || "desconectado";
      const qrCode = session?.qr_code || null;
      const phoneNumber = session?.phone_number || null;
      const connectedAt = session?.connected_at || null;
      const robotActive = session?.robot_active ?? true;
      const humanMode = session?.human_mode ?? false;
      
      return res.status(200).json({
        ok: true,
        status,
        qr_code: qrCode,
        phone_number: phoneNumber,
        connected_at: connectedAt,
        robot_active: robotActive,
        human_mode: humanMode,
        provider: "baileys_qrcode_free",
      });
    }
    
    if (req.method === "POST") {
      const { action, api_url, api_key, instance_id } = req.body;
      
      if (action === "connect") {
        const apiUrl = api_url || session?.api_url;
        const apiKey = api_key || session?.api_key;
        const instanceName = instance_id || session?.instance_id || "fiadopro";
        
        if (!apiUrl || !apiKey) {
          return res.status(400).json({ ok: false, error: "API URL e API Key sao obrigatorios" });
        }
        
        await supabase.rpc("wa_upsert_session", {
          p_session_id: SESSION_ID,
          p_status: "aguardando_qr",
          p_api_url: apiUrl,
          p_api_key: apiKey,
          p_instance_id: instanceName,
          p_provider: "evolution",
        });
        
        const createResult = await createEvolutionInstance(apiUrl, apiKey, instanceName);
        
        if (!createResult.ok) {
          console.log("[Evolution] Instancia pode ja existir, tentando obter QR...");
        }
        
        const qrResult = await getEvolutionQRCode(apiUrl, apiKey, instanceName);
        
        if (qrResult.ok && qrResult.data?.base64) {
          await supabase.rpc("wa_upsert_session", {
            p_session_id: SESSION_ID,
            p_status: "aguardando_qr",
            p_qr_code: qrResult.data.base64,
          });
          
          return res.status(200).json({
            ok: true,
            status: "aguardando_qr",
            qr_code: qrResult.data.base64,
          });
        }
        
        return res.status(200).json({
          ok: true,
          status: "aguardando_qr",
          qr_code: null,
          message: "Instancia criada. Aguardando QR Code...",
        });
      }
      
      if (action === "disconnect") {
        await supabase.rpc("wa_upsert_session", {
          p_session_id: SESSION_ID,
          p_status: "desconectado",
          p_qr_code: null,
        });
        
        return res.status(200).json({ ok: true, status: "desconectado" });
      }
      
      if (action === "toggle_robot") {
        const currentRobot = session?.robot_active ?? true;
        await supabase.rpc("wa_upsert_session", {
          p_session_id: SESSION_ID,
          p_robot_active: !currentRobot,
        });
        
        return res.status(200).json({ ok: true, robot_active: !currentRobot });
      }
      
      if (action === "toggle_human") {
        const currentHuman = session?.human_mode ?? false;
        await supabase.rpc("wa_upsert_session", {
          p_session_id: SESSION_ID,
          p_human_mode: !currentHuman,
        });
        
        return res.status(200).json({ ok: true, human_mode: !currentHuman });
      }
      
      return res.status(400).json({ ok: false, error: "Acao invalida" });
    }
    
  } catch (error) {
    console.error("[WhatsApp Connect Error]", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
