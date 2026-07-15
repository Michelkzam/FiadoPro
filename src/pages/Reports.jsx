import { FileText, Download, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { downloadReportPDF } from "../utils/pdfUtils";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { useCustomers, useTransactions } from "@/hooks/useQueries";
import { formatCurrency, parseDateBR } from "@/lib/constants";

export default function Reports() {
  const { data: customers = [], isLoading: lc } = useCustomers();
  const { data: transactions = [], isLoading: lt } = useTransactions();

  const debtors = useMemo(() => customers
    .filter((c) => (c.balance || 0) > 0)
    .sort((a, b) => (b.balance || 0) - (a.balance || 0)), [customers]);

  const creditCustomers = useMemo(() => customers
    .filter((c) => (c.balance || 0) < 0)
    .sort((a, b) => (a.balance || 0) - (b.balance || 0)), [customers]);

  const limitExceeded = useMemo(() => customers.filter(
    (c) => (c.credit_limit || 0) > 0 && (c.balance || 0) > (c.credit_limit || 0)
  ), [customers]);

  const getTransactions = (cid) => transactions.filter((t) => t.customer_id === cid);

  const getDaysSinceLastPurchase = (cid) => {
    const purchases = getTransactions(cid).filter((t) => t.type === "compra");
    if (purchases.length === 0) return null;
    const last = purchases[0];
    const parsed = parseDateBR(last.date);
    const diffTime = Date.now() - parsed.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalDebt = debtors.reduce((s, c) => s + (c.balance || 0), 0);

  const exportPDF = () => downloadReportPDF(debtors, totalDebt);

  if (lc || lt) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportPDF}>
          <Download className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>

      <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{debtors.length}</p>
            <p className="text-xs text-muted-foreground">Clientes devendo</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(debtors.reduce((s, c) => s + (c.balance || 0), 0))}</p>
            <p className="text-xs text-muted-foreground">Total em aberto</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{creditCustomers.length}</p>
            <p className="text-xs text-muted-foreground">Com saldo positivo</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{transactions.length}</p>
            <p className="text-xs text-muted-foreground">Total transações</p>
          </div>
        </div>
      </div>

      {limitExceeded.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-red-700 text-sm">⚠️ Clientes com limite excedido ({limitExceeded.length})</p>
          <div className="space-y-1">
            {limitExceeded.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-200 text-sm">
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-red-600 text-xs">Dívida: {formatCurrency(c.balance)} / Limite: {formatCurrency(c.credit_limit)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {creditCustomers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-blue-700 text-sm">💙 Clientes com saldo positivo (crédito)</p>
          <div className="space-y-1">
            {creditCustomers.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-200 text-sm">
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-blue-600 font-semibold text-xs">Crédito: {formatCurrency(Math.abs(c.balance))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {debtors.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <p className="text-muted-foreground">Nenhum cliente devendo no momento</p>
          </div>
        ) : (
          debtors.map((c) => {
            const ct = getTransactions(c.id);
            const purchases = ct.filter((t) => t.type === "compra");
            const payments = ct.filter((t) => t.type === "pagamento");
            const days = getDaysSinceLastPurchase(c.id);
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">CPF: {c.cpf}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-600">{formatCurrency(c.balance || 0)}</p>
                    {days !== null && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" /> {days} dias devendo
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                  {c.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.address}, {c.neighborhood}</span>}
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{purchases.length}</p>
                    <p className="text-xs text-muted-foreground">Compras</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(purchases.reduce((s, t) => s + t.amount, 0))}</p>
                    <p className="text-xs text-muted-foreground">Total Comprado</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(payments.reduce((s, t) => s + t.amount, 0))}</p>
                    <p className="text-xs text-muted-foreground">Total Pago</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
