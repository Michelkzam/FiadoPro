import { Link } from "react-router-dom";
import { Users, ShoppingCart, Package, AlertTriangle, TrendingUp, DollarSign, ArrowRight, Table, ClipboardList, Send } from "lucide-react";
import { useCustomers, useOrders, useProducts, useTransactions, usePendingOrders } from "@/hooks/useQueries";
import { useCashflow, useDelinquentCustomers, useMonthlyComparison } from "@/hooks/useReports";
import { formatCurrency } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const COLORS = {
  red: { icon: "#ef4444", bg: "#fef2f2", gradient: "linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)" },
  blue: { icon: "#3b82f6", bg: "#eff6ff", gradient: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" },
  green: { icon: "#22c55e", bg: "#f0fdf4", gradient: "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)" },
  purple: { icon: "#a855f7", bg: "#faf5ff", gradient: "linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)" },
  orange: { icon: "#f97316", bg: "#fff7ed", gradient: "linear-gradient(135deg, #f97316 0%, #f59e0b 100%)" },
  teal: { icon: "#14b8a6", bg: "#f0fdfa", gradient: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)" },
  amber: { icon: "#f59e0b", bg: "#fffbeb", gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" },
  pink: { icon: "#ec4899", bg: "#fdf2f8", gradient: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" },
  slate: { icon: "#64748b", bg: "#f8fafc", gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)" },
  indigo: { icon: "#6366f1", bg: "#eef2ff", gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" },
  cyan: { icon: "#06b6d4", bg: "#ecfeff", gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)" },
  emerald: { icon: "#10b981", bg: "#ecfdf5", gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
};

function StatCard({ icon: Icon, title, value, subtitle, link, colorKey = "blue" }) {
  const colors = COLORS[colorKey] || COLORS.blue;
  
  return (
    <Link to={link} className="block">
      <div
        className="rounded-xl p-5 hover:shadow-lg transition-all duration-200 group"
        style={{ background: colors.gradient }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Icon className="w-5 h-5" style={{ color: "#ffffff" }} />
          </div>
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(255,255,255,0.7)" }} />
        </div>
        <p className="text-2xl font-bold" style={{ color: "#ffffff" }}>{value}</p>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>{title}</p>
        {subtitle && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{subtitle}</p>}
      </div>
    </Link>
  );
}

function QuickAction({ icon: Icon, label, link, colorKey }) {
  const colors = COLORS[colorKey] || COLORS.blue;
  
  return (
    <Link
      to={link}
      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:shadow-md"
      style={{ backgroundColor: colors.bg, border: `1px solid ${colors.icon}20` }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${colors.icon}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: colors.icon }} />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
}

export default function Home() {
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: transactions = [] } = useTransactions();
  const { data: pendingOrders = [] } = usePendingOrders();
  const { data: cashflow = [] } = useCashflow(30);
  const { data: delinquent = [] } = useDelinquentCustomers(30);
  const { data: monthlyComparison } = useMonthlyComparison();

  const totalDebt = customers.reduce((s, c) => s + Math.max(0, c.balance || 0), 0);
  const totalCredit = customers.reduce((s, c) => s + Math.abs(Math.min(0, c.balance || 0)), 0);

  const monthPurchases = monthlyComparison?.current_month?.purchases || 0;
  const monthPayments = monthlyComparison?.current_month?.payments || 0;
  const lastMonthPurchases = monthlyComparison?.last_month?.purchases || 0;
  const purchaseChange = lastMonthPurchases > 0 ? ((monthPurchases - lastMonthPurchases) / lastMonthPurchases) * 100 : 0;

  const todayStr = new Date().toLocaleDateString("pt-BR");
  const todayTxs = transactions.filter((t) => t.date === todayStr);
  const todaySales = todayTxs.filter((t) => t.type === "compra").reduce((s, t) => s + t.amount, 0);
  const todayPayments = todayTxs.filter((t) => t.type === "pagamento").reduce((s, t) => s + t.amount, 0);

  const txByType = [
    { name: "Compras", value: transactions.filter((t) => t.type === "compra").reduce((s, t) => s + t.amount, 0) },
    { name: "Pagamentos", value: transactions.filter((t) => t.type === "pagamento").reduce((s, t) => s + t.amount, 0) },
  ].filter((d) => d.value > 0);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} title="Total em Débito" value={formatCurrency(totalDebt)} link="/relatorios" colorKey="red" />
        <StatCard icon={TrendingUp} title="Vendas do Mês" value={formatCurrency(monthPurchases)} subtitle={`${purchaseChange >= 0 ? "+" : ""}${purchaseChange.toFixed(1)}% vs mês anterior`} link="/relatorios" colorKey="blue" />
        <StatCard icon={DollarSign} title="Recebido no Mês" value={formatCurrency(monthPayments)} link="/relatorios" colorKey="green" />
        <StatCard icon={Users} title="Clientes Ativos" value={customers.filter((c) => c.status === "ativo").length} link="/clientes" colorKey="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Hoje</p>
            <span className="text-xs text-muted-foreground">{todayStr}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vendas</span>
              <span className="text-sm font-bold" style={{ color: "#ef4444" }}>{formatCurrency(todaySales)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recebimentos</span>
              <span className="text-sm font-bold" style={{ color: "#22c55e" }}>{formatCurrency(todayPayments)}</span>
            </div>
            <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid #e2e8f0" }}>
              <span className="text-sm font-medium text-foreground">Líquido</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(todayPayments - todaySales)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-foreground mb-3">Compras vs Pagamentos</p>
          {txByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={txByType} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={5} dataKey="value">
                  {txByType.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">Sem dados</div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-medium text-foreground mb-3">Fluxo (7 dias)</p>
          {cashflow.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={cashflow.slice(0, 7).reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="purchases" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="payments" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">Sem dados</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold text-foreground mb-3">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction icon={Users} label="Novo Cliente" link="/clientes/novo" colorKey="blue" />
            <QuickAction icon={ShoppingCart} label="Nova Transação" link="/compras" colorKey="green" />
            <QuickAction icon={Table} label="Abrir Mesa" link="/mesas" colorKey="teal" />
            <QuickAction icon={ClipboardList} label="Ver Pedidos" link="/pedidos" colorKey="orange" />
            <QuickAction icon={Package} label="Gerenciar Produtos" link="/produtos" colorKey="purple" />
            <QuickAction icon={Send} label="Enviar Cardápio" link="/enviar-cardapio" colorKey="pink" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Pedidos Recentes</h2>
            <Link to="/pedidos" className="text-xs text-primary hover:underline">Ver todos</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum pedido</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.customer_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{order.description || "Sem descrição"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(order.amount || 0)}</p>
                    <p className="text-xs text-muted-foreground">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(delinquent.length > 0 || pendingOrders.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingOrders.length > 0 && (
            <div className="rounded-xl border p-5" style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" style={{ color: "#f59e0b" }} />
                <h3 className="font-semibold" style={{ color: "#92400e" }}>Pedidos Pendentes ({pendingOrders.length})</h3>
              </div>
              <div className="space-y-2">
                {pendingOrders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between text-sm">
                    <span style={{ color: "#78716c" }}>{order.customer_name}</span>
                    <span className="font-medium" style={{ color: "#92400e" }}>{formatCurrency(order.amount || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {delinquent.length > 0 && (
            <div className="rounded-xl border p-5" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
                <h3 className="font-semibold" style={{ color: "#991b1b" }}>Inadimplentes ({delinquent.length})</h3>
              </div>
              <div className="space-y-2">
                {delinquent.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span style={{ color: "#78716c" }}>{c.name}</span>
                    <span className="font-medium" style={{ color: "#ef4444" }}>{formatCurrency(c.balance || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
