import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, Package, Clock, AlertTriangle, TrendingUp, DollarSign, ArrowRight, Table, ClipboardList, Send, History, FileText, Settings } from "lucide-react";
import { useCustomers, useOrders, useProducts, useTransactions, usePendingOrders } from "@/hooks/useQueries";
import { useCashflow, useDelinquentCustomers, useMonthlyComparison } from "@/hooks/useReports";
import { formatCurrency } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function StatCard({ icon: Icon, title, value, subtitle, link, color = "primary" }) {
  return (
    <Link to={link} className="block">
      <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow group">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${color}/10`}>
            <Icon className={`w-5 h-5 text-${color}`} />
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </Link>
  );
}

function QuickAction({ icon: Icon, label, link, color }) {
  return (
    <Link
      to={link}
      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}/10`}>
        <Icon className={`w-5 h-5 text-${color}`} />
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
        <StatCard icon={DollarSign} title="Total em Débito" value={formatCurrency(totalDebt)} link="/relatorios" color="red" />
        <StatCard icon={TrendingUp} title="Vendas do Mês" value={formatCurrency(monthPurchases)} subtitle={`${purchaseChange >= 0 ? "+" : ""}${purchaseChange.toFixed(1)}% vs mês anterior`} link="/relatorios" color="primary" />
        <StatCard icon={DollarSign} title="Recebido no Mês" value={formatCurrency(monthPayments)} link="/relatorios" color="green" />
        <StatCard icon={Users} title="Clientes Ativos" value={customers.filter((c) => c.status === "ativo").length} link="/clientes" color="blue" />
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
              <span className="text-sm font-bold text-red-600">{formatCurrency(todaySales)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recebimentos</span>
              <span className="text-sm font-bold text-green-600">{formatCurrency(todayPayments)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
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
                <Pie data={txByType} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
                  {txByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">Sem dados</div>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {txByType.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-muted-foreground">{d.name}</span>
              </div>
            ))}
          </div>
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
            <QuickAction icon={Users} label="Novo Cliente" link="/clientes/novo" color="blue" />
            <QuickAction icon={ShoppingCart} label="Nova Transação" link="/clientes" color="green" />
            <QuickAction icon={Table} label="Abrir Mesa" link="/mesas" color="purple" />
            <QuickAction icon={ClipboardList} label="Ver Pedidos" link="/pedidos" color="amber" />
            <QuickAction icon={Package} label="Gerenciar Produtos" link="/produtos" color="teal" />
            <QuickAction icon={Send} label="Enviar Cardápio" link="/enviar-cardapio" color="pink" />
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
                    <p className="text-sm font-medium text-foreground line-clamp-1">{order.customer_name || "Cliente"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{order.description || "Pedido"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(order.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === "pendente" ? "bg-yellow-100 text-yellow-700" :
                      order.status === "aprovado" ? "bg-green-100 text-green-700" :
                      order.status === "finalizado" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {delinquent.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-foreground">Inadimplência ({delinquent.length} clientes)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {delinquent.slice(0, 6).map((c) => (
              <Link key={c.customer_id} to={`/clientes/${c.customer_id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{c.days_owed} dias</p>
                </div>
                <span className="text-sm font-bold text-red-600">{formatCurrency(c.balance)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
