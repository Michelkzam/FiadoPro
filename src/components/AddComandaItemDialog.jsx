import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { useActiveProducts } from "@/hooks/useQueries";
import { useComandaActions } from "@/hooks/useActions";
import { formatCurrency } from "@/lib/constants";

export default function AddComandaItemDialog({ comandaId, onClose }) {
  const { addItem, loading } = useComandaActions();
  const { data: products = [], isLoading: loadingProducts } = useActiveProducts();
  const [selectedProducts, setSelectedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState("");

  const groupedProducts = useMemo(() => {
    const groups = {};
    products.forEach((p) => {
      const cat = p.category || "Outros";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [products]);

  const selected = products.filter((p) => selectedProducts[p.id]);

  const total = selected.reduce((sum, p) => {
    const qty = quantities[p.id] || 1;
    return sum + (p.price || 0) * qty;
  }, 0);

  const toggleProduct = (pid) => {
    setSelectedProducts((prev) => ({ ...prev, [pid]: !prev[pid] }));
    if (!quantities[pid]) setQuantities((prev) => ({ ...prev, [pid]: 1 }));
  };

  const setQty = (pid, val) => {
    const v = Math.max(1, parseInt(val) || 1);
    setQuantities((prev) => ({ ...prev, [pid]: v }));
  };

  const handleSubmit = async () => {
    if (selected.length === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    for (const p of selected) {
      const qty = quantities[p.id] || 1;
      await addItem(comandaId, {
        product_id: p.id,
        product_name: p.name,
        quantity: qty,
        unit_price: p.price || 0,
        notes: notes.trim() || null,
      });
    }

    toast.success(`${selected.length} item(ns) adicionado(s)!`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Itens</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 py-2">
          {loadingProducts ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produto cadastrado
            </p>
          ) : (
            Object.entries(groupedProducts).map(([category, items]) => (
              <div key={category}>
                <div className="sticky top-0 bg-background/80 backdrop-blur-sm py-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{category}</p>
                </div>
                {items.map((p) => {
                  const checked = !!selectedProducts[p.id];
                  const qty = quantities[p.id] || 1;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors rounded-lg ${
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
            ))
          )}

          {selected.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: Sem cebola, ponto da carne..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-green-700">Total dos itens</span>
            <span className="text-lg font-bold text-green-700">{formatCurrency(total)}</span>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selected.length === 0}
            className="gap-2"
          >
            {loading ? "Adicionando..." : `Adicionar ${selected.length} item(ns)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
