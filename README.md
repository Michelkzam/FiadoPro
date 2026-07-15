# FiadoPro

Sistema de gestão para comércios (vendas a fiado) - gerencie clientes, transações, pedidos, produtos e envie cardápios via WhatsApp.

## Tecnologias

- **Frontend:** React 18 + Vite
- **UI:** Radix UI + Tailwind CSS
- **Estado/Cache:** TanStack Query
- **Build:** Vite
- **Estilo:** ESLint

## Pré-requisitos

- Node.js 18+
- npm ou yarn

## Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>

# Navegue até o diretório
cd fiadopro

# Instale as dependências
npm install

# Copie o arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Configure as variáveis de ambiente no arquivo .env
```

## Configuração

Edite o arquivo `.env` com suas configurações:

```env
# URL da API Backend
VITE_API_URL=http://localhost:3000

# Configurações WhatsApp Z-API (opcional - pode ser configurado via UI)
VITE_ZAPI_INSTANCE_ID=
VITE_ZAPI_TOKEN=
```

## Desenvolvimento

```bash
# Inicie o servidor de desenvolvimento
npm run dev

# Acesse http://localhost:5173
```

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run preview` | Visualiza build de produção |
| `npm run lint` | Verifica código com ESLint |
| `npm run lint:fix` | Corrige problemas de lint automaticamente |
| `npm run typecheck` | Verifica tipos TypeScript |

## Estrutura do Projeto

```
src/
├── api/              # Cliente API
├── components/       # Componentes React
│   └── ui/          # Componentes de UI (Radix)
├── hooks/           # Hooks customizados
├── lib/             # Utilitários e configurações
├── pages/           # Páginas da aplicação
├── services/        # Serviços externos (WhatsApp API)
└── utils/           # Funções utilitárias
```

## Funcionalidades

- **Dashboard** - Painel de controle com métricas
- **Clientes** - Cadastro e gestão de clientes
- **Transações** - Registro de compras e pagamentos
- **Pedidos** - Fluxo de pedidos com aprovação
- **Produtos** - Cardápio e gestão de produtos
- **Envio de Cardápio** - Envio via WhatsApp API (Z-API)
- **Portal do Cliente** - Acesso do cliente ao seu saldo
- **Relatórios** - Histórico financeiro
- **Dark Mode** - Tema claro/escuro

## Backend

Este projeto requer um backend REST API. A API client está configurada em `src/lib/apiClient.js` e segue o padrão RESTful.

### Entidades

- `customers` - Clientes
- `transactions` - Transações (compras/pagamentos)
- `orders` - Pedidos
- `products` - Produtos
- `store-profiles` - Perfil da loja
- `menu-send-history` - Histórico de envios de cardápio

## Licença

MIT
