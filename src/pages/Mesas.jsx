import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, Search, Users } from "lucide-react";
import { useComandas } from "@/hooks/useQueries";
import { formatCurrency, COMANDA_STATUS, COMANDA_STATUS_CONFIG } from "@/lib/constants";
import CreateComandaDialog from "@/components/CreateComandaDialog";
import ComandaDetail from "@/components/ComandaDetail";

export default function Mesas() {
  const queryClient = useQueryClient();
  const { data: comandas = [], isLoading } = useComandas();
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [selectedComanda, setSelectedComanda] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDefaultTable, setCreateDefaultTable] = useState("");

  const filtered = useMemo(() => {
    return comandas.filter((c) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        c.table_number?.toLowerCase().includes(s) ||
        c.label?.toLowerCase().includes(s) ||
        c.customer_name?.toLowerCase().includes(s)
      );
    });
  }, [comandas, search]);

  const tables = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const t = c.table_number || "S/M";
      if (!map[t]) map[t] = { number: t, comandas: [], total: 0, openCount: 0 };
      map[t].comandas.push(c);
      map[t].total += c.total || 0;
      if (c.status === COMANDA_STATUS.ABERTA) map[t].openCount++;
    });
    return Object.values(map).sort((a, b) => {
      const numA = parseInt(a.number) || 0;
      const numB = parseInt(b.number) || 0;
      return numA - numB;
    });
  }, [filtered]);

  const totalMesa = (mesa) => mesa.comandas.reduce((s, c) => s + (c.total || 0), 0);

  const openCreateForTable = (tableNumber) => {
    setCreateDefaultTable(tableNumber);
    setShowCreateDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Mesas</h1>
          {tables.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {tables.length} mesa(s) • {comandas.filter((c) => c.status === COMANDA_STATUS.ABERTA).length} comanda(s) aberta(s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mesa ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
          <Button className="gap-2" onClick={() => { setCreateDefaultTable(""); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4" /> Nova Comanda
          </Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma mesa aberta</p>
          <p className="text-xs text-muted-foreground mt-1">Crie uma comanda para iniciar</p>
          <Button className="mt-4 gap-2" onClick={() => { setCreateDefaultTable(""); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4" /> Nova Comanda
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map((mesa) => {
            const allPaid = mesa.comandas.every((c) => c.status === COMANDA_STATUS.PAGA);
            const hasOpen = mesa.openCount > 0;
            return (
              <button
                key={mesa.number}
                onClick={() => openCreateForTable(mesa.number)}
                className={`text-left p-4 rounded-xl border-2 shadow-sm transition-all ${
                  allPaid
                    ? "border-green-200 bg-green-50"
                    : hasOpen
                    ? "border-primary/40 bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-foreground">Mesa {mesa.number}</span>
                  {hasOpen && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {mesa.openCount}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {mesa.comandas.slice(0, 3).map((c) => {
                    const cfg = COMANDA_STATUS_CONFIG[c.status] || COMANDA_STATUS_CONFIG.aberta;
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{c.label}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                  {mesa.comandas.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{mesa.comandas.length - 3} mais</p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-border/50">
                  <span className="text-sm font-bold text-foreground">{formatCurrency(totalMesa(mesa))}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Mesa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Comandas</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Abertas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tables.map((mesa) => (
                <tr key={mesa.number} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-semibold text-foreground">Mesa {mesa.number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{mesa.comandas.length}</td>
                  <td className="px-4 py-3 text-center">
                    {mesa.openCount > 0 ? (
                      <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                        {mesa.openCount}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    {formatCurrency(totalMesa(mesa))}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => openCreateForTable(mesa.number)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tables.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h2 className="font-semibold text-foreground mb-3">Todas as Comandas</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map((c) => {
              const cfg = COMANDA_STATUS_CONFIG[c.status] || COMANDA_STATUS_CONFIG.aberta;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedComanda(c)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {c.table_number}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground truncate">{c.label}</p>
                      <p className="text-xs text-muted-foreground">Mesa {c.table_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-foreground">{formatCurrency(c.total || 0)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCreateDialog && (
        <CreateComandaDialog
          defaultTable={createDefaultTable}
          onClose={() => {
            setShowCreateDialog(false);
            setCreateDefaultTable("");
          }}
        />
      )}

      {selectedComanda && (
        <ComandaDetail
          comanda={selectedComanda}
          onClose={() => setSelectedComanda(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["comandas"] });
          }}
        />
      )}
    </div>
  );
}
