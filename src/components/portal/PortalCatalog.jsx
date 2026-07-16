import { useState, useMemo, useCallback } from "react";
import { Search, Plus, Minus, Trash2, Send, CreditCard, Smartphone, Banknote, X, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { QRCodeSVG } from "qrcode.react";
import { generatePixPayload } from "@/utils/pixUtils";

export default function PortalCatalog({ products, cart, setCart, storeProfile, customer, onCheckout, sending, checkoutSent }) {
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cardType, setCardType] = useState("");
  const [cardBrand, setCardBrand] = useState("");
  const [useCredit, setUseCredit] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, p) => {
      const cat = p.category || "Cardápio";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [filtered]);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  }, [setCart]);

  const changeQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0)
    );
  }, [setCart]);

  const removeFromCart = useCallback((id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, [setCart]);

  const handleCheckout = () => {
    onCheckout({ paymentMethod, cardType, cardBrand, useCredit });
    setPaymentMethod("");
    setCardType("");
    setCardBrand("");
    setUseCredit(false);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Products */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{cat}</h3>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {items.map((p) => {
              const cartItem = cart.find((i) => i.id === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-muted-foreground/40">IMG</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                    <p className="text-sm font-bold text-primary mt-0.5">{formatCurrency(p.price)}</p>
                  </div>
                  <div className="shrink-0">
                    {cartItem ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => changeQty(p.id, -1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{cartItem.qty}</span>
                        <button onClick={() => changeQty(p.id, 1)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p)} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-10">
          <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      )}

      {/* Cart Bottom Sheet */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl z-30 p-4">
          <div className="max-w-lg mx-auto space-y-3">
            {/* Cart Items */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {cart.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-xs py-1">
                  <span className="text-foreground">{i.qty}x {i.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{formatCurrency(i.price * i.qty)}</span>
                    <button onClick={() => removeFromCart(i.id)} className="p-1">
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Method */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Pagamento *</p>
              <div className="flex gap-2">
                {[
                  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
                  { value: "pix", label: "Pix", icon: Smartphone },
                  { value: "cartao", label: "Cartão", icon: CreditCard },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => { setPaymentMethod(value); setCardType(""); setCardBrand(""); setUseCredit(false); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      paymentMethod === value ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              {/* Credit option */}
              {paymentMethod === "dinheiro" && (customer?.credit_limit || 0) > 0 && (
                <button
                  onClick={() => setUseCredit(!useCredit)}
                  className={`w-full py-2 rounded-xl text-xs font-medium transition-all ${
                    useCredit ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  }`}
                >
                  {useCredit ? "✓ Usando Crédito da Conta" : "Usar Crédito da Conta"}
                </button>
              )}

              {/* Card type */}
              {paymentMethod === "cartao" && !cardType && (
                <div className="flex gap-2">
                  <button onClick={() => setCardType("credito")} className="flex-1 py-2 rounded-xl border-2 text-xs font-medium border-border hover:border-primary/40">Crédito</button>
                  <button onClick={() => setCardType("debito")} className="flex-1 py-2 rounded-xl border-2 text-xs font-medium border-border hover:border-primary/40">Débito</button>
                </div>
              )}

              {/* Card brand */}
              {paymentMethod === "cartao" && cardType && (
                <div className="grid grid-cols-3 gap-1.5">
                  {["Visa", "Mastercard", "Elo", "Hipercard", "Amex", "Outro"].map((brand) => (
                    <button key={brand} onClick={() => setCardBrand(brand)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-all ${
                        cardBrand === brand ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                      }`}>
                      {brand}
                    </button>
                  ))}
                </div>
              )}

              {/* Pix QR in cart */}
              {paymentMethod === "pix" && storeProfile?.pix_key_1 && (
                <div className="bg-white dark:bg-gray-900 border border-green-200 rounded-xl p-3 flex flex-col items-center">
                  <QRCodeSVG
                    value={generatePixPayload({
                      key: storeProfile.pix_key_1,
                      amount: cartTotal.toFixed(2),
                      merchantName: storeProfile.store_name || "Loja",
                      merchantCity: storeProfile.city || "SAO PAULO",
                    })}
                    size={120}
                    level="M"
                    includeMargin
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(storeProfile.pix_key_1); }}
                    className="mt-2 text-[11px] text-green-600 hover:underline font-medium"
                  >
                    Copiar chave Pix
                  </button>
                </div>
              )}
            </div>

            {/* Total & Submit */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(cartTotal)}</p>
              </div>
              {checkoutSent ? (
                <span className="text-green-600 font-medium text-sm">✅ Enviado!</span>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={sending || !paymentMethod}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Enviando..." : "Finalizar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
