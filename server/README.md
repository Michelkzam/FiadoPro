# FiadoPro WhatsApp Server (Baileys - Gratuito)

Servidor WebSocket para conectar WhatsApp via QR Code usando Baileys.

## Deploy Gratuito no Railway

1. Acesse https://railway.app e crie uma conta (gratis)

2. Clique em "New Project" > "Deploy from GitHub repo"

3. Selecione o repositorio `FiadoPro` e a pasta `server`

4. Adicione as variaveis de ambiente:
   ```
   SUPABASE_URL=https://yxtqafagbjkcldtikbgo.supabase.co
   SUPABASE_ANON_KEY=sua_chave_aqui
   ```

5. Clique em "Deploy"

6. Apos o deploy, copie a URL do servidor (ex: `https://fiadopro-whatsapp.up.railway.app`)

7. No FiadoPro (`/whatsapp-ai`), configure essa URL

## Variaveis de Ambiente

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto Supabase | Sim |
| `SUPABASE_ANON_KEY` | Chave anon do Supabase | Sim |
| `PORT` | Porta do servidor (default: 3001) | Nao |

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/status` | Status da conexao e QR Code |
| POST | `/send` | Enviar mensagem WhatsApp |

## Como Funciona

1. O servidor inicia e gera um QR Code
2. Voce escaneia o QR Code com o WhatsApp
3. A conexao e mantida via WebSocket (Baileys)
4. Mensagens recebidas sao processadas pelo bot
5. Respostas sao enviadas automaticamente

## Estrutura de Pastas

```
server/
├── index.js          # Servidor principal
├── package.json      # Dependencias
├── baileys_auth/     # Credenciais WhatsApp (gerado automaticamente)
└── README.md         # Esta documentacao
```
