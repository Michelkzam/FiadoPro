# 📋 Guia de Verificação Pós-Migration

## ✅ Passo 1: Verificar Anon Key (IMPORTANTE)

A `VITE_SUPABASE_ANON_KEY` no `.env` ainda é do projeto antigo. Você precisa obter a chave correta:

1. Acesse: `https://supabase.com/dashboard/project/yxtqafagbjkcldtikbgo`
2. Vá em **Settings** → **API**
3. Copie a **anon public** key
4. Atualize no arquivo `.env`:
   ```
   VITE_SUPABASE_ANON_KEY=sua_nova_chave_aqui
   ```

---

## ✅ Passo 2: Executar Verificação

1. Acesse o SQL Editor do Supabase:
   `https://supabase.com/dashboard/project/yxtqafagbjkcldtikbgo/sql/new`

2. Copie e cole o conteúdo de `supabase/VERIFY_MIGRATION.sql`

3. Clique em **Run**

4. Verifique os resultados:

| Categoria | Esperado | Status |
|-----------|----------|--------|
| Tabelas | 22 | ✅ ou ❌ |
| Funções/RPCs | 16+ | ✅ ou ❌ |
| Triggers | 7 | ✅ ou ❌ |
| RLS Habilitado | 22 tabelas | ✅ ou ❌ |
| Políticas RLS | 22+ | ✅ ou ❌ |
| Índices | 30+ | ✅ ou ❌ |

---

## ✅ Passo 3: Testar Conexão

Execute o comando abaixo para verificar se o frontend consegue conectar:

```bash
npm run dev
```

Acesse `http://localhost:5173` e faça login.

---

## 🔧 Troubleshooting

### Se alguma tabela estiver faltando:
- Verifique se o SQL da migration foi executado sem erros
- Procure por mensagens de erro no SQL Editor

### Se as funções não existirem:
- Execute novamente o `FULL_MIGRATION.sql`
- Verifique se não há conflitos de nomes

### Se o login não funcionar:
- Verifique se a `VITE_SUPABASE_ANON_KEY` está correta
- Verifique se o RLS está configurado corretamente
- Teste no Supabase Dashboard → Authentication → Users

---

## 📞 Comandos Úteis

```bash
# Verificar se o .env está correto
cat .env | grep SUPABASE

# Limpar cache do Vite
rm -rf node_modules/.vite

# Reiniciar o servidor de desenvolvimento
npm run dev
```
