import { useMemo } from "react";
import { formatCurrency, parseDateToTimestamp } from "@/lib/constants";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function PortalHistory({ transactions }) {
  const [expandedDate, setExpandedDate] = useState(null);

  const dailyStatement = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date));
    const byDate = sorted.reduce((acc, t) => {
      if (!acc[t.date]) acc[t.date] = [];
      acc[t.date].push(t);
      return acc;
    }, {});

    let running = 0;
    return Object.keys(byDate)
      .sort((a, b) => parseDateToTimestamp(a) - parseDateToTimestamp(b))
      .map((date) => {
        const prev = running;
        byDate[date].forEach((t) => {
          running += t.type === "compra" ? t.amount : -t.amount;
        });
        return { date, transactions: byDate[date], openBalance: prev, closeBalance: running };
      })
      .reverse();
  }, [transactions]);

  if (dailyStatement.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">📋</span>
        </div>
        <p className="text-sm font-medium text-foreground">Nenhuma movimentação</p>
        <p className="text-xs text-muted-foreground mt-1">Seu histórico aparecerá aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-foreground text-sm">Histórico Completo</h2>
      {dailyStatement.map(({ date, transactions: txs, openBalance, closeBalance }) => {
        const isExpanded = expandedDate === date;
        return (
          <div key={date} className="rounded-2xl border border-border overflow-hidden bg-card">
            <button
              onClick={() => setExpandedDate(isExpanded ? null : date)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Dia {date}</p>
                <p className="text-[11px] text-muted-foreground">{txs.length} movimentação{txs.length > 1 ? "ões" : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${closeBalance > 0 ? "text-red-600" : closeBalance < 0 ? "text-blue-600" : "text-green-600"}`}>
                  {closeBalance < 0 ? `+${formatCurrency(Math.abs(closeBalance))}` : formatCurrency(closeBalance)}
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-border">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                  <span className="text-xs text-muted-foreground">Saldo anterior</span>
                  <span className="text-xs font-medium">{formatCurrency(openBalance)}</span>
                </div>
                <div className="divide-y divide-border">
                  {txs.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${t.type === "compra" ? "bg-red-500" : "bg-green-500"}`} />
                          <span className={`text-sm font-medium ${t.type === "compra" ? "text-red-700" : "text-green-700"}`}>
                            {t.type === "compra" ? "Compra" : "Pagamento"}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-muted-foreground truncate ml-4 mt-0.5">{t.description}</p>
                        )}
                      </div>
                      <span className={`text-sm font-semibold ${t.type === "compra" ? "text-red-600" : "text-green-600"}`}>
                        {t.type === "compra" ? "+" : "-"} {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50">
                  <span className="text-xs font-bold text-foreground">Saldo do dia</span>
                  <span className={`text-xs font-bold ${closeBalance > 0 ? "text-red-600" : closeBalance < 0 ? "text-blue-600" : "text-green-600"}`}>
                    {closeBalance < 0 ? `Crédito: ${formatCurrency(Math.abs(closeBalance))}` : formatCurrency(closeBalance)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
