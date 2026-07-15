import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Phone, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import BalanceBadge from "../components/BalanceBadge";
import CustomerSidePanel from "../components/CustomerSidePanel";
import LoadingSpinner from "../components/LoadingSpinner";
import db from "@/lib/db";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => db.entities.Customer.list(),
  });

  const filtered = useMemo(() => customers.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf?.includes(search) ||
      c.phone?.includes(search);
    const matchStatus =
      statusFilter === "todos" ||
      (statusFilter === "com_debito" && (c.balance || 0) > 0) ||
      (statusFilter === "sem_debito" && (c.balance || 0) <= 0) ||
      c.status === statusFilter;
    return matchSearch && matchStatus;
  }), [customers, search, statusFilter]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <Link to="/clientes/novo">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {[
          { value: "todos", label: "Todos" },
          { value: "com_debito", label: "Com Débito" },
          { value: "sem_debito", label: "Sem Débito" },
          { value: "ativo", label: "Ativos" },
          { value: "inativo", label: "Inativos" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium border transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            <Link to="/clientes/novo">
              <Button variant="outline" className="mt-3 gap-2">
                <Plus className="w-4 h-4" /> Cadastrar Cliente
              </Button>
            </Link>
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomerId(c.id)}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors w-full text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {c.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" /> {c.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <BalanceBadge balance={c.balance || 0} />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </div>

      {selectedCustomerId && (
        <CustomerSidePanel
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
}
