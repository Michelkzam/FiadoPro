import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Send, CheckCircle, Plus, Trash2 } from "lucide-react";
import { useActiveProducts } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/constants";

function parseOrderItems(description) {
  if (!description) return {};
  const items = {};
  const regex = /(\d+)x\s+(.+?)(?:\s*\(|$)/gi;
  let match;
  while ((match = regex.exec(description)) !== null) {
    const qty = parseInt(match[1]) || 1;
    const name = match[2].trim().toLowerCase();
    items[name] = qty;
  }
  return items;
}

function matchProductName(orderName, productName) {
  return productName.toLowerCase().includes(orderName) || orderName.includes(productName.toLowerCase());
}

export default function ApproveOrderDialog({ order, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const [checkedProducts, setCheckedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [extraItems, setExtraItems] = useState([]);

  const { data: products = [], isLoading } = useActiveProducts();

  useEffect(() => {
    if (products.length > 0 && order?.description) {
      const parsed = parseOrderItems(order.description);
      const newChecked = {};
      const newQty = {};

      products.forEach((p) => {
        for (const [orderName, orderQty] of Object.entries(parsed)) {
          if (matchProductName(orderName, p.name)) {
            newChecked[p.id] = true;
            newQty[p.id] = orderQty;
            break;
          }
        }
      });

      setCheckedProducts(newChecked);
      setQuantities(newQty);
    }
  }, [products, order?.description]);

  const toggleProduct = (pid) => {
    setCheckedProducts((prev) => ({ ...prev, [pid]: !prev[pid] }));
    if (!quantities[pid]) setQuantities((prev) => ({ ...prev, [pid]: 1 }));
  };

  const setQty = (pid, val) => {
    const v = Math.max(1, parseInt(val) || 1);
    setQuantities((prev) => ({ ...prev, [pid]: v }));
  };

  const addExtra = () => setExtraItems((prev) => [...prev, { description: "", quantity: 1, unit_price: "" }]);
  const removeExtra = (i) => setExtraItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateExtra = (i, field, value) => {
    const updated = [...extraItems];
    updated[i] = { ...updated[i], [field]: value };
    setExtraItems(updated);
  };

  const selectedProducts = products.filter((p) => checkedProducts[p.id]);

  const productTotal = selectedProducts.reduce((sum, p) => {
    const qty = quantities[p.id] || 1;
    return sum + (p.price || 0) * qty;
  }, 0);

  const extraTotal = extraItems.reduce((sum, item) => {
    return sum + (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0);
  }, 0);

  const total = productTotal + extraTotal;

  const handleConfirm = async () => {
    if (total <= 0) return;
    setLoading(true);

    const productLines = selectedProducts
      .map((p) => {
        const qty = quantities[p.id] || 1;
        return `• ${p.name} (${qty}x) — ${formatCurrency((p.price || 0) * qty)}`;
      })
      .join("\n");

    const extraLines = extraItems
      .filter((it) => it.description && parseFloat(it.unit_price) > 0)
      .map((it) => `• ${it.description} (${parseInt(it.quantity) || 1}x) — ${formatCurrency(parseFloat(it.unit_price) * (parseInt(it.quantity) || 1))}`)
      .join("\n");

    const itemLines = [productLines, extraLines].filter(Boolean).join("\n");

    await onConfirm({ total, itemLines });
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Aprovar Pedido — {order?.customer_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Solicitação do cliente:</p>
            <p className="text-sm text-foreground bg-muted rounded-lg p-3">{order?.description || "—"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Selecione os produtos entregues:</p>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum produto cadastrado</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-border">
                {products.map((p) => {
                  const checked = !!checkedProducts[p.id];
                  const qty = quantities[p.id] || 1;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? "bg-green-50" : "hover:bg-muted/50"}`}
                      onClick={() => toggleProduct(p.id)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProduct(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-green-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(p.price || 0)} / un.</p>
                      </div>
                      {checked && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setQty(p.id, Math.max(1, qty - 1))}
                            className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-muted"
                          >-</button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(p.id, qty + 1)}
                            className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm hover:bg-primary/90"
                          >+</button>
                          <span className="text-xs font-semibold text-green-700 ml-1 w-16 text-right">{formatCurrency((p.price || 0) * qty)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Itens adicionais (não cadastrados):</p>
              <button onClick={addExtra} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {extraItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <Input
                  placeholder="Descrição"
                  value={item.description}
                  onChange={(e) => updateExtra(i, "description", e.target.value)}
                  className="flex-1 text-sm"
                />
                <Input
                  type="number" min="1" placeholder="Qtd"
                  value={item.quantity}
                  onChange={(e) => updateExtra(i, "quantity", e.target.value)}
                  className="w-16 text-sm"
                />
                <Input
                  type="number" min="0" step="0.01" placeholder="R$"
                  value={item.unit_price}
                  onChange={(e) => updateExtra(i, "unit_price", e.target.value)}
                  className="w-24 text-sm"
                />
                <button onClick={() => removeExtra(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {total > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-bold text-green-700">Total da compra: {formatCurrency(total)}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            className="gap-2 bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={loading || total <= 0}
          >
            <Send className="w-4 h-4" />
            {loading ? "Aprovando..." : "Aprovar e Notificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
