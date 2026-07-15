import { useState, useRef, useMemo } from "react";
import { FileDown, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { subDays } from "date-fns";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCustomers, useAllTransactions } from "@/hooks/useQueries";
import { formatCurrency, parseDateBR, PERIODS } from "@/lib/constants";

export default function FinancialHistory() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(30);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const printRef = useRef();

  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: transactions = [], isLoading: loadingT } = useAllTransactions();

  const cutoff = subDays(new Date(), period);

  const filteredTx = useMemo(() => transactions.filter((t) => parseDateBR(t.date) >= cutoff), [transactions, cutoff]);

  const byCustomer = useMemo(() => filteredTx.reduce((acc, t) => {
    if (!acc[t.customer_id]) acc[t.customer_id] = [];
    acc[t.customer_id].push(t);
    return acc;
  }, {}), [filteredTx]);

  const customerRows = useMemo(() => customers
    .filter((c) => {
      const hasTx = byCustomer[c.id]?.length > 0;
      const matchSearch =
        !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.cpf?.includes(search) ||
        c.phone?.includes(search);
      return hasTx && matchSearch;
    })
    .map((c) => {
      const txs = (byCustomer[c.id] || []).sort((a, b) => parseDateBR(a.date) - parseDateBR(b.date));
      const totalCompras = txs.filter((t) => t.type === "compra").reduce((s, t) => s + (t.amount || 0), 0);
      const totalPagamentos = txs.filter((t) => t.type === "pagamento").reduce((s, t) => s + (t.amount || 0), 0);
      return { customer: c, txs, totalCompras, totalPagamentos };
    })
    .sort((a, b) => (b.customer.balance || 0) - (a.customer.balance || 0)), [customers, byCustomer, search]);

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Histórico Financeiro</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: bold; }
        h2 { margin: 16px 0 4px; font-size: 14px; }
        .compra { color: #dc2626; } .pagamento { color: #16a34a; }
        .summary { display: flex; gap: 24px; margin-bottom: 8px; font-size: 12px; }
        @media print { button { display: none; } }
      </style></head>
      <body>${printContents}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const isLoading = loadingC || loadingT;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Histórico Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">Movimentações por cliente em ordem cronológica</p>
        </div>
        <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2" disabled={isLoading}>
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriod(p.days)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                period === p.days
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : customerRows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Nenhuma movimentação encontrada no período</div>
      ) : (
        <div ref={printRef} className="space-y-3">
          {customerRows.map(({ customer, txs, totalCompras, totalPagamentos }) => {
            const isOpen = expandedCustomer === customer.id;
            return (
              <div key={customer.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedCustomer(isOpen ? null : customer.id)}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-sm shrink-0">
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{txs.length} movimentação{txs.length !== 1 ? "ões" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-4 text-sm">
                      <span className="text-red-600 font-medium">Compras: {formatCurrency(totalCompras)}</span>
                      <span className="text-green-600 font-medium">Pgtos: {formatCurrency(totalPagamentos)}</span>
                    </div>
                    <div className={`text-sm font-bold px-3 py-1 rounded-full ${(customer.balance || 0) > 0 ? "bg-red-50 text-red-700" : (customer.balance || 0) < 0 ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                      {(customer.balance || 0) < 0 ? `Crédito: ${formatCurrency(Math.abs(customer.balance))}` : formatCurrency(customer.balance || 0)}
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Data</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Tipo</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Descrição</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {txs.map((t) => (
                          <tr key={t.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{t.date}{t.time ? ` ${t.time}` : ""}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.type === "compra" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                                {t.type === "compra" ? "Compra" : "Pagamento"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{t.description || "—"}</td>
                            <td className={`px-4 py-2.5 text-right font-semibold ${t.type === "compra" ? "text-red-600" : "text-green-600"}`}>
                              {t.type === "compra" ? "-" : "+"}{formatCurrency(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/40">
                          <td colSpan={3} className="px-4 py-2 text-xs font-bold text-foreground">Saldo atual</td>
                          <td className={`px-4 py-2 text-right text-sm font-bold ${(customer.balance || 0) > 0 ? "text-red-600" : (customer.balance || 0) < 0 ? "text-blue-600" : "text-green-600"}`}>
                            {(customer.balance || 0) < 0 ? `Crédito: ${formatCurrency(Math.abs(customer.balance))}` : formatCurrency(customer.balance || 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
