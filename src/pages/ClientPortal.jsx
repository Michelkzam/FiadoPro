import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, LogOut, ClipboardList, History, ShoppingBag, Package, Plus, Minus, Trash2, Send, CreditCard } from "lucide-react";
import BalanceBadge from "../components/BalanceBadge";
import db from "@/lib/db";
import { formatCurrency, openWhatsApp, parseDateToTimestamp } from "@/lib/constants";

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
  const [cardBrand, setCardBrand] = useState("");

  const normalize = (str) => str.replace(/\D/g, "");

  useEffect(() => {
    db.entities.StoreProfile.list().then((p) => { if (p[0]) setStoreProfile(p[0]); }).catch(() => {});
  }, []);

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
        setCustomer(found);
        const [txs, ords, prods] = await Promise.all([
          db.entities.Transaction.filter({ customer_id: found.id }, "-created_date", 200),
          db.entities.Order.filter({ customer_id: found.id }, "-created_date", 50),
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
    });
    setCart([]);
    setExtraRequest("");
    setCheckoutSent(true);
    setSendingCart(false);
    setTimeout(() => setCheckoutSent(false), 5000);
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

  const orderStatusConfig = {
    pendente: { label: "Aguardando aprovação", color: "text-amber-600 bg-amber-50 border-amber-200" },
    aprovado: { label: "✅ Aprovado", color: "text-blue-600 bg-blue-50 border-blue-200" },
    recusado: { label: "❌ Recusado", color: "text-red-600 bg-red-50 border-red-200" },
    saiu_para_entrega: { label: "🚚 Saiu para entrega", color: "text-purple-600 bg-purple-50 border-purple-200" },
    finalizado: { label: "✅ Finalizado", color: "text-green-600 bg-green-50 border-green-200" },
  };

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
        <button onClick={() => { setStep("login"); setCustomer(null); }} className="flex items-center gap-1 text-sm hover:bg-white/10 px-2 py-1 rounded">
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`flex items-center justify-center gap-2 border rounded-xl p-3 text-sm font-medium transition-colors ${showCardPayment ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  onClick={() => { setShowCardPayment(!showCardPayment); setShowPixPayment(false); }}
                >
                  <CreditCard className="w-4 h-4 text-blue-500" /> Cartão
                </button>
                <button
                  className={`flex items-center justify-center gap-2 border rounded-xl p-3 text-sm font-medium transition-colors ${showPixPayment ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  onClick={() => { setShowPixPayment(!showPixPayment); setShowCardPayment(false); }}
                >
                  <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/></svg>
                  Pix
                </button>
              </div>

              {showCardPayment && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-foreground">Selecione a bandeira do cartão:</p>
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
                      onClick={() => {
                        if (storeProfile?.phone) {
                          const msg = `Olá! Sou ${customer.name} e gostaria de pagar minha conta de ${formatCurrency(customer.balance || 0)} no cartão ${cardBrand}.`;
                          openWhatsApp(storeProfile.phone, msg);
                        }
                      }}
                    >
                      Confirmar pagamento com {cardBrand}
                    </button>
                  )}
                </div>
              )}

              {showPixPayment && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-foreground">Chaves Pix do estabelecimento:</p>
                  {storeProfile?.pix_key_1 ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
                      <p className="text-xs text-green-700 font-semibold">Chave Pix Principal</p>
                      <p className="text-sm font-mono font-bold text-green-800 break-all">{storeProfile.pix_key_1}</p>
                    </div>
                  ) : null}
                  {storeProfile?.pix_key_2 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
                      <p className="text-xs text-blue-700 font-semibold">Chave Pix Secundária</p>
                      <p className="text-sm font-mono font-bold text-blue-800 break-all">{storeProfile.pix_key_2}</p>
                    </div>
                  ) : null}
                  {!storeProfile?.pix_key_1 && !storeProfile?.pix_key_2 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Chaves Pix não cadastradas. Entre em contato com o estabelecimento.</p>
                  )}
                  <p className="text-xs text-muted-foreground text-center">Valor a pagar: <strong>{formatCurrency(customer.balance || 0)}</strong></p>
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
                  const statusCfg = orderStatusConfig[o.status] || orderStatusConfig.pendente;
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
                                openWhatsApp(storeProfile.phone, msg);
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
