import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useState, useMemo } from "react";
import { subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import db from "@/lib/db";
import { formatCurrency, parseDateBR } from "@/lib/constants";

const PERIODS = [
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "120 dias", days: 120 },
];

export default function CustomerStatementDialog({ customer, onClose }) {
  const [period, setPeriod] = useState(30);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", customer.id],
    queryFn: () => db.entities.Transaction.filter({ customer_id: customer.id }, "date", 500),
  });

  const cutoffDate = subDays(new Date(), period);

  const filtered = useMemo(() => transactions.filter((t) => {
    if (!t.date) return false;
    return parseDateBR(t.date) >= cutoffDate;
  }), [transactions, cutoffDate]);

  const grouped = useMemo(() => filtered.reduce((acc, t) => {
    const key = t.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {}), [filtered]);

  const sortedDates = useMemo(() => Object.keys(grouped).sort((a, b) => parseDateBR(a) - parseDateBR(b)), [grouped]);

  const dailyRows = useMemo(() => {
    const allSorted = [...transactions].sort((a, b) => parseDateBR(a.date) - parseDateBR(b.date));
    let openingBalance = 0;
    allSorted.forEach((t) => {
      const txDate = parseDateBR(t.date);
      if (txDate < cutoffDate) {
        if (t.type === "compra") openingBalance += t.amount;
        else openingBalance -= t.amount;
      }
    });

    const rows = [];
    let runningBalance = openingBalance;
    sortedDates.forEach((date) => {
      const dayTx = grouped[date];
      const prevBalance = runningBalance;
      dayTx.forEach((t) => {
        if (t.type === "compra") runningBalance += t.amount;
        else runningBalance -= t.amount;
      });
      rows.push({ date, transactions: dayTx, openBalance: prevBalance, closeBalance: runningBalance });
    });
    return rows;
  }, [transactions, cutoffDate, sortedDates, grouped]);

  const handlePrint = () => window.print();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Extrato — {customer.name}</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handlePrint} title="Imprimir">
              <Printer className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Últimos {period} dias</p>
        </DialogHeader>

        <div className="flex gap-2 shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
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

        <div className="overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : dailyRows.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">Nenhuma movimentação no período</p>
          ) : (
            dailyRows.map(({ date, transactions: txs, openBalance, closeBalance }) => (
              <div key={date} className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2">
                  <span className="font-semibold text-sm text-foreground">Dia {date}</span>
                </div>
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">Saldo anterior</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(openBalance)}</span>
                  </div>
                  {txs.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <span className={`text-sm font-medium ${t.type === "compra" ? "text-red-700" : "text-green-700"}`}>
                          {t.type === "compra" ? "Compra" : "Pagamento"}
                        </span>
                        {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      </div>
                      <span className={`text-sm font-semibold ${t.type === "compra" ? "text-red-600" : "text-green-600"}`}>
                        {t.type === "compra" ? "+" : "-"} {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                    <span className="text-sm font-bold text-foreground">Saldo</span>
                    <span className={`text-sm font-bold ${closeBalance > 0 ? "text-red-600" : closeBalance < 0 ? "text-blue-600" : "text-green-600"}`}>
                      {closeBalance < 0 ? `Crédito: ${formatCurrency(Math.abs(closeBalance))}` : formatCurrency(closeBalance)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 flex items-center justify-between bg-muted/20 rounded-lg p-3">
          <span className="text-sm text-muted-foreground">Saldo atual</span>
          <span className={`font-bold text-base ${(customer.balance || 0) > 0 ? "text-red-600" : (customer.balance || 0) < 0 ? "text-blue-600" : "text-green-600"}`}>
            {(customer.balance || 0) < 0 ? `Crédito: ${formatCurrency(Math.abs(customer.balance))}` : formatCurrency(customer.balance || 0)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
