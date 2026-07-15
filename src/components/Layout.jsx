import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { LayoutDashboard, Users, Store, FileText, LogOut, Menu, X, ShoppingCart, ClipboardList, Package, History, Send } from "lucide-react";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { usePendingOrders, useStoreProfile } from "@/hooks/useQueries";
import { STORE_NAME_FALLBACK } from "@/lib/constants";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/compras", label: "Compras", icon: ShoppingCart },
  { path: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { path: "/produtos", label: "Produtos", icon: Package },
  { path: "/enviar-cardapio", label: "Enviar Cardápio", icon: Send },
  { path: "/loja", label: "Minha Loja", icon: Store },
  { path: "/historico", label: "Histórico", icon: History },
  { path: "/relatorios", label: "Relatórios", icon: FileText },
];

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

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Mobile header */}
      <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
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
          <div className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border shadow-xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-foreground">{storeProfile?.store_name || STORE_NAME_FALLBACK}</span>
              <button onClick={() => setMenuOpen(false)} className="p-1.5 hover:bg-muted rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const badge = item.path === "/pedidos" ? pendingOrders.length : 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {badge > 0 && (
                    <span className="ml-auto bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full mt-4"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border min-h-screen sticky top-0 h-screen">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {storeProfile?.logo_url ? (
                <img src={storeProfile.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground text-sm">{storeProfile?.store_name || STORE_NAME_FALLBACK}</p>
                <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const badge = item.path === "/pedidos" ? pendingOrders.length : 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {badge > 0 && (
                    <span className="ml-auto bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border space-y-2">
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
