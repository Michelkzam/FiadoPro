import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import db from "@/lib/db";

export function useTransactionReversal() {
  const [loading, setLoading] = useState(false);

  const reverse = useCallback(async (transactionId, reason) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("reverse_transaction", {
        p_transaction_id: transactionId,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { reverse, loading };
}

export function useLateFee() {
  const [loading, setLoading] = useState(false);

  const applyFee = useCallback(async (customerId, feePercentage) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("apply_late_fee", {
        p_customer_id: customerId,
        p_fee_percentage: feePercentage,
      });

      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { applyFee, loading };
}

export function useEarlyDiscount() {
  const [loading, setLoading] = useState(false);

  const applyDiscount = useCallback(async (customerId, discountPercentage) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("apply_early_discount", {
        p_customer_id: customerId,
        p_discount_percentage: discountPercentage,
      });

      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { applyDiscount, loading };
}

export function useCreditLimitHistory() {
  const logChange = useCallback(async (customerId, oldLimit, newLimit, reason) => {
    const { error } = await supabase.from("credit_limit_history").insert({
      customer_id: customerId,
      old_limit: oldLimit,
      new_limit: newLimit,
      reason,
    });
    if (error) throw error;
  }, []);

  return { logChange };
}

export function useAutoCancel() {
  const cancelOldOrders = useCallback(async (maxMinutes = 30) => {
    const { data, error } = await supabase.rpc("auto_cancel_pending_orders", {
      p_max_minutes: maxMinutes,
    });
    if (error) throw error;
    return data;
  }, []);

  return { cancelOldOrders };
}

export function useAuditLog() {
  const log = useCallback(async (action, entityType, entityId, oldData, newData) => {
    const { error } = await supabase.rpc("log_audit", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_old_data: oldData,
      p_new_data: newData,
    });
    if (error) console.error("Audit log error:", error);
  }, []);

  return { log };
}
