import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, ORDER_STATUS_CONFIG } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { toast } from "sonner";
import PortalLogin from "@/components/portal/PortalLogin";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalSkeleton from "@/components/portal/PortalSkeleton";
import PortalAccount from "@/components/portal/PortalAccount";
import PortalHistory from "@/components/portal/PortalHistory";
import PortalOrders from "@/components/portal/PortalOrders";
import PortalCatalog from "@/components/portal/PortalCatalog";
import { ClipboardList, History, ShoppingBag, Package } from "lucide-react";

const PORTAL_SESSION_KEY = "fiadopro_portal_session";
const PORTAL_CART_KEY = "fiadopro_portal_cart";
const PORTAL_SESSION_EXPIRY = "fiadopro_portal_expiry";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export default function ClientPortal() {
  const [step, setStep] = useState("loading");
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeProfile, setStoreProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("conta");
  const [cart, setCart] = useState([]);
  const [checkoutSent, setCheckoutSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "true" ||
        (!localStorage.getItem("darkMode") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  const loadPortalData = useCallback(async (customerId) => {
    const [customerResult, txsResult, ordsResult, prodsResult] = await Promise.all([
      supabase.rpc("portal_get_customer", { p_customer_id: customerId }),
      supabase.rpc("portal_get_transactions", { p_customer_id: customerId, p_limit: 200 }),
      supabase.rpc("portal_get_orders", { p_customer_id: customerId, p_limit: 50 }),
      supabase.rpc("portal_get_products", { p_limit: 200 }),
    ]);
    if (customerResult.data?.length > 0) setCustomer(customerResult.data[0]);
    if (txsResult.data) setTransactions(txsResult.data);
    if (ordsResult.data) setOrders(ordsResult.data);
    if (prodsResult.data) setProducts(prodsResult.data);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: profiles } = await supabase.rpc("portal_get_store_profile");
        if (profiles?.length > 0) setStoreProfile(profiles[0]);
      } catch {}

      const saved = localStorage.getItem(PORTAL_SESSION_KEY);
      const expiry = localStorage.getItem(PORTAL_SESSION_EXPIRY);

      if (!saved || !expiry || Date.now() > parseInt(expiry)) {
        localStorage.removeItem(PORTAL_SESSION_KEY);
        localStorage.removeItem(PORTAL_SESSION_EXPIRY);
        setStep("login");
        return;
      }

      try {
        const { customerId } = JSON.parse(saved);
        if (!customerId) { setStep("login"); return; }
        await loadPortalData(customerId);
        const savedCart = localStorage.getItem(PORTAL_CART_KEY);
        if (savedCart) setCart(JSON.parse(savedCart));
        setStep("portal");
      } catch {
        localStorage.removeItem(PORTAL_SESSION_KEY);
        localStorage.removeItem(PORTAL_SESSION_EXPIRY);
        setStep("login");
      }
    };
    init();
  }, [loadPortalData]);

  useEffect(() => {
    if (step === "portal" && cart.length > 0) {
      localStorage.setItem(PORTAL_CART_KEY, JSON.stringify(cart));
    } else if (cart.length === 0) {
      localStorage.removeItem(PORTAL_CART_KEY);
    }
  }, [cart, step]);

  useEffect(() => {
    if (step !== "portal" || !customer?.id) return;
    const interval = setInterval(async () => {
      try {
        await loadPortalData(customer.id);
      } catch {}
    }, 60000);
    return () => clearInterval(interval);
  }, [step, customer?.id, loadPortalData]);

  const handleLogin = async (cpf, accessCode) => {
    const { data: rows, error: rpcError } = await supabase.rpc("portal_login", {
      p_cpf: cpf,
      p_access_code: accessCode,
    });
    if (rpcError || !rows || rows.length === 0) throw new Error("CPF ou código de acesso inválido");
    const found = rows[0];

    localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({ customerId: found.id }));
    localStorage.setItem(PORTAL_SESSION_EXPIRY, String(Date.now() + SESSION_DURATION_MS));

    await loadPortalData(found.id);
    setStep("portal");
  };

  const handleLogout = () => {
    if (cart.length > 0 && !window.confirm("Você tem itens no carrinho. Deseja sair mesmo assim?")) return;
    localStorage.removeItem(PORTAL_SESSION_KEY);
    localStorage.removeItem(PORTAL_SESSION_EXPIRY);
    localStorage.removeItem(PORTAL_CART_KEY);
    setCustomer(null);
    setTransactions([]);
    setOrders([]);
    setProducts([]);
    setCart([]);
    setStep("login");
  };

  const handleCheckout = async ({ paymentMethod, cardType, cardBrand, useCredit }) => {
    if (cart.length === 0) return;
    if (!paymentMethod) { toast.error("Selecione a forma de pagamento"); return; }

    setSending(true);
    try {
      const cartDesc = cart.map((i) => `${i.qty}x ${i.name} (${formatCurrency(i.price)})`).join(", ");
      const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

      let orderStatus = "pendente";
      let exceedsLimit = false;

      if (paymentMethod === "dinheiro" && useCredit && (customer.credit_limit || 0) > 0) {
        if ((customer.balance || 0) + cartTotal > customer.credit_limit) {
          exceedsLimit = true;
          orderStatus = "pendente_aprovacao_limite";
        }
      }

      await supabase.rpc("portal_create_order", {
        p_customer_id: customer.id,
        p_customer_name: customer.name,
        p_customer_phone: customer.phone,
        p_description: cartDesc,
        p_amount: cartTotal,
        p_status: orderStatus,
        p_service_type: "online_entrega",
        p_payment_method: paymentMethod,
        p_payment_card_type: paymentMethod === "cartao" ? cardType : null,
        p_payment_card_brand: paymentMethod === "cartao" ? cardBrand : null,
      });

      if (paymentMethod === "dinheiro" && !exceedsLimit) {
        const { format: formatDate } = await import("date-fns");
        const now = new Date();
        await supabase.rpc("portal_create_transaction", {
          p_customer_id: customer.id,
          p_customer_name: customer.name,
          p_type: "compra",
          p_amount: cartTotal,
          p_date: formatDate(now, "dd/MM/yyyy"),
          p_time: formatDate(now, "HH:mm"),
          p_description: `Pedido online - ${cartDesc}`,
        });

        const { data: balanceRows, error: balanceError } = await supabase.rpc("portal_update_balance", {
          p_customer_id: customer.id,
          p_amount: cartTotal,
          p_type: "compra",
        });
        if (balanceError) throw balanceError;
        const newBalance = balanceRows?.[0]?.balance ?? 0;
        setCustomer((prev) => ({ ...prev, balance: newBalance }));

        if (storeProfile?.phone) {
          sendWhatsApp(storeProfile.phone, `Pedido registrado! Valor: ${formatCurrency(cartTotal)}\nSaldo: ${formatCurrency(newBalance)}`);
        }
      }

      if (exceedsLimit && storeProfile?.phone) {
        const msg = `⚠️ Pedido com limite excedido!\n\nCliente: ${customer.name}\nCompra: ${formatCurrency(cartTotal)}\nLimite: ${formatCurrency(customer.credit_limit)}\n\nResponda: ACEITO ou RECUSADO`;
        sendWhatsApp(storeProfile.phone, msg);
      }

      setCart([]);
      localStorage.removeItem(PORTAL_CART_KEY);
      setCheckoutSent(true);
      toast.success("Pedido enviado com sucesso!");
      setActiveTab("pedidos");
      setTimeout(() => setCheckoutSent(false), 3000);
    } catch (err) {
      toast.error(`Erro ao enviar: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (step === "loading") return <PortalSkeleton />;
  if (step === "login") return <PortalLogin onLogin={handleLogin} storeProfile={storeProfile} />;

  const pendingOrders = orders.filter((o) => !["finalizado", "recusado"].includes(o.status));
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const tabs = [
    { id: "conta", label: "Conta", icon: ClipboardList },
    { id: "historico", label: "Histórico", icon: History },
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag, badge: pendingOrders.length },
    { id: "cardapio", label: "Produtos", icon: Package, badge: cartCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader
        customerName={customer?.name}
        storeProfile={storeProfile}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        onLogout={handleLogout}
      />

      <div className="flex border-b border-border bg-card overflow-x-auto sticky top-[52px] z-20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 py-3 px-4 text-xs font-medium transition-colors whitespace-nowrap relative shrink-0 ${
              activeTab === tab.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {activeTab === "conta" && (
          <PortalAccount customer={customer} storeProfile={storeProfile} pendingOrders={pendingOrders} />
        )}
        {activeTab === "historico" && (
          <PortalHistory transactions={transactions} />
        )}
        {activeTab === "pedidos" && (
          <PortalOrders orders={orders} customer={customer} storeProfile={storeProfile} />
        )}
        {activeTab === "cardapio" && (
          <PortalCatalog
            products={products}
            cart={cart}
            setCart={setCart}
            storeProfile={storeProfile}
            customer={customer}
            onCheckout={handleCheckout}
            sending={sending}
            checkoutSent={checkoutSent}
          />
        )}
      </div>
    </div>
  );
}
