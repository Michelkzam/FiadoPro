import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Bot, Send, Copy, Check, User, DollarSign, Clock, Beer, PartyPopper,
  MessageCircle, Sparkles, ArrowRight, ChevronDown, Store, Phone, X, RefreshCw
} from "lucide-react";
import { useCustomers, useStoreProfile } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/sendWhatsApp";

const CATEGORIES = [
  {
    id: "cobranca",
    label: "Cobrança de Fiado",
    icon: DollarSign,
    color: "amber",
    description: "Mensagens educadas para cobrar clientes com saldo",
  },
  {
    id: "cardapio",
    label: "Divulgar Cardápio",
    icon: Beer,
    color: "green",
    description: "Promova seu cardápio do dia com apelo visual",
  },
  {
    id: "promocao",
    label: "Promoção / Evento",
    icon: PartyPopper,
    color: "purple",
    description: "Anuncie promoções, eventos e novidades",
  },
  {
    id: "agradecimento",
    label: "Agradecimento",
    icon: Heart,
    color: "pink",
    description: "Agradeça clientes fiéis e fortaleça o relacionamento",
  },
  {
    id: "lembrete",
    label: "Lembrete de Pedido",
    icon: Clock,
    color: "blue",
    description: "Lembre clientes que estão sem pedir há um tempo",
  },
  {
    id: "personalizada",
    label: "Mensagem Personalizada",
    icon: Sparkles,
    color: "indigo",
    description: "Descreva o que precisa e eu monto a mensagem",
  },
];

function Heart(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}

const COLOR_MAP = {
  amber: { bg: "bg-amber-50 dark:bg-amber-950", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", btn: "bg-amber-500 hover:bg-amber-600" },
  green: { bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-300", btn: "bg-green-500 hover:bg-green-600" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300", btn: "bg-purple-500 hover:bg-purple-600" },
  pink: { bg: "bg-pink-50 dark:bg-pink-950", border: "border-pink-200 dark:border-pink-800", text: "text-pink-700 dark:text-pink-300", btn: "bg-pink-500 hover:bg-pink-600" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", btn: "bg-blue-500 hover:bg-blue-600" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", btn: "bg-indigo-500 hover:bg-indigo-600" },
};

function MessageBubble({ message, onCopy, onSend }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] text-muted-foreground mb-1">Assistente CRM</p>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
        {onSend && (
          <button
            onClick={() => onSend(message.content)}
            className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Enviar
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryPicker({ onSelect }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Olá! Sou seu assistente de CRM</p>
          <p className="text-xs text-muted-foreground">O que você precisa hoje?</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((cat) => {
          const colors = COLOR_MAP[cat.color];
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className={`text-left p-3 rounded-xl border transition-all hover:shadow-md ${colors.bg} ${colors.border}`}
            >
              <cat.icon className={`w-5 h-5 ${colors.text} mb-2`} />
              <p className={`text-sm font-medium ${colors.text}`}>{cat.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{cat.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CobrancaForm({ customers, storeProfile, onGenerate, onBack }) {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [tone, setTone] = useState("educado");
  const [daysOwed, setDaysOwed] = useState("15");

  const debtors = useMemo(() =>
    customers.filter((c) => (c.balance || 0) > 0).sort((a, b) => (b.balance || 0) - (a.balance || 0)),
    [customers]
  );

  const handleGenerate = () => {
    const customer = debtors.find((c) => c.id === selectedCustomer);
    if (!customer) { toast.error("Selecione um cliente"); return; }

    const days = parseInt(daysOwed) || 15;
    const storeName = storeProfile?.store_name || "nosso bar";
    const pixKey = storeProfile?.pix_key_1;

    const messages = {
      educado: `Oi, ${customer.name.split(" ")[0]}! Tudo bem? 😊

Espero que sim! Passando só para lembrar que você tem um saldo de ${formatCurrency(customer.balance)} conosco${days > 7 ? ` já faz ${days} dias` : ""}.

Se precisar, pode pagar no Pix: ${pixKey || "chave Pix não configurada"}

Qualquer dúvida, é só chamar! Valeu! 🍻`,

      amigavel: `E aí, ${customer.name.split(" ")[0]}! 🍺

Beleza? Só passando pra gente alinhar aquela pendência de ${formatCurrency(customer.balance)} que tá em aberto.

Pra facilitar, manda no Pix: ${pixKey || "chave Pix não configurada"}

Vamos fechar isso e tomar uma juntos! 😄`,

      direto: `${customer.name.split(" ")[0]}, tudo certo?

Pra manter sua conta em dia, falta um pagamento de ${formatCurrency(customer.balance)}.

Pix: ${pixKey || "chave Pix não configurada"}

Precisa de algo, é só falar. 👍`,

      comemorativo: `${customer.name.split(" ")[0]}, lembra da gente? 😄

Aqui no ${storeName} sentimos sua falta! E aproveitando, seu saldo tá em ${formatCurrency(customer.balance)}.

Pix: ${pixKey || "chave Pix não configurada"}

Vem visitar a gente! Sempre tem uma gelada esperando 🍻`,
    };

    onGenerate(messages[tone] || messages.educado);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        ← Voltar
      </button>
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-amber-500" />
        <div>
          <p className="font-semibold text-foreground text-sm">Cobrança de Fiado</p>
          <p className="text-xs text-muted-foreground">Monte uma mensagem educada para cobrar</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Cliente *</Label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full border border-input rounded-xl px-3 py-2.5 bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Selecione o cliente</option>
            {debtors.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {formatCurrency(c.balance)}</option>
            ))}
          </select>
          {debtors.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">Nenhum cliente com saldo em aberto</p>
          )}
        </div>

        <div>
          <Label>Há quantos dias está devendo?</Label>
          <div className="flex gap-2 mt-1">
            {["7", "15", "30", "60"].map((d) => (
              <button
                key={d}
                onClick={() => setDaysOwed(d)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                  daysOwed === d ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Tom da mensagem</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[
              { value: "educado", label: "Educado", emoji: "😊" },
              { value: "amigavel", label: "Amigável", emoji: "🍻" },
              { value: "direto", label: "Direto", emoji: "👍" },
              { value: "comemorativo", label: "Saudoso", emoji: "😢" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                  tone === t.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleGenerate} className="w-full">
          <Sparkles className="w-4 h-4 mr-2" /> Gerar Mensagem
        </Button>
      </div>
    </div>
  );
}

function CardapioForm({ storeProfile, products, onGenerate, onBack }) {
  const [customMessage, setCustomMessage] = useState("");

  const handleGenerate = () => {
    const storeName = storeProfile?.store_name || "nosso bar";
    const available = products.filter((p) => p.available !== false);
    const grouped = available.reduce((acc, p) => {
      const cat = p.category || "Outros";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});

    let msg = `🍺 *${storeName}* 🍺\n\n`;
    msg += `📋 *Cardápio do Dia*\n`;
    msg += `━━━━━━━━━━━━━━━━━\n\n`;

    for (const [cat, items] of Object.entries(grouped)) {
      msg += `*${cat}*\n`;
      items.forEach((item) => {
        msg += `✅ ${item.name}`;
        if (item.description) msg += ` — ${item.description}`;
        msg += `\n   💰 ${formatCurrency(item.price)}\n`;
      });
      msg += `\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━\n`;

    if (customMessage.trim()) {
      msg += `\n📢 ${customMessage.trim()}\n\n`;
    }

    msg += `📞 Peça pelo WhatsApp!\n`;
    msg += `📍 Venha nos visitar!`;

    onGenerate(msg);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        ← Voltar
      </button>
      <div className="flex items-center gap-2">
        <Beer className="w-5 h-5 text-green-500" />
        <div>
          <p className="font-semibold text-foreground text-sm">Divulgar Cardápio</p>
          <p className="text-xs text-muted-foreground">Monte uma mensagem com seus produtos</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Mensagem personalizada (opcional)</Label>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Ex: Hoje tem espetinho de frango por R$ 8! 🍢"
            rows={3}
          />
        </div>
        <div className="bg-muted/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">
            Serão incluídos {products.filter((p) => p.available !== false).length} produtos disponíveis
          </p>
        </div>
        <Button onClick={handleGenerate} className="w-full bg-green-600 hover:bg-green-700">
          <Sparkles className="w-4 h-4 mr-2" /> Gerar Cardápio
        </Button>
      </div>
    </div>
  );
}

function PromocaoForm({ storeProfile, onGenerate, onBack }) {
  const [promoType, setPromoType] = useState("happy_hour");
  const [customText, setCustomText] = useState("");
  const [discount, setDiscount] = useState("");

  const storeName = storeProfile?.store_name || "nosso bar";

  const templates = {
    happy_hour: `🎉 *HAPPY HOUR* 🎉\n\n📍 ${storeName}\n⏰ Hoje das 17h às 20h\n\n🍺 *Chopp:* ${discount ? `${discount}% OFF` : "Apenas R$ 5,00"}\n🍹 *Drinks:* ${discount ? `${discount}% OFF` : "Apenas R$ 8,00"}\n\nVem com a galera! Só hoje! 🥳`,

    promocao_dia: `🌟 *PROMOÇÃO DO DIA* 🌟\n\n📍 ${storeName}\n\n${customText || "🔥 Aproveite nossas ofertas especiais de hoje!"}\n\n📞 Peça pelo WhatsApp!\n📍 Venha nos visitar! 🍻`,

    evento: `📢 *NOVIDADE NO ${storeName.toUpperCase()}* 📢\n\n${customText || "Estamos com novidades pra vocês!"}\n\n📍 Venha conferir!\n📞 WhatsApp: (11) 99999-9999\n\nVem que é bom! 🍺🎉`,

    combo: `🍽️ *COMBO ESPECIAL* 🍽️\n\n📍 ${storeName}\n\n${customText || "Combo completo por apenas R$ 29,90!"}\n\n⚡ Vagas limitadas!\n📞 Peça já pelo WhatsApp!`,

    lembrete: `🍻 *Fala, galera!* 🍻\n\n${storeName} com novidades!\n\n${customText || "Venha conferir nosso cardápio atualizado!"}\n\n📍 Estamos te esperando!\n📞 (11) 99999-9999`,
  };

  const handleGenerate = () => {
    const msg = templates[promoType] || templates.promocao_dia;
    onGenerate(msg);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        ← Voltar
      </button>
      <div className="flex items-center gap-2">
        <PartyPopper className="w-5 h-5 text-purple-500" />
        <div>
          <p className="font-semibold text-foreground text-sm">Promoção / Evento</p>
          <p className="text-xs text-muted-foreground">Crie uma mensagem para divulgar</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Tipo de promoção</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[
              { value: "happy_hour", label: "Happy Hour", emoji: "🍺" },
              { value: "promocao_dia", label: "Promo do Dia", emoji: "🔥" },
              { value: "evento", label: "Novidade/Evento", emoji: "📢" },
              { value: "combo", label: "Combo", emoji: "🍽️" },
              { value: "lembrete", label: "Lembrete", emoji: "🍻" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setPromoType(t.value)}
                className={`py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                  promoType === t.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {promoType === "happy_hour" && (
          <div>
            <Label>Desconto (opcional)</Label>
            <Input
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="Ex: 30"
              type="number"
            />
          </div>
        )}

        <div>
          <Label>Texto personalizado *</Label>
          <Textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Descreva sua promoção, evento ou novidade..."
            rows={3}
          />
        </div>

        <Button onClick={handleGenerate} className="w-full bg-purple-600 hover:bg-purple-700">
          <Sparkles className="w-4 h-4 mr-2" /> Gerar Mensagem
        </Button>
      </div>
    </div>
  );
}

function AgradecimentoForm({ customers, storeProfile, onGenerate, onBack }) {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const storeName = storeProfile?.store_name || "nosso bar";

  const goodCustomers = useMemo(() =>
    customers.filter((c) => (c.balance || 0) <= 0 && c.status === "ativo"),
    [customers]
  );

  const handleGenerate = () => {
    const customer = goodCustomers.find((c) => c.id === selectedCustomer);
    const name = customer ? customer.name.split(" ")[0] : "parceiro(a)";

    const msg = `Obrigado, ${name}! 🙏❤️\n\nVocê é um cliente muito especial do *${storeName}*! Sua confiança significa tudo pra gente.\n\nSempre que precisar, estamos aqui! 🍻\n\nUm abraço! 👊`;

    onGenerate(msg);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        ← Voltar
      </button>
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-pink-500" />
        <div>
          <p className="font-semibold text-foreground text-sm">Agradecimento</p>
          <p className="text-xs text-muted-foreground">Fortaleça o relacionamento com seus clientes</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Cliente (opcional)</Label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full border border-input rounded-xl px-3 py-2.5 bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Mensagem genérica</option>
            {goodCustomers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleGenerate} className="w-full bg-pink-600 hover:bg-pink-700">
          <Sparkles className="w-4 h-4 mr-2" /> Gerar Agradecimento
        </Button>
      </div>
    </div>
  );
}

function LembreteForm({ customers, storeProfile, onGenerate, onBack }) {
  const [daysSince, setDaysSince] = useState("30");
  const storeName = storeProfile?.store_name || "nosso bar";

  const handleGenerate = (type) => {
    const msg = type === "geral"
      ? `Fala, galera! 😊\n\nSentimos sua falta aqui no *${storeName}*!\n\nVem tomar uma com a gente! Estamos com o cardápio atualizado 🍺\n\n📍 Te esperamos! 🤙`
      : `Ei, tudo bem? 😊\n\nFaz um tempo que você não aparece no *${storeName}*! Saudades da sua presença.\n\nVem a gente? Sempre tem uma gelada esperando! 🍻`;

    onGenerate(msg);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        ← Voltar
      </button>
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-500" />
        <div>
          <p className="font-semibold text-foreground text-sm">Lembrete de Pedido</p>
          <p className="text-xs text-muted-foreground">Reative clientes que estão sem pedir</p>
        </div>
      </div>

      <div className="space-y-3">
        <Button onClick={() => handleGenerate("geral")} variant="outline" className="w-full justify-start">
          📢 Mensagem para lista de transmissão (geral)
        </Button>
        <Button onClick={() => handleGenerate("pessoal")} variant="outline" className="w-full justify-start">
          👤 Mensagem pessoal para cliente específico
        </Button>
      </div>
    </div>
  );
}

function PersonalizadaForm({ onGenerate, onBack }) {
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    if (!prompt.trim()) { toast.error("Descreva o que precisa"); return; }

    const keywords = prompt.toLowerCase();
    let msg = "";

    if (keywords.includes("cobran") || keywords.includes("fiado") || keywords.includes("devendo") || keywords.includes("saldo")) {
      msg = `Oi! Tudo bem? 😊\n\nPassando para lembrar sobre o saldo em aberto. Qualquer coisa, pode pagar no Pix!\n\nPrecisa de algo, é só chamar! 🍻`;
    } else if (keywords.includes("promo") || keywords.includes("desconto") || keywords.includes("oferta")) {
      msg = `🎉 *PROMOÇÃO ESPECIAL!* 🎉\n\n${prompt}\n\nVem aproveitar! 🍺`;
    } else if (keywords.includes("cardápio") || keywords.includes("cardapio") || keywords.includes("menu")) {
      msg = `📋 *CARDÁPIO DO DIA*\n\n${prompt}\n\n📞 Peça pelo WhatsApp! 🍻`;
    } else if (keywords.includes("evento") || keywords.includes("festa") || keywords.includes("comemoração")) {
      msg = `📢 *EVENTO ESPECIAL!* 📢\n\n${prompt}\n\nVem com a galera! 🎉🍺`;
    } else {
      msg = prompt;
    }

    onGenerate(msg);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        ← Voltar
      </button>
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        <div>
          <p className="font-semibold text-foreground text-sm">Mensagem Personalizada</p>
          <p className="text-xs text-muted-foreground">Descreva o que precisa e eu monto</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>O que você precisa?</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Criar uma promoção de aniversário com 10% de desconto para clientes que fazem aniversário este mês"
            rows={4}
          />
        </div>
        <Button onClick={handleGenerate} className="w-full bg-indigo-600 hover:bg-indigo-700">
          <Sparkles className="w-4 h-4 mr-2" /> Montar Mensagem
        </Button>
      </div>
    </div>
  );
}

export default function WhatsAppCRM() {
  const { data: customers = [] } = useCustomers();
  const { data: profiles = [] } = useStoreProfile();
  const storeProfile = profiles[0] || null;
  const { data: products = [] } = useActiveProducts();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sendTarget, setSendTarget] = useState(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleGenerate = (content) => {
    setMessages((prev) => [...prev, { id: Date.now(), content, type: "generated" }]);
  };

  const handleSendWhatsApp = (content, customerPhone) => {
    if (!customerPhone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    sendWhatsApp(customerPhone, content);
    toast.success("Mensagem enviada via WhatsApp!");
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  const renderForm = () => {
    switch (selectedCategory?.id) {
      case "cobranca":
        return <CobrancaForm customers={customers} storeProfile={storeProfile} onGenerate={handleGenerate} onBack={handleBack} />;
      case "cardapio":
        return <CardapioForm storeProfile={storeProfile} products={products} onGenerate={handleGenerate} onBack={handleBack} />;
      case "promocao":
        return <PromocaoForm storeProfile={storeProfile} onGenerate={handleGenerate} onBack={handleBack} />;
      case "agradecimento":
        return <AgradecimentoForm customers={customers} storeProfile={storeProfile} onGenerate={handleGenerate} onBack={handleBack} />;
      case "lembrete":
        return <LembreteForm customers={customers} storeProfile={storeProfile} onGenerate={handleGenerate} onBack={handleBack} />;
      case "personalizada":
        return <PersonalizadaForm onGenerate={handleGenerate} onBack={handleBack} />;
      default:
        return <CategoryPicker onSelect={setSelectedCategory} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Assistente de CRM</p>
            <p className="text-[11px] opacity-80">WhatsApp Business • Bar do Bairro</p>
          </div>
        </div>

        {/* Chat Area */}
        <div ref={chatRef} className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-green-50/50 to-background dark:from-green-950/20 dark:to-background">
          {messages.length === 0 && !selectedCategory && (
            <CategoryPicker onSelect={setSelectedCategory} />
          )}

          {selectedCategory && messages.length === 0 && renderForm()}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onCopy={() => {}}
              onSend={(content) => {
                toast.info("Para enviar, copie a mensagem e cole no WhatsApp");
              }}
            />
          ))}

          {messages.length > 0 && !selectedCategory && (
            <div className="text-center py-2">
              <button
                onClick={() => { setSelectedCategory(null); setMessages([]); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
              >
                <RefreshCw className="w-3 h-3" /> Nova mensagem
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 bg-card">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              💡 Lembre: para listas de transmissão, o cliente precisa ter seu número salvo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
