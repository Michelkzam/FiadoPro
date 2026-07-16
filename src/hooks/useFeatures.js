import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useCashback() {
  const [loading, setLoading] = useState(false);

  const processCashback = useCallback(async (customerId, purchaseAmount) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("process_cashback", {
        p_customer_id: customerId,
        p_purchase_amount: purchaseAmount,
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const spendCashback = useCallback(async (customerId, amount) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("spend_cashback", {
        p_customer_id: customerId,
        p_amount: amount,
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBalance = useCallback(async (customerId) => {
    const { data, error } = await supabase
      .from("cashback_balance")
      .select("*")
      .eq("customer_id", customerId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data || { balance: 0, total_earned: 0, total_spent: 0 };
  }, []);

  const getHistory = useCallback(async (customerId) => {
    const { data, error } = await supabase
      .from("cashback_transactions")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }, []);

  return { processCashback, spendCashback, getBalance, getHistory, loading };
}

export function useCoupons() {
  const [loading, setLoading] = useState(false);

  const validate = useCallback(async (code, purchaseAmount) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: code,
        p_purchase_amount: purchaseAmount,
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (couponData) => {
    const { data, error } = await supabase
      .from("coupons")
      .insert({ ...couponData, code: couponData.code.toUpperCase() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const list = useCallback(async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, []);

  const deactivate = useCallback(async (couponId) => {
    const { error } = await supabase
      .from("coupons")
      .update({ active: false })
      .eq("id", couponId);
    if (error) throw error;
  }, []);

  return { validate, create, list, deactivate, loading };
}

export function useRatings() {
  const submit = useCallback(async (orderId, customerId, rating, comment) => {
    const { data, error } = await supabase
      .from("customer_ratings")
      .insert({
        order_id: orderId,
        customer_id: customerId,
        rating,
        comment,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const getAverage = useCallback(async () => {
    const { data, error } = await supabase
      .from("customer_ratings")
      .select("rating");
    if (error) throw error;
    if (!data || data.length === 0) return { average: 0, count: 0 };
    const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
    return { average: Math.round(avg * 10) / 10, count: data.length };
  }, []);

  return { submit, getAverage };
}

export function useWaitingList() {
  const [loading, setLoading] = useState(false);

  const add = useCallback(async (entry) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("waiting_list")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const seat = useCallback(async (id) => {
    const { error } = await supabase
      .from("waiting_list")
      .update({ status: "seated", seated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }, []);

  const cancel = useCallback(async (id) => {
    const { error } = await supabase
      .from("waiting_list")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) throw error;
  }, []);

  const list = useCallback(async () => {
    const { data, error } = await supabase
      .from("waiting_list")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }, []);

  return { add, seat, cancel, list, loading };
}

export function useLoyalty() {
  const processPoints = useCallback(async (customerId, purchaseAmount) => {
    const { data, error } = await supabase.rpc("process_loyalty_points", {
      p_customer_id: customerId,
      p_purchase_amount: purchaseAmount,
    });
    if (error) throw error;
    return data || 0;
  }, []);

  return { processPoints };
}
