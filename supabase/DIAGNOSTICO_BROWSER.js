// =============================================
// DIAGNOSTICO_BROWSER.js
// Cole este script no Console do navegador (F12 → Console)
// Ele vai testar o INSERT diretamente e mostrar o erro REAL
// =============================================

(async () => {
  console.log("🔍 Iniciando diagnóstico 400 Bad Request...\n");

  // 1. Verificar sessão
  const session = JSON.parse(localStorage.getItem('supabase.auth.token'));
  if (!session?.current_session?.access_token) {
    console.error("❌ Nenhuma sessão encontrada. Faça login primeiro.");
    return;
  }
  const token = session.current_session.access_token;
  console.log("✅ Sessão encontrada, user:", session.current_session.user?.id);

  // 2. Configurações
  const SUPABASE_URL = "https://yxtqafagbjkcldtikbgo.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dHFhZmFnYmprY2xkdGlrYmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDQ3NjksImV4cCI6MjA5NTQ4MDc2OX0.nVfTWT3sc7DhiAbWM7EysWGopwzjqRWoSKec4KJx78E";

  // 3. Testar INSERT com payload mínimo
  const payload = {
    name: "TESTE_DIAGNOSTICO",
    credit_limit: 0,
    balance: 0,
    status: "ativo",
    access_code: "DIAG" + Date.now(),
  };

  console.log("\n📦 Payload enviado:", JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    console.log(`\n📡 Status: ${res.status} ${res.statusText}`);

    const body = await res.text();
    console.log("📄 Response body:", body);

    if (res.ok) {
      console.log("✅ INSERT funcionou!");
      const data = JSON.parse(body);
      const id = Array.isArray(data) ? data[0]?.id : data?.id;
      if (id) {
        // Limpar registro de teste
        await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${id}`, {
          method: 'DELETE',
          headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` },
        });
        console.log("🧹 Registro de teste removido");
      }
    } else {
      console.error("❌ INSERT FALHOU!");
      console.error("💡 Copie a mensagem acima e cole no chat do assistente");
    }

    // 4. Listar colunas da tabela via info schema
    console.log("\n🔍 Verificando schema da tabela customers...");
    const schemaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/?select=*`,
      { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` } }
    );
    console.log("Schema response:", schemaRes.status);

  } catch (err) {
    console.error("❌ Erro de conexão:", err.message);
  }

  console.log("\n📋 Copie TODA a saída acima e cole no chat do assistente");
})();
