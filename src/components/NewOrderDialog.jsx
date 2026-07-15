import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Minus, Plus, Store, Truck, Package, CreditCard, Smartphone, Banknote } from "lucide-react";
import db from "@/lib/db";
import { useCustomers, useActiveProducts } from "@/hooks/useQueries";
import { formatCurrency, SERVICE_TYPE, SERVICE_TYPE_CONFIG } from "@/lib/constants";

export default function NewOrderDialog({ onClose }) {
  const queryClient = useQueryClient();
  const [serviceType, setServiceType] = useState(SERVICE_TYPE.PRESENCIAL_RETIRADA);
  const [customerId, setCustomerId] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [observations, setObservations] = useState("");
  const [checkedProducts, setCheckedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cardType, setCardType] = useState("");
  const [cardBrand, setCardBrand] = useState("");

  const { data: customers = [] } = useCustomers();
  const { data: products = [], isLoading: loadingProducts } = useActiveProducts();
  const activeCustomers = customers.filter((c) => c.status !== "inativo");

  const isOnline = serviceType === SERVICE_TYPE.ONLINE_ENTREGA || serviceType === SERVICE_TYPE.ONLINE_RETIRADA;
  const isMesa = serviceType === SERVICE_TYPE.PRESENCIAL_MESA;

  const groupedProducts = useMemo(() => {
    const groups = {};
    products.forEach((p) => {
      const cat = p.category || "Outros";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [products]);

  const selectedProducts = products.filter((p) => checkedProducts[p.id]);

  const total = selectedProducts.reduce((sum, p) => {
    const qty = quantities[p.id] || 1;
    return sum + (p.price || 0) * qty;
  }, 0);

  const toggleProduct = (pid) => {
    setCheckedProducts((prev) => ({ ...prev, [pid]: !prev[pid] }));
    if (!quantities[pid]) setQuantities((prev) => ({ ...prev, [pid]: 1 }));
  };

  const setQty = (pid, val) => {
    const v = Math.max(1, parseInt(val) || 1);
    setQuantities((prev) => ({ ...prev, [pid]: v }));
  };

  const createOrder = useMutation({
    mutationFn: (data) => db.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pedido criado com sucesso!");
      onClose();
    },
  });

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const buildDescription = () => {
    const lines = selectedProducts.map((p) => {
      const qty = quantities[p.id] || 1;
      return `${qty}x ${p.name}`;
    });
    if (observations.trim()) {
      lines.push(`Obs: ${observations.trim()}`);
    }
    return lines.join(", ") || "Pedido";
  };

  const handleSubmit = () => {
    if (isMesa && !tableNumber.trim()) {
      toast.error("Informe o número da mesa");
      return;
    }
    if (!isMesa && !customerId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    if (isOnline && !paymentMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
    if (isOnline && paymentMethod === "cartao" && !cardType) {
      toast.error("Selecione débito ou crédito");
      return;
    }

    const customerName = isMesa
      ? `Mesa ${tableNumber.trim()}`
      : selectedCustomer?.name || "";

    createOrder.mutate({
      customer_id: isMesa ? null : customerId,
      customer_name: customerName,
      customer_phone: selectedCustomer?.phone || "",
      description: buildDescription(),
      amount: total,
      status: "pendente",
      service_type: serviceType,
      table_number: isMesa ? tableNumber.trim() : null,
      payment_method: isOnline ? paymentMethod : null,
      payment_card_type: isOnline && paymentMethod === "cartao" ? cardType : null,
      payment_card_brand: isOnline && paymentMethod === "cartao" ? cardBrand : null,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <Label>Tipo de Atendimento *</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: SERVICE_TYPE.PRESENCIAL_MESA, icon: Store, label: "Presencial", sub: "Mesa" },
                { type: SERVICE_TYPE.PRESENCIAL_RETIRADA, icon: Package, label: "Presencial", sub: "Retirada" },
                { type: SERVICE_TYPE.ONLINE_ENTREGA, icon: Truck, label: "Online", sub: "Entrega" },
                { type: SERVICE_TYPE.ONLINE_RETIRADA, icon: Package, label: "Online", sub: "Retirada" },
              ].map(({ type, icon: Icon, label, sub }) => {
                const cfg = SERVICE_TYPE_CONFIG[type];
                const active = serviceType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setServiceType(type)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-lg">{cfg.icon}</span>
                    <span className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                    <span className={`text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isMesa ? (
            <div className="space-y-1.5">
              <Label>Número da Mesa *</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 1, 2, 3..."
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="">Selecione um cliente...</option>
                {activeCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `- ${c.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Produtos</Label>
            {loadingProducts ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum produto cadastrado
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto rounded-lg border border-border">
                {Object.entries(groupedProducts).map(([category, items]) => (
                  <div key={category}>
                    <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-3 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{category}</p>
                    </div>
                    {items.map((p) => {
                      const checked = !!checkedProducts[p.id];
                      const qty = quantities[p.id] || 1;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-t border-border ${
                            checked ? "bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleProduct(p.id)}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProduct(p.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(p.price || 0)}</p>
                          </div>
                          {checked && (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setQty(p.id, qty - 1)}
                                className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-muted"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                              <button
                                type="button"
                                onClick={() => setQty(p.id, qty + 1)}
                                className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm hover:bg-primary/90"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-semibold text-primary ml-1 w-16 text-right">
                                {formatCurrency((p.price || 0) * qty)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              placeholder="Ex: Sem cebola, ponto da carne, etc..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
            />
          </div>

          {isOnline && (
            <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-semibold text-blue-700 uppercase">Forma de Pagamento *</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
                  { value: "pix", label: "Pix", icon: Smartphone },
                  { value: "cartao", label: "Cartão", icon: CreditCard },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setPaymentMethod(value); if (value !== "cartao") setCardType(""); }}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${
                      paymentMethod === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${paymentMethod === value ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${paymentMethod === value ? "text-primary" : "text-foreground"}`}>{label}</span>
                  </button>
                ))}
              </div>
              {paymentMethod === "cartao" && (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setCardType("credito"); setCardBrand(""); }}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        cardType === "credito"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCardType("debito"); setCardBrand(""); }}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        cardType === "debito"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      Débito
                    </button>
                  </div>
                  {cardType && (
                    <div className="space-y-1.5 mt-2">
                      <Label>Bandeira do Cartão *</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Visa", "Mastercard", "Elo", "Hipercard", "Amex", "Outro"].map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => setCardBrand(brand)}
                            className={`py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                              cardBrand === brand
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {total > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-green-700">Total Estimado</span>
              <span className="text-lg font-bold text-green-700">{formatCurrency(total)}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={createOrder.isPending || selectedProducts.length === 0}
            className="gap-2"
          >
            {createOrder.isPending ? "Criando..." : "Criar Pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
