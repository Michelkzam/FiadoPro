import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardList, CheckCircle, XCircle, Plus, Truck, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import ApproveOrderDialog from "@/components/ApproveOrderDialog";
import NewOrderDialog from "@/components/NewOrderDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import db from "@/lib/db";
import { useOrders } from "@/hooks/useQueries";
import { useOrderActions } from "@/hooks/useActions";
import { formatCurrency, ORDER_STATUS, ORDER_STATUS_CONFIG } from "@/lib/constants";
import { notifyNewOrder } from "@/lib/notify";

const todayStr = () => new Date().toLocaleDateString("pt-BR");

export default function Orders() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("todos");
  const [approvingOrder, setApprovingOrder] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [dateFilter, setDateFilter] = useState(todayStr());
  const { approveOrder, updateOrderStatus } = useOrderActions();

  const { data: orders = [], isLoading } = useOrders();

  useEffect(() => {
    const unsubscribe = db.entities.Order.subscribe((event) => {
      if (event.type === "create") {
        toast.info(`Novo pedido de ${event.data?.customer_name || "cliente"}!`);
        if (event.data) {
          notifyNewOrder(event.data);
        }
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
    updateOrderStatus(order.id, newStatus, { name: order.customer_name, phone: order.customer_phone });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const filtered = useMemo(() => orders.filter((o) => {
    const orderDate = new Date(o.created_at).toLocaleDateString("pt-BR");
    const dateMatch = !dateFilter || orderDate === dateFilter;
    const statusMatch = filter === "todos" ? true : o.status === filter;
    return dateMatch && statusMatch;
  }), [orders, dateFilter, filter]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const pendentes = orders.filter((o) => o.status === ORDER_STATUS.PENDENTE).length;
  const isToday = dateFilter === todayStr();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Pedidos de Compra</h1>
          {pendentes > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-yellow-200">
              {pendentes} pendente{pendentes > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button className="gap-2" onClick={() => setShowNewOrder(true)}>
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
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
          className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${isToday ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}
        >
          Hoje
        </button>
        <button
          onClick={() => setDateFilter("")}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${!dateFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}
        >
          Todos os dias
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["todos", ORDER_STATUS.PENDENTE, ORDER_STATUS.APROVADO, ORDER_STATUS.SAIU_PARA_ENTREGA, ORDER_STATUS.FINALIZADO, ORDER_STATUS.RECUSADO].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:bg-muted"
            }`}
          >
            {f === "todos" ? "Todos" : ORDER_STATUS_CONFIG[f]?.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Data e Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Produtos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Situação</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((order) => {
                const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pendente;
                const createdAt = new Date(order.created_at);
                return (
                  <tr key={order.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      {order.customer_id ? (
                        <Link to={`/clientes/${order.customer_id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {order.customer_name}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{order.customer_name}</span>
                      )}
                      {order.table_number && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          <ClipboardList className="w-3 h-3" /> Mesa {order.table_number}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {createdAt.toLocaleDateString("pt-BR")} às {createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm text-foreground line-clamp-2">{order.description || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {order.amount > 0 ? formatCurrency(order.amount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {order.status === ORDER_STATUS.PENDENTE && (
                          <>
                            <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-xs" onClick={() => setApprovingOrder(order)}>
                              <CheckCircle className="w-3 h-3" /> Aprovar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => handleRejectOrder(order)}>
                              <XCircle className="w-3 h-3" /> Recusar
                            </Button>
                          </>
                        )}
                        {order.status === ORDER_STATUS.APROVADO && (
                          <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700 text-xs" onClick={() => handleUpdateStatus(order, ORDER_STATUS.SAIU_PARA_ENTREGA)}>
                            <Truck className="w-3 h-3" /> Saiu p/ Entrega
                          </Button>
                        )}
                        {order.status === ORDER_STATUS.SAIU_PARA_ENTREGA && (
                          <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => handleUpdateStatus(order, ORDER_STATUS.FINALIZADO)}>
                            <CheckCircle className="w-3 h-3" /> Finalizado
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
}
