import { Link } from "react-router-dom";
import { Users, TrendingDown, TrendingUp, DollarSign, ClipboardList, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import BalanceBadge from "../components/BalanceBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useCustomers, useTransactions, useOrders } from "@/hooks/useQueries";
import { formatCurrency, formatDateBR, parseDateBR } from "@/lib/constants";

const PIE_COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6"];

const CARD_CONFIGS = [
  { id: "clientes", label: "Total Clientes", icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { id: "pedidos", label: "Pedidos em Aberto", icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
  { id: "vendas_dia", label: "Vendas no Dia", icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
  { id: "pagamentos", label: "Total Pagamentos", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  { id: "devendo", label: "Total Devendo", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50" },
];

function DetailPanel({ title, count, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="text-sm font-bold text-primary">{count}</span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1">{children}</div>
    </div>
  );
}

export default function Home() {
  const [activeCard, setActiveCard] = useState(null);

  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: transactions = [], isLoading: loadingT } = useTransactions();
  const { data: orders = [], isLoading: loadingO } = useOrders();

  const today = useMemo(() => formatDateBR(), []);

  const stats = useMemo(() => {
    const totalDebt = customers.reduce((s, c) => s + (c.balance || 0), 0);
    const debtors = customers.filter((c) => (c.balance || 0) > 0);
    const vendas_dia = transactions
      .filter((t) => t.type === "compra" && t.date === today)
      .reduce((s, t) => s + (t.amount || 0), 0);
    const totalPayments = transactions
      .filter((t) => t.type === "pagamento")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === "pendente");
    const limitExceeded = customers.filter(
      (c) => (c.credit_limit || 0) > 0 && (c.balance || 0) > (c.credit_limit || 0)
    );
    const creditCustomers = customers.filter((c) => (c.balance || 0) < 0);

    return { totalDebt, debtors, vendas_dia, totalPayments, pendingOrders, limitExceeded, creditCustomers };
  }, [customers, transactions, orders, today]);

  const paymentByMethod = useMemo(() => {
    const methods = { dinheiro: 0, pix: 0, cartao: 0, fiado: 0 };

    transactions.forEach((t) => {
      if (t.type === "pagamento") {
        const desc = (t.description || "").toLowerCase();
        if (desc.includes("dinheiro")) methods.dinheiro += t.amount || 0;
        else if (desc.includes("pix")) methods.pix += t.amount || 0;
        else if (desc.includes("cartão") || desc.includes("cartao") || desc.includes("crédito") || desc.includes("credito") || desc.includes("débito") || desc.includes("debito")) methods.cartao += t.amount || 0;
        else methods.dinheiro += t.amount || 0;
      } else if (t.type === "compra") {
        methods.fiado += t.amount || 0;
      }
    });

    return [
      { name: "Dinheiro", value: methods.dinheiro, color: "#22c55e" },
      { name: "Pix", value: methods.pix, color: "#3b82f6" },
      { name: "Cartão", value: methods.cartao, color: "#8b5cf6" },
      { name: "Fiado", value: methods.fiado, color: "#ef4444" },
    ].filter((d) => d.value > 0);
  }, [transactions]);

  const last7 = useMemo(() => {
    const txByDate = new Map();
    for (const t of transactions) {
      const key = t.date;
      if (!txByDate.has(key)) {
        txByDate.set(key, { compras: 0, pagamentos: 0 });
      }
      const entry = txByDate.get(key);
      if (t.type === "compra") {
        entry.compras += t.amount || 0;
      } else if (t.type === "pagamento") {
        entry.pagamentos += t.amount || 0;
      }
    }

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const dateStr = d.toLocaleDateString("pt-BR");
      const dayData = txByDate.get(dateStr) || { compras: 0, pagamentos: 0 };
      return { label, compras: dayData.compras, pagamentos: dayData.pagamentos };
    });
  }, [transactions]);

  const pieData = useMemo(() => [
    { name: "Até R$100", value: stats.debtors.filter((c) => c.balance <= 100).length },
    { name: "R$100–500", value: stats.debtors.filter((c) => c.balance > 100 && c.balance <= 500).length },
    { name: "Acima R$500", value: stats.debtors.filter((c) => c.balance > 500).length },
  ].filter((d) => d.value > 0), [stats.debtors]);

  const cardValues = {
    clientes: customers.length,
    pedidos: stats.pendingOrders.length,
    vendas_dia: formatCurrency(stats.vendas_dia),
    pagamentos: formatCurrency(stats.totalPayments),
    devendo: formatCurrency(stats.totalDebt),
  };

  if (loadingC || loadingT || loadingO) {
    return <LoadingSpinner />;
  }

  const renderDetail = () => {
    if (!activeCard) return null;

    if (activeCard === "clientes") return (
      <DetailPanel title="Clientes Cadastrados" count={customers.length}>
        {customers.slice(0, 8).map((c) => (
          <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
            <div>
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.phone}</p>
            </div>
            <BalanceBadge balance={c.balance || 0} />
          </Link>
        ))}
      </DetailPanel>
    );

    if (activeCard === "pedidos") return (
      <DetailPanel title="Pedidos em Aberto" count={stats.pendingOrders.length}>
        {stats.pendingOrders.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido pendente</p> :
          stats.pendingOrders.slice(0, 8).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100 mb-2">
              <div>
                <p className="text-sm font-medium text-foreground">{o.customer_name}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{o.description || "—"}</p>
              </div>
              {o.amount > 0 && <span className="text-sm font-semibold text-amber-700">{formatCurrency(o.amount)}</span>}
            </div>
          ))}
      </DetailPanel>
    );

    if (activeCard === "vendas_dia") return (
      <DetailPanel title={`Vendas de Hoje (${today})`} count={formatCurrency(stats.vendas_dia)}>
        {transactions.filter((t) => t.type === "compra" && t.date === today).map((t) => (
          <div key={t.id} className="flex justify-between p-3 rounded-lg border border-border mb-2">
            <div>
              <p className="text-sm font-medium">{t.customer_name}</p>
              <p className="text-xs text-muted-foreground">{t.time || ""} {t.description ? `• ${t.description}` : ""}</p>
            </div>
            <span className="text-sm font-semibold text-red-600">{formatCurrency(t.amount)}</span>
          </div>
        ))}
      </DetailPanel>
    );

    if (activeCard === "pagamentos") return (
      <DetailPanel title="Total Pagamentos" count={formatCurrency(stats.totalPayments)}>
        {transactions.filter((t) => t.type === "pagamento").slice(0, 8).map((t) => (
          <div key={t.id} className="flex justify-between p-3 rounded-lg border border-border mb-2">
            <div>
              <p className="text-sm font-medium">{t.customer_name}</p>
              <p className="text-xs text-muted-foreground">{t.date}</p>
            </div>
            <span className="text-sm font-semibold text-green-600">+{formatCurrency(t.amount)}</span>
          </div>
        ))}
      </DetailPanel>
    );

    if (activeCard === "devendo") return (
      <DetailPanel title="Clientes Devendo" count={formatCurrency(stats.totalDebt)}>
        {stats.debtors.slice(0, 8).map((c) => (
          <Link key={c.id} to={`/clientes/${c.id}`} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
            <div>
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.phone}</p>
            </div>
            <div className="flex items-center gap-1"><BalanceBadge balance={c.balance} /><ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
          </Link>
        ))}
      </DetailPanel>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Painel de Controle</h1>
        <p className="text-muted-foreground text-sm mt-1">Clique em um card para ver os detalhes</p>
      </div>

      {stats.limitExceeded.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-red-700 text-sm flex items-center gap-2">⚠️ Limite de crédito excedido ({stats.limitExceeded.length} cliente{stats.limitExceeded.length > 1 ? "s" : ""})</p>
          <div className="space-y-1">
            {stats.limitExceeded.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-red-200">
                <Link to={`/clientes/${c.id}`} className="font-medium text-red-800 hover:underline">{c.name}</Link>
                <span className="text-xs text-red-600">Dívida: {formatCurrency(c.balance)} / Limite: {formatCurrency(c.credit_limit)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.creditCustomers.length > 0 && (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-blue-700 text-sm flex items-center gap-2">💙 Clientes com saldo positivo ({stats.creditCustomers.length})</p>
          <div className="space-y-1">
            {stats.creditCustomers.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-blue-200">
                <Link to={`/clientes/${c.id}`} className="font-medium text-blue-800 hover:underline">{c.name}</Link>
                <span className="text-xs text-blue-600 font-semibold">Crédito: {formatCurrency(Math.abs(c.balance))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CARD_CONFIGS.map((cfg) => {
          const Icon = cfg.icon;
          const isActive = activeCard === cfg.id;
          return (
            <button
              key={cfg.id}
              onClick={() => setActiveCard(isActive ? null : cfg.id)}
              className={`text-left p-4 rounded-xl border-2 shadow-sm transition-all ${isActive ? "border-primary bg-primary/5 shadow-md" : "bg-card border-border hover:border-primary/40 hover:shadow"}`}
            >
              <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">{cardValues[cfg.id]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {activeCard && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          {renderDetail()}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h2 className="font-semibold text-foreground mb-4">Compras vs Pagamentos (7 dias)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend iconSize={10} />
              <Bar dataKey="compras" name="Compras" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="pagamentos" name="Pagamentos" fill="#22c55e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h2 className="font-semibold text-foreground mb-1">Recebíveis — 30 dias</h2>
          <p className="text-xs text-muted-foreground mb-4">Previstos (compras) vs Recebidos (pagamentos)</p>
          {(() => {
            const cutoff30 = new Date();
            cutoff30.setDate(cutoff30.getDate() - 30);
            const previstos30 = transactions
              .filter((t) => t.type === "compra" && parseDateBR(t.date) >= cutoff30)
              .reduce((s, t) => s + (t.amount || 0), 0);
            const recebidos30 = transactions
              .filter((t) => t.type === "pagamento" && parseDateBR(t.date) >= cutoff30)
              .reduce((s, t) => s + (t.amount || 0), 0);
            const pct = previstos30 > 0 ? Math.round((recebidos30 / previstos30) * 100) : 0;
            const barData = [{ label: "30 dias", previstos: previstos30, recebidos: recebidos30 }];
            return (
              <div className="space-y-3">
                <div className="flex gap-4 text-sm">
                  <div><span className="text-muted-foreground">Previstos: </span><span className="font-semibold text-foreground">{formatCurrency(previstos30)}</span></div>
                  <div><span className="text-muted-foreground">Recebidos: </span><span className="font-semibold text-green-600">{formatCurrency(recebidos30)}</span></div>
                  <div><span className="text-muted-foreground">Índice: </span><span className="font-semibold text-primary">{pct}%</span></div>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend iconSize={10} />
                    <Bar dataKey="previstos" name="Previstos" fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="recebidos" name="Recebidos" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h2 className="font-semibold text-foreground mb-4">Devedores por Faixa</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Nenhum devedor</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h2 className="font-semibold text-foreground mb-4">Pagamentos por Forma</h2>
          {paymentByMethod.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Nenhum pagamento registrado</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentByMethod} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {paymentByMethod.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {paymentByMethod.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {paymentByMethod.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
