import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, LogOut, ClipboardList, History, ShoppingBag, Package, Plus, Minus, Trash2, Send, CreditCard, Smartphone, Banknote } from "lucide-react";
import BalanceBadge from "../components/BalanceBadge";
import db from "@/lib/db";
import { formatCurrency, parseDateToTimestamp, ORDER_STATUS_CONFIG } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { generatePixPayload } from "@/utils/pixUtils";

const PORTAL_SESSION_KEY = "fiadopro_portal_session";

export default function ClientPortal() {
  const [step, setStep] = useState("login");
  const [cpf, setCpf] = useState("");
  const [code, setCode] = useState("");
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("conta");
  const [cart, setCart] = useState([]);
  const [extraRequest, setExtraRequest] = useState("");
  const [checkoutSent, setCheckoutSent] = useState(false);
  const [sendingCart, setSendingCart] = useState(false);
  const [storeProfile, setStoreProfile] = useState(null);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [pixAmount, setPixAmount] = useState("");
  const [showCashPayment, setShowCashPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cardBrand, setCardBrand] = useState("");
  const [cardType, setCardType] = useState("");
  const [cartPaymentMethod, setCartPaymentMethod] = useState("");
  const [cartCardType, setCartCardType] = useState("");
  const [cartCardBrand, setCartCardBrand] = useState("");

  const normalize = (str) => str.replace(/\D/g, "");

  useEffect(() => {
    db.entities.StoreProfile.list().then((p) => { if (p[0]) setStoreProfile(p[0]); }).catch(() => {});
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const saved = localStorage.getItem(PORTAL_SESSION_KEY);
      if (!saved) return;
      const { customerId } = JSON.parse(saved);
      if (!customerId) return;

      const found = await db.entities.Customer.get(customerId);
      if (!found) { localStorage.removeItem(PORTAL_SESSION_KEY); return; }

      setCustomer(found);
      const [txs, ords, prods] = await Promise.all([
        db.entities.Transaction.filter({ customer_id: found.id }, "-created_at", 200),
        db.entities.Order.filter({ customer_id: found.id }, "-created_at", 50),
        db.entities.Product.filter({ available: true }, "category", 200),
      ]);
      setTransactions(txs);
      setOrders(ords);
      setProducts(prods);
      setStep("portal");
    } catch {
      localStorage.removeItem(PORTAL_SESSION_KEY);
    }
  };

  const saveSession = (customerId) => {
    localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({ customerId }));
  };

  const clearSession = () => {
    localStorage.removeItem(PORTAL_SESSION_KEY);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const normalizedCpf = normalize(cpf);
      const accessCode = code.toUpperCase();

      if (!normalizedCpf || normalizedCpf.length < 11) {
        setError("CPF inválido");
        setLoading(false);
        return;
      }

      if (!accessCode || accessCode.length < 4) {
        setError("Código de acesso inválido");
        setLoading(false);
        return;
      }

      const matchingCustomers = await db.entities.Customer.list("-created_at", 1000);

      const found = matchingCustomers.find(
        (c) => normalize(c.cpf) === normalizedCpf && c.access_code?.toUpperCase() === accessCode
      );

      if (found) {
        saveSession(found.id);
        setCustomer(found);
        const [txs, ords, prods] = await Promise.all([
          db.entities.Transaction.filter({ customer_id: found.id }, "-created_at", 200),
          db.entities.Order.filter({ customer_id: found.id }, "-created_at", 50),
          db.entities.Product.filter({ available: true }, "category", 200),
        ]);
        setTransactions(txs);
        setOrders(ords);
        setProducts(prods);
        setStep("portal");
      } else {
        setError("CPF ou código de acesso inválido");
      }
    } catch {
      setError("Erro ao verificar credenciais");
    }

    setLoading(false);
  };

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const changeQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0)
    );
  }, []);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);

  const sendCartOrder = async () => {
    if (cart.length === 0 && !extraRequest.trim()) return;
    if (!cartPaymentMethod) {
      setError("Selecione a forma de pagamento");
      return;
    }
    if (cartPaymentMethod === "cartao" && !cartCardType) {
      setError("Selecione débito ou crédito");
      return;
    }

    if (cartPaymentMethod === "dinheiro" && (customer.credit_limit || 0) > 0) {
      const currentBalance = customer.balance || 0;
      const newBalance = currentBalance + cartTotal;
      if (newBalance > customer.credit_limit) {
        setError(`Limite de crédito excedido! Seu limite é ${formatCurrency(customer.credit_limit)} e o novo saldo seria ${formatCurrency(newBalance)}. Aguarde liberação do lojista.`);
        if (storeProfile?.phone) {
          const msg = `⚠️ ${customer.name} tentou fazer compra de ${formatCurrency(cartTotal)} que excede o limite de crédito.\nLimite: ${formatCurrency(customer.credit_limit)}\nSaldo atual: ${formatCurrency(currentBalance)}\nNovo saldo seria: ${formatCurrency(newBalance)}\n\nLibere a compra no painel.`;
          sendWhatsApp(storeProfile.phone, msg);
        }
        setSendingCart(false);
        return;
      }
    }

    setError("");
    setSendingCart(true);
    const cartDesc = cart.map((i) => `${i.qty}x ${i.name} (${formatCurrency(i.price)})`).join(", ");
    const extraDesc = extraRequest.trim() ? `\nOutros: ${extraRequest.trim()}` : "";
    const desc = cartDesc + extraDesc;

    await db.entities.Order.create({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      description: desc || "Pedido",
      amount: cartTotal,
      status: "pendente",
      service_type: "online_entrega",
      payment_method: cartPaymentMethod,
      payment_card_type: cartPaymentMethod === "cartao" ? cartCardType : null,
    });

    if (cartPaymentMethod === "dinheiro") {
      const { format: formatDate } = await import("date-fns");
      const now = new Date();
      await db.entities.Transaction.create({
        customer_id: customer.id,
        customer_name: customer.name,
        type: "compra",
        amount: cartTotal,
        date: formatDate(now, "dd/MM/yyyy"),
        time: formatDate(now, "HH:mm"),
        description: `Pedido online - ${cartDesc}`,
      });

      const currentCustomer = await db.entities.Customer.get(customer.id);
      const newBalance = (currentCustomer.balance || 0) + cartTotal;
      await db.entities.Customer.update(customer.id, { balance: newBalance });

      setCustomer((prev) => ({ ...prev, balance: newBalance }));

      if (storeProfile?.phone) {
        const msg = `Pedido registrado! Valor: ${formatCurrency(cartTotal)}\nSaldo devedor: ${formatCurrency(newBalance)}`;
        sendWhatsApp(storeProfile.phone, msg);
      }
    }

    setCart([]);
    setExtraRequest("");
    setCartPaymentMethod("");
    setCartCardType("");
    setCartCardBrand("");
    setCheckoutSent(true);
    setSendingCart(false);
    setTimeout(() => setCheckoutSent(false), 5000);
  };

  const processPayment = async (paymentMethod, customAmount = null) => {
    const totalDebito = customer.balance || 0;
    if (totalDebito <= 0) {
      toast.error("Não há saldo devedor para quitar");
      return;
    }

    const amount = customAmount || totalDebito;
    if (amount <= 0 || amount > totalDebito) {
      toast.error(`Valor deve ser entre R$ 0,01 e ${formatCurrency(totalDebito)}`);
      return;
    }

    setLoading(true);
    try {
      const { format: formatDate } = await import("date-fns");
      const now = new Date();

      const isParcelado = amount < totalDebito;
      const desc = isParcelado
        ? `Pagamento parcial (${formatCurrency(amount)}) via ${paymentMethod} — Restante: ${formatCurrency(totalDebito - amount)}`
        : `Pagamento integral via ${paymentMethod}`;

      await db.entities.Transaction.create({
        customer_id: customer.id,
        customer_name: customer.name,
        type: "pagamento",
        amount,
        date: formatDate(now, "dd/MM/yyyy"),
        time: formatDate(now, "HH:mm"),
        description: desc,
      });

      const newBalance = totalDebito - amount;
      await db.entities.Customer.update(customer.id, { balance: newBalance });

      if (storeProfile?.phone) {
        const status = newBalance <= 0 ? "Saldo quitado!" : `Restante: ${formatCurrency(newBalance)}`;
        const msg = `${customer.name} pagou ${formatCurrency(amount)} via ${paymentMethod}.\n${status}`;
        sendWhatsApp(storeProfile.phone, msg);
      }

      setCustomer((prev) => ({ ...prev, balance: newBalance }));
      setTransactions((prev) => [{
        id: Date.now().toString(),
        customer_id: customer.id,
        customer_name: customer.name,
        type: "pagamento",
        amount,
        date: formatDate(now, "dd/MM/yyyy"),
        time: formatDate(now, "HH:mm"),
        description: desc,
      }, ...prev]);

      if (newBalance <= 0) {
        toast.success(`Conta quitada! Pagamento de ${formatCurrency(amount)}`);
      } else {
        toast.success(`Pagamento de ${formatCurrency(amount)} registrado! Restante: ${formatCurrency(newBalance)}`);
      }
    } catch (error) {
      toast.error("Erro ao registrar pagamento");
    }
    setLoading(false);
  };

  const grouped = useMemo(() => products.reduce((acc, p) => {
    const cat = p.category || "Cardápio";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {}), [products]);

  const dailyStatement = useMemo(() => {
    const sortedTxs = [...transactions].sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
    const txByDate = sortedTxs.reduce((acc, t) => {
      const k = t.date;
      if (!acc[k]) acc[k] = [];
      acc[k].push(t);
      return acc;
    }, {});
    const dateKeys = Object.keys(txByDate).sort((a, b) => parseDateToTimestamp(a) - parseDateToTimestamp(b));

    let runningBalance = 0;
    return dateKeys.map((date) => {
      const prev = runningBalance;
      const dayTxs = txByDate[date];
      dayTxs.forEach((t) => {
        if (t.type === "compra") runningBalance += t.amount;
        else runningBalance -= t.amount;
      });
      return { date, transactions: dayTxs, openBalance: prev, closeBalance: runningBalance };
    });
  }, [transactions]);

  const pendingOrders = useMemo(() => orders.filter((o) => !["finalizado", "recusado"].includes(o.status)), [orders]);

  const tabs = [
    { id: "conta", label: "Minha Conta", icon: ClipboardList },
    { id: "historico", label: "Meu Histórico", icon: History },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag, badge: orders.filter(o => o.status === "pendente").length },
    { id: "cardapio", label: "Produtos", icon: Package },
  ];

  if (step === "login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Portal do Cliente</h1>
            <p className="text-sm text-muted-foreground mt-1">Consulte seu saldo e histórico</p>
          </div>
          <form onSubmit={handleLogin} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
            <div>
              <Label>CPF</Label>
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" required />
            </div>
            <div>
              <Label>Código de Acesso</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: ABC123" required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verificando..." : "Acessar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-inter">
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-semibold">Olá, {customer.name?.split(" ")[0]}</span>
        <button onClick={() => { setStep("login"); setCustomer(null); clearSession(); }} className="flex items-center gap-1 text-sm hover:bg-white/10 px-2 py-1 rounded">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </header>

      <div className="flex border-b border-border bg-card overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-3 px-3 text-xs font-medium transition-colors whitespace-nowrap relative shrink-0 ${
              activeTab === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.badge > 0 && (
              <span className="absolute -top-0 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {activeTab === "conta" && (
          <div className="space-y-4">
            <div className={`rounded-xl border shadow-sm p-5 text-center ${(customer.balance || 0) < 0 ? "bg-blue-50 border-blue-200" : "bg-card border-border"}`}>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                {(customer.balance || 0) < 0 ? "Saldo Positivo (Crédito)" : "Saldo em Aberto"}
              </p>
              <BalanceBadge balance={customer.balance || 0} size="lg" />
              {(customer.balance || 0) < 0 && (
                <p className="text-xs text-blue-600 mt-2">🎉 Você tem crédito disponível para sua próxima compra!</p>
              )}
              {(customer.credit_limit || 0) > 0 && (customer.balance || 0) > customer.credit_limit && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700">⚠️ Saldo acima do limite de crédito</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Limite: {formatCurrency(customer.credit_limit)} | Saldo: {formatCurrency(customer.balance || 0)}
                  </p>
                  <p className="text-xs text-amber-500 mt-1">Aguarde liberação do lojista para novas compras</p>
                </div>
              )}
              {(customer.credit_limit || 0) > 0 && (customer.balance || 0) <= customer.credit_limit && (customer.balance || 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Limite: {formatCurrency(customer.credit_limit)} | Disponível: {formatCurrency(customer.credit_limit - (customer.balance || 0))}
                </p>
              )}
            </div>

            {pendingOrders.length > 0 && (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-amber-50">
                  <p className="font-semibold text-amber-800 text-sm">Pedidos Pendentes</p>
                </div>
                <div className="divide-y divide-border">
                  {pendingOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between p-4">
                      <p className="text-sm text-foreground line-clamp-2 flex-1 mr-2">{o.description || "Pedido"}</p>
                      <span className="font-bold text-sm text-amber-600 shrink-0">{formatCurrency(o.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
              <p className="font-semibold text-foreground text-sm">Pagar Minha Conta</p>
              <p className="text-xs text-muted-foreground">Saldo: <strong className="text-foreground">{formatCurrency(customer.balance || 0)}</strong></p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`flex items-center justify-center gap-2 border rounded-xl p-3 text-sm font-medium transition-colors ${showCashPayment ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  onClick={() => { setShowCashPayment(!showCashPayment); setShowCardPayment(false); setShowPixPayment(false); setCardType(""); setCardBrand(""); }}
                >
                  💵 Dinheiro
                </button>
                <button
                  className={`flex items-center justify-center gap-2 border rounded-xl p-3 text-sm font-medium transition-colors ${showCardPayment ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  onClick={() => { setShowCardPayment(!showCardPayment); setShowCashPayment(false); setShowPixPayment(false); setCardType(""); setCardBrand(""); }}
                >
                  <CreditCard className="w-4 h-4 text-blue-500" /> Cartão
                </button>
                <button
                  className={`flex items-center justify-center gap-2 border rounded-xl p-3 text-sm font-medium transition-colors ${showPixPayment ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  onClick={() => { setShowPixPayment(!showPixPayment); setShowCashPayment(false); setShowCardPayment(false); setCardType(""); setCardBrand(""); }}
                >
                  <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/></svg>
                  Pix
                </button>
              </div>

              {showCashPayment && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-foreground">Como deseja pagar?</p>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Saldo devedor</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(customer.balance || 0)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Valor do pagamento</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={customer.balance || 0}
                      placeholder={formatCurrency(customer.balance || 0)}
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCashAmount(String(customer.balance || 0))}
                        className="flex-1 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        Valor total
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashAmount(String(Math.round((customer.balance || 0) / 2 * 100) / 100))}
                        className="flex-1 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        Metade
                      </button>
                    </div>
                  </div>

                  <button
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                    onClick={() => processPayment("Dinheiro", parseFloat(cashAmount) || null)}
                    disabled={loading || !cashAmount || parseFloat(cashAmount) <= 0}
                  >
                    <span className="text-sm font-medium">💵 Confirmar Pagamento</span>
                    <span className="text-xs text-muted-foreground">
                      {cashAmount ? formatCurrency(parseFloat(cashAmount)) : "Informe o valor"}
                    </span>
                  </button>

                  {(customer.credit_limit || 0) > 0 && (
                    <button
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                      onClick={() => processPayment("Crédito na Conta")}
                      disabled={loading}
                    >
                      <div className="text-left">
                        <span className="text-sm font-medium text-blue-700">💳 Usar Crédito na Conta</span>
                        <p className="text-xs text-blue-600">Limite disponível: {formatCurrency(customer.credit_limit)}</p>
                      </div>
                      <span className="text-xs text-blue-500">Quitar conta</span>
                    </button>
                  )}
                </div>
              )}

              {showCardPayment && (
                <div className="space-y-3 pt-2 border-t border-border">
                  {!cardType ? (
                    <>
                      <p className="text-xs font-medium text-foreground">Tipo de cartão:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCardType("credito")}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                        >
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">Crédito</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardType("debito")}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                        >
                          <CreditCard className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">Débito</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">
                          Cartão de {cardType === "credito" ? "Crédito" : "Débito"} — Bandeira:
                        </p>
                        <button onClick={() => setCardType("")} className="text-xs text-primary hover:underline">Trocar</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {["Visa", "Mastercard", "Elo", "Hipercard", "Amex", "Outro"].map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => setCardBrand(brand)}
                            className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${cardBrand === brand ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                      {cardBrand && (
                        <button
                          className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                          onClick={() => processPayment(`Cartão ${cardType === "credito" ? "Crédito" : "Débito"} ${cardBrand}`)}
                          disabled={loading}
                        >
                          Confirmar pagamento com {cardBrand} ({cardType === "credito" ? "Crédito" : "Débito"})
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {showPixPayment && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-foreground">Chaves Pix do estabelecimento:</p>

                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Saldo devedor</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(customer.balance || 0)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Valor do pagamento</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={customer.balance || 0}
                      placeholder={formatCurrency(customer.balance || 0)}
                      value={pixAmount}
                      onChange={(e) => setPixAmount(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPixAmount(String(customer.balance || 0))}
                        className="flex-1 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors">
                        Valor total
                      </button>
                      <button type="button" onClick={() => setPixAmount(String(Math.round((customer.balance || 0) / 2 * 100) / 100))}
                        className="flex-1 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors">
                        Metade
                      </button>
                    </div>
                  </div>

                  {storeProfile?.pix_key_1 ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(storeProfile.pix_key_1); toast.success("Chave Pix copiada!"); }}
                        className="w-full bg-green-50 border border-green-200 rounded-xl p-3 text-left hover:bg-green-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-green-700 font-semibold">Chave Pix Principal</p>
                            <p className="text-sm font-mono font-bold text-green-800 break-all">{storeProfile.pix_key_1}</p>
                          </div>
                          <span className="text-xs text-green-600 shrink-0">📋 Copiar</span>
                        </div>
                      </button>
                      <div className="bg-white border border-green-200 rounded-xl p-4 flex flex-col items-center">
                        <QRCodeSVG
                          value={generatePixPayload({
                            key: storeProfile.pix_key_1,
                            amount: (parseFloat(pixAmount) || customer.balance || 0).toFixed(2),
                            merchantName: storeProfile.store_name || "Loja",
                            merchantCity: storeProfile.city || "SAO PAULO",
                          })}
                          size={180}
                          level="M"
                          includeMargin={true}
                        />
                        <p className="text-xs text-muted-foreground mt-2">Escaneie para pagar</p>
                        <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(parseFloat(pixAmount) || customer.balance || 0)}</p>
                      </div>
                    </div>
                  ) : null}
                  {storeProfile?.pix_key_2 ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(storeProfile.pix_key_2); toast.success("Chave Pix copiada!"); }}
                        className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 text-left hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-blue-700 font-semibold">Chave Pix Secundária</p>
                            <p className="text-sm font-mono font-bold text-blue-800 break-all">{storeProfile.pix_key_2}</p>
                          </div>
                          <span className="text-xs text-blue-600 shrink-0">📋 Copiar</span>
                        </div>
                      </button>
                      <div className="bg-white border border-blue-200 rounded-xl p-4 flex flex-col items-center">
                        <QRCodeSVG
                          value={generatePixPayload({
                            key: storeProfile.pix_key_2,
                            amount: (parseFloat(pixAmount) || customer.balance || 0).toFixed(2),
                            merchantName: storeProfile.store_name || "Loja",
                            merchantCity: storeProfile.city || "SAO PAULO",
                          })}
                          size={180}
                          level="M"
                          includeMargin={true}
                        />
                        <p className="text-xs text-muted-foreground mt-2">Escaneie para pagar</p>
                        <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(parseFloat(pixAmount) || customer.balance || 0)}</p>
                      </div>
                    </div>
                  ) : null}
                  {!storeProfile?.pix_key_1 && !storeProfile?.pix_key_2 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Chaves Pix não cadastradas. Entre em contato com o estabelecimento.</p>
                  )}
                  {(storeProfile?.pix_key_1 || storeProfile?.pix_key_2) && (
                    <button
                      className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
                      onClick={() => processPayment("Pix", parseFloat(pixAmount) || null)}
                      disabled={loading || !pixAmount || parseFloat(pixAmount) <= 0}
                    >
                      {loading ? "Registrando..." : "Já paguei via Pix"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "historico" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Histórico Completo</h2>
            {dailyStatement.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Nenhuma movimentação</p>
            ) : (
              [...dailyStatement].reverse().map(({ date, transactions: txs, openBalance, closeBalance }) => (
                <div key={date} className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2">
                    <span className="font-semibold text-sm text-foreground">Dia {date}</span>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">Saldo anterior</span>
                      <span className="text-sm font-medium">{formatCurrency(openBalance)}</span>
                    </div>
                    {txs.map((t) => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <span className={`text-sm font-medium ${t.type === "compra" ? "text-red-700" : "text-green-700"}`}>
                            {t.type === "compra" ? "Compra" : "Pagamento"}
                          </span>
                          {t.description && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{t.description}</p>}
                        </div>
                        <span className={`text-sm font-semibold ${t.type === "compra" ? "text-red-600" : "text-green-600"}`}>
                          {t.type === "compra" ? "+" : "-"} {formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                      <span className="text-sm font-bold">Saldo</span>
                      <span className={`text-sm font-bold ${closeBalance > 0 ? "text-red-600" : closeBalance < 0 ? "text-blue-600" : "text-green-600"}`}>
                        {closeBalance < 0 ? `Crédito: ${formatCurrency(Math.abs(closeBalance))}` : formatCurrency(closeBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "pedidos" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Meus Pedidos</h2>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">Nenhum pedido encontrado</p>
            ) : (
              <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
                {orders.map((o) => {
                  const statusCfg = ORDER_STATUS_CONFIG[o.status] || ORDER_STATUS_CONFIG.pendente;
                  return (
                    <div key={o.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground flex-1">{o.description || "Pedido"}</p>
                        {o.amount > 0 && <span className="font-bold text-sm text-amber-600 shrink-0">{formatCurrency(o.amount)}</span>}
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`text-xs border px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        {["aprovado", "saiu_para_entrega"].includes(o.status) && o.amount > 0 && (
                          <button
                            onClick={() => {
                              if (storeProfile?.phone) {
                                const msg = `Olá! Sou ${customer.name} e gostaria de pagar o pedido: "${o.description}" no valor de ${formatCurrency(o.amount)}.`;
                          sendWhatsApp(storeProfile.phone, msg);
                              }
                            }}
                            className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "cardapio" && (
          <div className="space-y-5 pb-36">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h3>
                <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
                  {items.map((p) => {
                    const cartItem = cart.find((i) => i.id === p.id);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                        ) : (
                          <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0 text-muted-foreground/40 text-xs">IMG</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">{p.name}</p>
                          {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                          <p className="text-sm font-bold text-primary mt-0.5">{formatCurrency(p.price)}</p>
                        </div>
                        <div className="shrink-0">
                          {cartItem ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => changeQty(p.id, -1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-semibold w-5 text-center">{cartItem.qty}</span>
                              <button onClick={() => changeQty(p.id, 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(p)}
                              className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">Solicitar outros produtos</p>
              <p className="text-xs text-muted-foreground">Descreva produtos que não estão na lista acima:</p>
              <textarea
                value={extraRequest}
                onChange={(e) => setExtraRequest(e.target.value)}
                placeholder="Ex: 2 pães franceses, 1 garrafa de refrigerante..."
                rows={3}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-ring"
              />
              {extraRequest.trim() && !checkoutSent && (
                <button
                  onClick={sendCartOrder}
                  disabled={sendingCart}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {sendingCart ? "Enviando..." : "Enviar Solicitação"}
                </button>
              )}
              {checkoutSent && <p className="text-green-600 text-sm font-medium text-center">✅ Pedido enviado!</p>}
            </div>

            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border shadow-2xl z-20">
                <div className="max-w-lg mx-auto space-y-3">
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {cart.map((i) => (
                      <div key={i.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{i.qty}x {i.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">{formatCurrency(i.price * i.qty)}</span>
                          <button onClick={() => setCart((prev) => prev.filter((c) => c.id !== i.id))}>
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">Forma de Pagamento *</p>
                    <div className="flex gap-2">
                      {[
                        { value: "dinheiro", label: "Dinheiro", icon: Banknote },
                        { value: "pix", label: "Pix", icon: Smartphone },
                        { value: "cartao", label: "Cartão", icon: CreditCard },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => { setCartPaymentMethod(value); setCartCardType(""); setCartCardBrand(""); setError(""); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                            cartPaymentMethod === value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {label}
                        </button>
                      ))}
                    </div>

                    {cartPaymentMethod === "dinheiro" && (customer.credit_limit || 0) > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                        <p className="text-xs text-blue-700">💡 Você tem crédito de <strong>{formatCurrency(customer.credit_limit)}</strong> disponível</p>
                      </div>
                    )}

                    {cartPaymentMethod === "cartao" && (
                      <>
                        {!cartCardType ? (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setCartCardType("credito")} className="flex-1 py-1.5 rounded-lg border-2 text-xs font-medium border-border hover:border-primary/40">
                              Crédito
                            </button>
                            <button type="button" onClick={() => setCartCardType("debito")} className="flex-1 py-1.5 rounded-lg border-2 text-xs font-medium border-border hover:border-primary/40">
                              Débito
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-1.5">
                              {["Visa", "Mastercard", "Elo", "Hipercard", "Amex", "Outro"].map((brand) => (
                                <button key={brand} type="button" onClick={() => setCartCardBrand(brand)}
                                  className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-colors ${
                                    cartCardBrand === brand ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                                  }`}
                                >
                                  {brand}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {cartPaymentMethod === "pix" && storeProfile?.pix_key_1 && (
                      <div className="bg-white border border-green-200 rounded-lg p-3 flex flex-col items-center">
                        <QRCodeSVG
                          value={generatePixPayload({
                            key: storeProfile.pix_key_1,
                            amount: cartTotal.toFixed(2),
                            merchantName: storeProfile.store_name || "Loja",
                            merchantCity: storeProfile.city || "SAO PAULO",
                          })}
                          size={140}
                          level="M"
                          includeMargin={true}
                        />
                        <button
                          onClick={() => { navigator.clipboard.writeText(storeProfile.pix_key_1); toast.success("Chave Pix copiada!"); }}
                          className="mt-2 text-xs text-green-600 hover:underline"
                        >
                          📋 Copiar chave Pix
                        </button>
                      </div>
                    )}

                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Total: {formatCurrency(cartTotal)}</span>
                    {checkoutSent ? (
                      <span className="text-green-600 font-medium text-sm">✅ Pedido enviado!</span>
                    ) : (
                      <button
                        onClick={sendCartOrder}
                        disabled={sendingCart}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
                      >
                        <Send className="w-4 h-4" />
                        {sendingCart ? "Enviando..." : "Finalizar Compra"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
