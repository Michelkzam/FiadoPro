import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle, XCircle, Plus, Truck, Calendar, CreditCard, Smartphone, AlertTriangle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import ApproveOrderDialog from "@/components/ApproveOrderDialog";
import NewOrderDialog from "@/components/NewOrderDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import db from "@/lib/db";
import { useOrders } from "@/hooks/useQueries";
import { useOrderActions } from "@/hooks/useActions";
import { formatCurrency, ORDER_STATUS, ORDER_STATUS_CONFIG, SERVICE_TYPE, SERVICE_TYPE_CONFIG } from "@/lib/constants";
import { notifyNewOrder } from "@/lib/notify";

const todayStr = () => new Date().toLocaleDateString("pt-BR");

const PAYMENT_CONFIG = {
  dinheiro: { label: "Dinheiro", icon: Banknote, color: "text-green-600" },
  pix: { label: "Pix", icon: Smartphone, color: "text-blue-600" },
  cartao: { label: "Cartão", icon: CreditCard, color: "text-purple-600" },
};

const CARD_TYPE_LABELS = { credito: "Crédito", debito: "Débito" };

const STATUS_FLOW = {
  [ORDER_STATUS.PENDENTE]: { next: null, action: "Aprovar" },
  [ORDER_STATUS.APROVADO]: { next: ORDER_STATUS.SAIU_PARA_ENTREGA, action: "Saiu p/ Entrega" },
  [ORDER_STATUS.SAIU_PARA_ENTREGA]: { next: ORDER_STATUS.FINALIZADO, action: "Finalizar" },
};

export default function Orders() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("todos");
  const [serviceFilter, setServiceFilter] = useState("todos");
  const [approvingOrder, setApprovingOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [cardReminder, setCardReminder] = useState(null);
  const { approveOrder, updateOrderStatus } = useOrderActions();

  const { data: orders = [], isLoading } = useOrders();

  useEffect(() => {
    const unsubscribe = db.entities.Order.subscribe((event) => {
      if (event.type === "create") {
        toast.info(`Novo pedido de ${event.data?.customer_name || "cliente"}!`);
        if (event.data) notifyNewOrder(event.data);
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const handleApproveOrder = async (order, data) => {
    const success = await approveOrder(order, data);
    if (success) {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setApprovingOrder(null);
      toast.success("Compra registrada e cliente notificado!");
    }
  };

  const handleRejectOrder = (order) => {
    updateOrderStatus(order.id, ORDER_STATUS.RECUSADO, { name: order.customer_name, phone: order.customer_phone });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const handleUpdateStatus = (order, newStatus) => {
    if (newStatus === ORDER_STATUS.SAIU_PARA_ENTREGA && order.payment_method === "cartao") {
      setCardReminder(order);
      return;
    }
    updateOrderStatus(order.id, newStatus, { name: order.customer_name, phone: order.customer_phone });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const confirmCardReminder = () => {
    if (cardReminder) {
      updateOrderStatus(cardReminder.id, ORDER_STATUS.SAIU_PARA_ENTREGA, { name: cardReminder.customer_name, phone: cardReminder.customer_phone });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setCardReminder(null);
    }
  };

  const onlineOrders = useMemo(() => orders.filter((o) =>
    o.service_type === SERVICE_TYPE.ONLINE_ENTREGA || o.service_type === SERVICE_TYPE.ONLINE_RETIRADA
  ), [orders]);

  const filtered = useMemo(() => onlineOrders.filter((o) => {
    const orderDate = new Date(o.created_at).toLocaleDateString("pt-BR");
    const dateMatch = !dateFilter || orderDate === dateFilter;
    const statusMatch = filter === "todos" ? true : o.status === filter;
    const serviceMatch = serviceFilter === "todos" ? true : o.service_type === serviceFilter;
    return dateMatch && statusMatch && serviceMatch;
  }), [onlineOrders, dateFilter, filter, serviceFilter]);

  const counts = useMemo(() => ({
    todos: onlineOrders.length,
    pendente: onlineOrders.filter((o) => o.status === ORDER_STATUS.PENDENTE).length,
    aprovado: onlineOrders.filter((o) => o.status === ORDER_STATUS.APROVADO).length,
    saiu_para_entrega: onlineOrders.filter((o) => o.status === ORDER_STATUS.SAIU_PARA_ENTREGA).length,
    finalizado: onlineOrders.filter((o) => o.status === ORDER_STATUS.FINALIZADO).length,
    recusado: onlineOrders.filter((o) => o.status === ORDER_STATUS.RECUSADO).length,
    entrega: onlineOrders.filter((o) => o.service_type === SERVICE_TYPE.ONLINE_ENTREGA).length,
    retirada: onlineOrders.filter((o) => o.service_type === SERVICE_TYPE.ONLINE_RETIRADA).length,
  }), [onlineOrders]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedidos Online</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Entrega e Retirada</p>
        </div>
        <Button className="gap-2" onClick={() => setShowNewOrder(true)}>
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
      </div>

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {[
          { type: "todos", label: "Todos", count: counts.todos, activeBg: "bg-primary/10", color: "border-primary text-primary" },
          { type: SERVICE_TYPE.ONLINE_ENTREGA, label: "🚚 Entrega", count: counts.entrega, activeBg: "bg-blue-50", color: "border-blue-500 text-blue-600" },
          { type: SERVICE_TYPE.ONLINE_RETIRADA, label: "📦 Retirada", count: counts.retirada, activeBg: "bg-teal-50", color: "border-teal-500 text-teal-600" },
        ].map(({ type, label, count, color, activeBg }) => {
          const active = serviceFilter === type;
          return (
            <button
              key={type}
              onClick={() => setServiceFilter(type)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? `${activeBg} ${color} border-b-2 -mb-[1px]`
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/80" : "bg-muted"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="DD/MM/AAAA"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-sm w-28 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            maxLength={10}
          />
        </div>
        <button
          onClick={() => setDateFilter(todayStr())}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${dateFilter === todayStr() ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}
        >
          Hoje
        </button>
        <button
          onClick={() => setDateFilter("")}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${!dateFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}
        >
          Todos
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        {[
          { key: "todos", label: "Todos", count: counts.todos },
          { key: ORDER_STATUS.PENDENTE, label: "Pendente", count: counts.pendente },
          { key: ORDER_STATUS.APROVADO, label: "Aprovado", count: counts.aprovado },
          { key: ORDER_STATUS.SAIU_PARA_ENTREGA, label: "Saiu p/ Entrega", count: counts.saiu_para_entrega },
          { key: ORDER_STATUS.FINALIZADO, label: "Finalizado", count: counts.finalizado },
          { key: ORDER_STATUS.RECUSADO, label: "Recusado", count: counts.recusado },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors flex items-center gap-1.5 ${
              filter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${filter === key ? "bg-white/20" : "bg-muted"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum pedido encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros ou crie um novo pedido</p>
          </div>
        ) : (
          filtered.map((order) => {
            const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pendente;
            const serviceCfg = SERVICE_TYPE_CONFIG[order.service_type] || SERVICE_TYPE_CONFIG.online_entrega;
            const payCfg = PAYMENT_CONFIG[order.payment_method];
            const createdAt = new Date(order.created_at);
            const flow = STATUS_FLOW[order.status];

            return (
              <div key={order.id} className="bg-card rounded-xl border border-border shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {order.customer_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      {order.customer_id ? (
                        <Link to={`/clientes/${order.customer_id}`} className="font-semibold text-foreground hover:text-primary transition-colors block truncate">
                          {order.customer_name}
                        </Link>
                      ) : (
                        <p className="font-semibold text-foreground truncate">{order.customer_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {createdAt.toLocaleDateString("pt-BR")} às {createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 mb-3">
                  <p className="text-sm text-foreground">{order.description || "Sem descrição"}</p>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 font-medium ${serviceCfg.color?.split(" ")[0]}`}>
                      {serviceCfg.icon} {serviceCfg.label}
                    </span>
                    {payCfg && (
                      <span className="inline-flex items-center gap-1">
                        <payCfg.icon className={`w-3 h-3 ${payCfg.color}`} />
                        {payCfg.label}
                        {order.payment_card_type && ` ${CARD_TYPE_LABELS[order.payment_card_type]}`}
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-foreground">{formatCurrency(order.amount)}</span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  {order.status === ORDER_STATUS.PENDENTE && (
                    <>
                      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-xs flex-1" onClick={() => setApprovingOrder(order)}>
                        <CheckCircle className="w-3 h-3" /> Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => handleRejectOrder(order)}>
                        <XCircle className="w-3 h-3" /> Recusar
                      </Button>
                    </>
                  )}
                  {flow?.next && order.status !== ORDER_STATUS.PENDENTE && (
                    <Button
                      size="sm"
                      className="gap-1 text-xs flex-1 bg-primary hover:bg-primary/90"
                      onClick={() => handleUpdateStatus(order, flow.next)}
                    >
                      {flow.next === ORDER_STATUS.SAIU_PARA_ENTREGA ? <Truck className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                      {flow.action}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                  {order.status === ORDER_STATUS.FINALIZADO && (
                    <span className="text-xs text-green-600 font-medium">✓ Pedido finalizado</span>
                  )}
                  {order.status === ORDER_STATUS.RECUSADO && (
                    <span className="text-xs text-destructive font-medium">✗ Pedido recusado</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {approvingOrder && (
        <ApproveOrderDialog
          order={approvingOrder}
          onConfirm={(data) => handleApproveOrder(approvingOrder, data)}
          onClose={() => setApprovingOrder(null)}
        />
      )}

      {showNewOrder && <NewOrderDialog onClose={() => setShowNewOrder(false)} />}

      {cardReminder && (
        <Dialog open onOpenChange={() => setCardReminder(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                Lembrete!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-foreground">
                Este pedido é pagamento no <strong>cartão de crédito/débito</strong>.
              </p>
              <p className="text-sm font-medium text-amber-600">
                ⚡ Lembre-se de levar a <strong>máquininha</strong> para o cliente efetuar o pagamento!
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p><strong>Cliente:</strong> {cardReminder.customer_name}</p>
                <p><strong>Valor:</strong> {formatCurrency(cardReminder.amount)}</p>
                <p><strong>Pagamento:</strong> Cartão {CARD_TYPE_LABELS[cardReminder.payment_card_type] || ""}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCardReminder(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={confirmCardReminder} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
                <Truck className="w-4 h-4" /> Confirmar Saída
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
