import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, TrendingDown, Users, Package, Clock, AlertTriangle, DollarSign, ShoppingCart } from "lucide-react";
import { useCashflow, useCustomerRanking, useProductRanking, useDelinquentCustomers, useMonthlyComparison, usePeakHours, useDemandForecast, useProfitMargin } from "@/hooks/useReports";
import { formatCurrency } from "@/lib/constants";
import { useCustomers, useTransactions, useOrders } from "@/hooks/useQueries";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function StatCard({ icon: Icon, title, value, subtitle, trend }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-1 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: customers = [] } = useCustomers();
  const { data: transactions = [] } = useTransactions();
  const { data: orders = [] } = useOrders();
  const { data: cashflow = [] } = useCashflow(parseInt(period));
  const { data: customerRanking = [] } = useCustomerRanking(10);
  const { data: productRanking = [] } = useProductRanking(10);
  const { data: delinquent = [] } = useDelinquentCustomers(30);
  const { data: monthlyComparison } = useMonthlyComparison();
  const { data: peakHours = [] } = usePeakHours(parseInt(period));
  const { data: demandForecast } = useDemandForecast();
  const { data: profitMargin = [] } = useProfitMargin();

  const summary = useMemo(() => {
    const now = new Date();
    const periodMs = parseInt(period) * 24 * 60 * 60 * 1000;
    const periodStart = new Date(now.getTime() - periodMs);

    const periodTxs = transactions.filter((t) => new Date(t.created_at) >= periodStart);
    const periodOrders = orders.filter((o) => new Date(o.created_at) >= periodStart);

    const purchases = periodTxs.filter((t) => t.type === "compra").reduce((s, t) => s + t.amount, 0);
    const payments = periodTxs.filter((t) => t.type === "pagamento").reduce((s, t) => s + t.amount, 0);
    const totalDebt = customers.reduce((s, c) => s + Math.max(0, c.balance || 0), 0);
    const totalCredit = customers.reduce((s, c) => s + Math.abs(Math.min(0, c.balance || 0)), 0);

    return {
      purchases,
      payments,
      net: payments - purchases,
      totalOrders: periodOrders.length,
      approvedOrders: periodOrders.filter((o) => o.status === "aprovado").length,
      totalDebt,
      totalCredit,
      avgOrderValue: periodOrders.length > 0 ? purchases / periodOrders.length : 0,
    };
  }, [transactions, orders, customers, period]);

  const monthComparison = useMemo(() => {
    if (!monthlyComparison) return { purchasesChange: 0, paymentsChange: 0 };
    const cur = monthlyComparison.current_month || {};
    const prev = monthlyComparison.last_month || {};
    return {
      purchasesChange: prev.purchases > 0 ? ((cur.purchases - prev.purchases) / prev.purchases) * 100 : 0,
      paymentsChange: prev.payments > 0 ? ((cur.payments - prev.payments) / prev.payments) * 100 : 0,
    };
  }, [monthlyComparison]);

  const peakHoursData = useMemo(() => {
    return peakHours.map((h) => ({
      name: `${String(h.hour_of_day).padStart(2, "0")}h`,
      transactions: h.transaction_count,
      total: h.total_amount,
    }));
  }, [peakHours]);

  const delinquentTotal = useMemo(() => {
    return delinquent.reduce((s, c) => s + (c.balance || 0), 0);
  }, [delinquent]);

  const marginSummary = useMemo(() => {
    const withMargin = profitMargin.filter((p) => p.margin > 0);
    const avgMargin = withMargin.length > 0 ? withMargin.reduce((s, p) => s + p.margin, 0) / withMargin.length : 0;
    return { avgMargin, totalProducts: profitMargin.length, profitable: withMargin.length };
  }, [profitMargin]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise completa do seu negócio</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} title="Compras no período" value={formatCurrency(summary.purchases)} />
        <StatCard icon={DollarSign} title="Pagamentos recebidos" value={formatCurrency(summary.payments)} trend={monthComparison.paymentsChange} />
        <StatCard icon={TrendingUp} title="Receita líquida" value={formatCurrency(summary.net)} />
        <StatCard icon={Users} title="Total em débito" value={formatCurrency(summary.totalDebt)} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="ranking">Rankings</TabsTrigger>
          <TabsTrigger value="operations">Operações</TabsTrigger>
          <TabsTrigger value="profit">Lucratividade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Vendas vs Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={cashflow.slice(0, 14).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="purchases" name="Compras" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="payments" name="Pagamentos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Previsão de Demanda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{Math.round(demandForecast?.averageDailyOrders || 0)}</p>
                    <p className="text-xs text-muted-foreground">Pedidos/dia (média)</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(demandForecast?.averageDailyRevenue || 0)}</p>
                    <p className="text-xs text-muted-foreground">Receita/dia (média)</p>
                  </div>
                </div>
                {demandForecast?.byDayOfWeek && (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={Object.entries(demandForecast.byDayOfWeek).map(([day, v]) => ({ day, pedidos: v.count, receita: v.total }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="pedidos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comparativo Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Mês Atual</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(monthlyComparison?.current_month?.purchases || 0)}</p>
                  <p className="text-xs text-green-600">{formatCurrency(monthlyComparison?.current_month?.payments || 0)} recebido</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Mês Anterior</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(monthlyComparison?.last_month?.purchases || 0)}</p>
                  <p className="text-xs text-green-600">{formatCurrency(monthlyComparison?.last_month?.payments || 0)} recebido</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Variação</p>
                  <p className={`text-lg font-bold ${monthComparison.purchasesChange >= 0 ? "text-red-600" : "text-green-600"}`}>
                    {monthComparison.purchasesChange >= 0 ? "+" : ""}{monthComparison.purchasesChange.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">em compras</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fluxo de Caixa Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={cashflow.slice(0, 30).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="purchases" name="Compras" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payments" name="Pagamentos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" name="Líquido" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Horários de Pico</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="transactions" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Clientes Inadimplentes</CardTitle>
              </CardHeader>
              <CardContent>
                {delinquent.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum cliente inadimplente</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-sm font-medium text-red-800">Total em atraso</span>
                      <span className="text-lg font-bold text-red-600">{formatCurrency(delinquentTotal)}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {delinquent.map((c) => (
                        <div key={c.customer_id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{c.days_owed} dias sem pagar</p>
                          </div>
                          <span className="text-sm font-bold text-red-600">{formatCurrency(c.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                {customerRanking.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={customerRanking} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="customer_name" type="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="total_purchases" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                {productRanking.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productRanking} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="product_name" type="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="total_orders" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ShoppingCart} title="Total de Pedidos" value={summary.totalOrders} />
            <StatCard icon={TrendingUp} title="Pedidos Aprovados" value={summary.approvedOrders} />
            <StatCard icon={DollarSign} title="Ticket Médio" value={formatCurrency(summary.avgOrderValue)} />
            <StatCard icon={Users} title="Clientes Ativos" value={customers.filter((c) => c.status === "ativo").length} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Horários de Movimento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, name) => name === "total" ? formatCurrency(v) : v} />
                  <Legend />
                  <Bar dataKey="transactions" name="Transações" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={DollarSign} title="Margem Média" value={`${marginSummary.avgMargin.toFixed(1)}%`} />
            <StatCard icon={Package} title="Produtos Lucrativos" value={`${marginSummary.profitable}/${marginSummary.totalProducts}`} />
            <StatCard icon={TrendingUp} title="Produto Mais Lucrativo" value={profitMargin.length > 0 ? profitMargin.sort((a, b) => b.margin - a.margin)[0]?.name : "-"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Margem de Lucro por Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitMargin.filter((p) => p.margin > 0).sort((a, b) => b.margin - a.margin).slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="margin" name="Margem %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
