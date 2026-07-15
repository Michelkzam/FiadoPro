import { useQuery } from "@tanstack/react-query";
import db from "@/lib/db";
import { PENDING_ORDERS_POLL_INTERVAL } from "@/lib/constants";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => db.entities.Customer.list(),
  });
}

export function useCustomer(id) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: () => db.entities.Customer.get(id),
    enabled: !!id,
  });
}

export function useTransactions(customerId) {
  return useQuery({
    queryKey: customerId ? ["transactions", customerId] : ["transactions"],
    queryFn: () =>
      customerId
        ? db.entities.Transaction.filter({ customer_id: customerId }, "-created_at", 200)
        : db.entities.Transaction.list("-created_at", 500),
  });
}

export function useAllTransactions() {
  return useQuery({
    queryKey: ["transactions_all"],
    queryFn: () => db.entities.Transaction.list("-created_at", 1000),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => db.entities.Order.list("-created_at", 500),
  });
}

export function usePendingOrders() {
  return useQuery({
    queryKey: ["orders_pending"],
    queryFn: () => db.entities.Order.filter({ status: "pendente" }, "-created_at", 100),
    refetchInterval: PENDING_ORDERS_POLL_INTERVAL,
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => db.entities.Product.list("category", 200),
  });
}

export function useActiveProducts() {
  return useQuery({
    queryKey: ["products_active"],
    queryFn: () => db.entities.Product.filter({ available: true }, "name", 200),
  });
}

export function useStoreProfile() {
  return useQuery({
    queryKey: ["store_profile"],
    queryFn: () => db.entities.StoreProfile.list(),
  });
}
