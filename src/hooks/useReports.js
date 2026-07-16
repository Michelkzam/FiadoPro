import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useCashflow(days = 30) {
  return useQuery({
    queryKey: ["cashflow", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cashflow", { p_days: days });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCustomerRanking(limit = 10) {
  return useQuery({
    queryKey: ["customer_ranking", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_customer_ranking", { p_limit: limit });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProductRanking(limit = 10) {
  return useQuery({
    queryKey: ["product_ranking", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_product_ranking", { p_limit: limit });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDelinquentCustomers(minDays = 30) {
  return useQuery({
    queryKey: ["delinquent_customers", minDays],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_delinquent_customers", { p_min_days: minDays });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useMonthlyComparison() {
  return useQuery({
    queryKey: ["monthly_comparison"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_comparison");
      if (error) throw error;
      return data;
    },
  });
}

export function usePeakHours(days = 30) {
  return useQuery({
    queryKey: ["peak_hours", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_peak_hours", { p_days: days });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDemandForecast() {
  return useQuery({
    queryKey: ["demand_forecast"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("description, amount, created_at")
        .eq("status", "aprovado")
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const byDayOfWeek = {};
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

      orders?.forEach((order) => {
        const day = new Date(order.created_at).getDay();
        const dayName = dayNames[day];
        if (!byDayOfWeek[dayName]) byDayOfWeek[dayName] = { count: 0, total: 0 };
        byDayOfWeek[dayName].count++;
        byDayOfWeek[dayName].total += order.amount || 0;
      });

      return {
        byDayOfWeek,
        averageDailyOrders: orders ? orders.length / 7 : 0,
        averageDailyRevenue: orders ? orders.reduce((s, o) => s + (o.amount || 0), 0) / 7 : 0,
      };
    },
  });
}

export function useProfitMargin() {
  return useQuery({
    queryKey: ["profit_margin"],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, price, cost_price, category")
        .eq("available", true);

      if (error) throw error;

      return (products || []).map((p) => ({
        ...p,
        margin: p.cost_price > 0 ? ((p.price - p.cost_price) / p.price) * 100 : 0,
        profit: p.price - (p.cost_price || 0),
      }));
    },
  });
}

export function useAuditLog(filters = {}) {
  return useQuery({
    queryKey: ["audit_log", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters.entity_type) query = query.eq("entity_type", filters.entity_type);
      if (filters.user_id) query = query.eq("user_id", filters.user_id);
      if (filters.action) query = query.eq("action", filters.action);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}
