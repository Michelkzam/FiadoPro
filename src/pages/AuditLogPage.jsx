import { useState, useMemo } from "react";
import { Shield, User, Edit, Trash2, DollarSign, ShoppingCart, LogIn, Filter } from "lucide-react";
import { useAuditLog } from "@/hooks/useReports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACTION_ICONS = {
  create: { icon: ShoppingCart, color: "text-green-600 bg-green-50" },
  update: { icon: Edit, color: "text-blue-600 bg-blue-50" },
  delete: { icon: Trash2, color: "text-red-600 bg-red-50" },
  login: { icon: LogIn, color: "text-purple-600 bg-purple-50" },
  payment: { icon: DollarSign, color: "text-amber-600 bg-amber-50" },
  reversal: { icon: Shield, color: "text-orange-600 bg-orange-50" },
};

const ENTITY_LABELS = {
  customer: "Cliente",
  transaction: "Transação",
  order: "Pedido",
  product: "Produto",
  comanda: "Comanda",
  coupon: "Cupom",
  store_profile: "Perfil da Loja",
};

export default function AuditLogPage() {
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const filters = useMemo(() => {
    const f = {};
    if (entityFilter !== "all") f.entity_type = entityFilter;
    if (actionFilter !== "all") f.action = actionFilter;
    return f;
  }, [entityFilter, actionFilter]);

  const { data: logs = [], isLoading } = useAuditLog(filters);

  const getIcon = (action) => {
    const key = Object.keys(ACTION_ICONS).find((k) => action?.toLowerCase().includes(k));
    return ACTION_ICONS[key] || ACTION_ICONS.update;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Log de Auditoria</h1>
        <p className="text-sm text-muted-foreground">Histórico de todas as ações realizadas no sistema</p>
      </div>

      <div className="flex gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="create">Criação</SelectItem>
            <SelectItem value="update">Atualização</SelectItem>
            <SelectItem value="delete">Exclusão</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="payment">Pagamento</SelectItem>
            <SelectItem value="reversal">Estorno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum registro de auditoria</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const { icon: Icon, color } = getIcon(log.action);
            return (
              <div key={log.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        <span className="capitalize">{log.action}</span>
                        {" • "}
                        {ENTITY_LABELS[log.entity_type] || log.entity_type}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {log.user_email && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <User className="w-3 h-3 inline mr-1" /> {log.user_email}
                      </p>
                    )}
                    {log.old_data && log.new_data && (
                      <div className="mt-2 text-xs bg-muted/50 rounded-lg p-2 font-mono">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-red-600 font-medium">Antes:</span>
                            <pre className="text-muted-foreground truncate">{JSON.stringify(log.old_data, null, 0).slice(0, 200)}</pre>
                          </div>
                          <div>
                            <span className="text-green-600 font-medium">Depois:</span>
                            <pre className="text-muted-foreground truncate">{JSON.stringify(log.new_data, null, 0).slice(0, 200)}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
