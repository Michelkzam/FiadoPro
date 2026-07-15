import { ShoppingBag, ImageIcon } from "lucide-react";
import { useActiveProducts } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/constants";

export default function PortalProductsTab() {
  const { data: products = [], isLoading } = useActiveProducts();

  const grouped = products.reduce((acc, p) => {
    const cat = p.category || "Cardápio";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  if (isLoading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (products.length === 0) return (
    <div className="text-center py-10 text-muted-foreground text-sm">
      <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
      Nenhum produto disponível no momento.
    </div>
  );

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</h3>
          <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                </div>
                <span className="text-sm font-bold text-primary shrink-0">{formatCurrency(p.price)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
