import { useState } from "react";
import { formatCurrency, ORDER_STATUS_CONFIG } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { CreditCard, ChevronDown, ChevronUp, Package } from "lucide-react";

export default function PortalOrders({ orders, customer, storeProfile }) {
  const [expandedId, setExpandedId] = useState(null);

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Package className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-foreground">Nenhum pedido encontrado</p>
        <p className="text-xs text-muted-foreground mt-1">Faça seu primeiro pedido na aba Produtos</p>
      </div>
    );
  }

  const handlePay = (order) => {
    if (!storeProfile?.phone) return;
    const msg = `Olá! Sou ${customer.name} e gostaria de pagar o pedido: "${order.description}" no valor de ${formatCurrency(order.amount)}.`;
    sendWhatsApp(storeProfile.phone, msg);
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-foreground text-sm">Meus Pedidos</h2>
      {orders.map((order) => {
        const statusCfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pendente;
        const isExpanded = expandedId === order.id;
        return (
          <div key={order.id} className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : order.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="text-left min-w-0 flex-1 mr-3">
                <p className="text-sm font-medium text-foreground truncate">{order.description || "Pedido"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[11px] border px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                  {order.amount > 0 && (
                    <span className="text-[11px] text-muted-foreground">{formatCurrency(order.amount)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {["aprovado", "saiu_para_entrega"].includes(order.status) && order.amount > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePay(order); }}
                    className="flex items-center gap-1 text-[11px] bg-green-600 text-white px-3 py-1.5 rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <CreditCard className="w-3 h-3" /> Pagar
                  </button>
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
                {order.description && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">Descrição</p>
                    <p className="text-sm text-foreground">{order.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Valor</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(order.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Status</p>
                    <p className={`text-sm font-medium ${statusCfg.color.split(" ")[0]}`}>{statusCfg.label}</p>
                  </div>
                </div>
                {order.created_at && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">Data do pedido</p>
                    <p className="text-sm text-foreground">
                      {new Date(order.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
