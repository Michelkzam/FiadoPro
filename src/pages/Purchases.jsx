import { ShoppingCart, Banknote, Search, FileText, CreditCard, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import CustomerStatementDialog from "../components/CustomerStatementDialog";
import PaymentDialog from "../components/PaymentDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCustomers } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/constants";

export default function Purchases() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [rangeFilter, setRangeFilter] = useState("todos");
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [paymentCustomer, setPaymentCustomer] = useState(null);

  const { data: customers = [], isLoading } = useCustomers();

  const debtors = useMemo(() => customers.filter((c) => (c.balance || 0) > 0), [customers]);
  const filtered = useMemo(() => debtors.filter((c) => {
    const matchSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const b = c.balance || 0;
    const matchRange =
      rangeFilter === "todos" ||
      (rangeFilter === "ate100" && b <= 100) ||
      (rangeFilter === "100a500" && b > 100 && b <= 500) ||
      (rangeFilter === "acima500" && b > 500);
    return matchSearch && matchRange;
  }), [debtors, search, rangeFilter]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Compras / Cobranças</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <ShoppingCart className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-red-700">
            {formatCurrency(debtors.reduce((s, c) => s + (c.balance || 0), 0))}
          </p>
          <p className="text-xs text-red-500">Total a Receber</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <Banknote className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-blue-700">{debtors.length}</p>
          <p className="text-xs text-blue-500">Clientes com Débito</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {[
          { value: "todos", label: "Todos" },
          { value: "ate100", label: "Até R$ 100" },
          { value: "100a500", label: "R$ 100 – 500" },
          { value: "acima500", label: "Acima de R$ 500" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setRangeFilter(f.value)}
            className={`px-3 py-1 text-xs rounded-full font-medium border transition-colors ${
              rangeFilter === f.value
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
          <p className="p-8 text-center text-muted-foreground">Nenhum cliente com débito encontrado</p>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-sm text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                  {formatCurrency(c.balance)}
                </span>
                <button
                  onClick={() => setPaymentCustomer(c)}
                  className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Pagar
                </button>
                <button
                  onClick={() => setStatementCustomer(c)}
                  className="flex items-center gap-1 text-xs bg-primary text-white px-2.5 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Extrato
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {statementCustomer && (
        <CustomerStatementDialog
          customer={statementCustomer}
          onClose={() => setStatementCustomer(null)}
        />
      )}

      {paymentCustomer && (
        <PaymentDialog
          customer={paymentCustomer}
          onClose={() => setPaymentCustomer(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setPaymentCustomer(null);
          }}
        />
      )}
    </div>
  );
}
