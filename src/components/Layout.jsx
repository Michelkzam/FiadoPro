import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { LayoutDashboard, Store, FileText, LogOut, Menu, X, ShoppingCart, ClipboardList, Package, History, Send, Table, Settings, Clock, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { usePendingOrders, useStoreProfile } from "@/hooks/useQueries";
import { STORE_NAME_FALLBACK } from "@/lib/constants";
import NotificationBell from "@/components/NotificationBell";

const COLORS = {
  blue: { icon: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  teal: { icon: "#14b8a6", bg: "#f0fdfa", border: "#99f6e4" },
  amber: { icon: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  purple: { icon: "#a855f7", bg: "#faf5ff", border: "#e9d5ff" },
  orange: { icon: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  green: { icon: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
  slate: { icon: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  indigo: { icon: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
  cyan: { icon: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc" },
  emerald: { icon: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  gray: { icon: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  red: { icon: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  pink: { icon: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8" },
  rose: { icon: "#f43f5e", bg: "#fff1f2", border: "#fecdd3" },
  violet: { icon: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  lime: { icon: "#84cc16", bg: "#f7fee7", border: "#d9f99d" },
};

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, colorKey: "blue" },
  { path: "/mesas", label: "Mesas", icon: Table, colorKey: "teal" },
  { path: "/fila-espera", label: "Fila de Espera", icon: Clock, colorKey: "amber" },
  { path: "/enviar-cardapio", label: "Enviar Cardápio", icon: Send, colorKey: "purple" },
  { path: "/pedidos", label: "Pedidos", icon: ClipboardList, colorKey: "orange" },
  { path: "/compras", label: "Vendas", icon: ShoppingCart, colorKey: "green" },
  { path: "/historico", label: "Histórico", icon: History, colorKey: "slate" },
  { path: "/relatorios", label: "Relatórios", icon: FileText, colorKey: "indigo" },
  { path: "/cadastros", label: "Cadastros", icon: Package, colorKey: "cyan" },
  { path: "/whatsapp-ai", label: "WhatsApp AI", icon: MessageSquare, colorKey: "emerald" },
  { path: "/configuracoes", label: "Configurações", icon: Settings, colorKey: "gray" },
];

function NavItem({ item, isActive, badge, onClick }) {
  const Icon = item.icon;
  const colors = COLORS[item.colorKey] || COLORS.gray;
  
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
      style={{
        backgroundColor: isActive ? "#2563eb" : "transparent",
        color: isActive ? "#ffffff" : "#1e293b",
      }}
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center"
        style={{
          backgroundColor: isActive ? "rgba(255,255,255,0.2)" : colors.bg,
        }}
      >
        <Icon
          className="w-4 h-4"
          style={{ color: isActive ? "#ffffff" : colors.icon }}
        />
      </div>
      {item.label}
      {badge > 0 && (
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: COLORS.amber.bg, color: COLORS.amber.icon }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Layout() {
  const location = useLocation();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: profiles = [] } = useStoreProfile();
  const storeProfile = profiles[0] || null;
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

  const { data: pendingOrders = [] } = usePendingOrders();

  const renderNav = (onClickLink) =>
    navItems.map((item) => (
      <NavItem
        key={item.path}
        item={item}
        isActive={item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)}
        badge={item.path === "/pedidos" ? pendingOrders.length : 0}
        onClick={onClickLink}
      />
    ));

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Mobile header */}
      <header
        className="lg:hidden px-4 py-3 flex items-center justify-between sticky top-0 z-30"
        style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}
      >
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-muted rounded-lg">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="font-semibold text-foreground">{storeProfile?.store_name || STORE_NAME_FALLBACK}</span>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-muted rounded-lg">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute left-0 top-0 h-full w-72 shadow-xl p-4 space-y-2"
            style={{ backgroundColor: "#ffffff", borderRight: "1px solid #e2e8f0" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-foreground">{storeProfile?.store_name || STORE_NAME_FALLBACK}</span>
              <button onClick={() => setMenuOpen(false)} className="p-1.5 hover:bg-muted rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderNav(() => setMenuOpen(false))}
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full mt-4"
              style={{ color: "#ef4444" }}
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside
          className="hidden lg:flex flex-col w-64 min-h-screen sticky top-0 h-screen"
          style={{ backgroundColor: "#ffffff", borderRight: "1px solid #e2e8f0" }}
        >
          <div className="p-4" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#2563eb" }}
              >
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{storeProfile?.store_name || STORE_NAME_FALLBACK}</p>
                <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {renderNav()}
          </nav>

          <div className="p-3 space-y-2" style={{ borderTop: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs text-muted-foreground font-medium">Notificações</span>
              <NotificationBell />
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted w-full"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? "Modo Claro" : "Modo Escuro"}
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full"
              style={{ color: "#ef4444" }}
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full" style={{ backgroundColor: "#f8fafc" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
