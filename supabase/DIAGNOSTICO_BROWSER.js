// =============================================
// DIAGNOSTICO - Cole este código no Console do navegador (F12 → Console)
// Execute DEPOIS de logar no sistema
// =============================================

(async () => {
  console.log("=== INICIO DIAGNOSTICO SUPABASE ===");

  // 1. Pegar a sessão atual
  const SUPABASE_URL = "https://yxtqafagbjkcldtikbgo.supabase.co";
  
  // Pegar a key do localStorage ou do objeto global
  let anonKey = "";
  try {
    // Tenta pegar de diferentes fontes
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const val = JSON.parse(localStorage.getItem(k));
        if (val?.current?.access_token) {
          anonKey = val.current.access_token;
          console.log("Token encontrado no localStorage");
          break;
        }
      }
    }
  } catch(e) {}

  // Se não encontrou no localStorage, tenta pegar do window
  if (!anonKey) {
    console.log("Procurando token em outras fontes...");
    // O token deve estar no Supabase client que já está na página
  }

  console.log("URL:", SUPABASE_URL);
  console.log("Token encontrado:", anonKey ? "SIM (" + anonKey.substring(0, 20) + "...)" : "NAO");

  // 2. Testar INSERT diretamente via fetch
  console.log("\n--- Teste 1: INSERT com campos minimos ---");
  try {
    const payload = {
      name: "TESTE_CONSOLE_DELETE_ME",
      status: "ativo",
      balance: 0,
      credit_limit: 0,
      access_code: "TEST123"
    };
    console.log("Payload:", JSON.stringify(payload));

    // Usar a sessão do Supabase que já está na página
    const supabaseClient = window.__supabase || null;
    
    // Tentar via fetch direto
    const response = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey || document.cookie,
        "Authorization": `Bearer ${anonKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(payload)
    });

    console.log("Status:", response.status, response.statusText);
    const body = await response.text();
    console.log("Response body:", body);

    if (response.ok) {
      const data = JSON.parse(body);
      if (data.length > 0) {
        console.log("✅ INSERT OK! ID:", data[0].id);
        // Deletar o registro de teste
        const delResp = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${data[0].id}`, {
          method: "DELETE",
          headers: {
            "apikey": anonKey || "",
            "Authorization": `Bearer ${anonKey}`
          }
        });
        console.log("DELETE status:", delResp.status);
      }
    } else {
      console.log("❌ INSERT FALHOU!");
    }
  } catch(e) {
    console.error("Erro no teste 1:", e);
  }

  // 3. Testar INSERT com todos os campos (como o formulário envia)
  console.log("\n--- Teste 2: INSERT com todos os campos do formulario ---");
  try {
    const fullPayload = {
      name: "TESTE_CONSOLE_DELETE_ME_2",
      cpf: "000.000.000-00",
      phone: "(00) 00000-0000",
      email: "teste@teste.com",
      cep: "00000-000",
      address: "Rua Teste",
      neighborhood: "Bairro",
      city: "Cidade",
      state: "SP",
      credit_limit: 0,
      balance: 0,
      status: "ativo",
      access_code: "TEST456"
    };
    console.log("Payload:", JSON.stringify(fullPayload));

    const response = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey || "",
        "Authorization": `Bearer ${anonKey}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(fullPayload)
    });

    console.log("Status:", response.status, response.statusText);
    const body = await response.text();
    console.log("Response body:", body);

    if (response.ok) {
      const data = JSON.parse(body);
      if (data.length > 0) {
        console.log("✅ INSERT OK! ID:", data[0].id);
        const delResp = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${data[0].id}`, {
          method: "DELETE",
          headers: {
            "apikey": anonKey || "",
            "Authorization": `Bearer ${anonKey}`
          }
        });
        console.log("DELETE status:", delResp.status);
      }
    } else {
      console.log("❌ INSERT FALHOU!");
    }
  } catch(e) {
    console.error("Erro no teste 2:", e);
  }

  // 4. Listar colunas da tabela (se tiver acesso ao schema)
  console.log("\n--- Teste 3: Listar estrutura da tabela via RPC ---");
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_table_columns?table_name_param=customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey || "",
        "Authorization": `Bearer ${anonKey}`
      }
    });
    console.log("Status:", response.status);
    const body = await response.text();
    console.log("Response:", body);
  } catch(e) {
    console.log("RPC não disponível (esperado)");
  }

  console.log("\n=== FIM DIAGNOSTICO ===");
  console.log("Copie TODO o output acima e envie para mim.");
})();
