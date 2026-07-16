import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import ErrorBoundary from "@/lib/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";

const Home = lazy(() => import("./pages/Home"));
const Customers = lazy(() => import("./pages/Customers"));
const NewCustomer = lazy(() => import("./pages/NewCustomer"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const EditCustomer = lazy(() => import("./pages/EditCustomer"));
const NewTransaction = lazy(() => import("./pages/NewTransaction"));
const StoreProfilePage = lazy(() => import("./pages/StoreProfilePage"));
const Reports = lazy(() => import("./pages/Reports"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Orders = lazy(() => import("./pages/Orders"));
const Products = lazy(() => import("./pages/Products"));
const MenuSender = lazy(() => import("./pages/MenuSender"));
const FinancialHistory = lazy(() => import("./pages/FinancialHistory"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const Mesas = lazy(() => import("./pages/Mesas"));
const WhatsAppChannels = lazy(() => import("./pages/WhatsAppChannels"));
const Settings = lazy(() => import("./pages/Settings"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PageNotFound = lazy(() => import("./lib/PageNotFound"));
const UserNotRegisteredError = lazy(() => import("./components/UserNotRegisteredError"));
const WaitingListPage = lazy(() => import("./pages/WaitingListPage"));
const CouponsPage = lazy(() => import("./pages/CouponsPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const Cadastros = lazy(() => import("./pages/Cadastros"));
const Campaigns = lazy(() => import("./pages/Campaigns"));

const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingSpinner />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <UserNotRegisteredError />
        </Suspense>
      );
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/portal" element={<ClientPortal />} />

        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/mesas" element={<Mesas />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/clientes" element={<Customers />} />
            <Route path="/clientes/novo" element={<NewCustomer />} />
            <Route path="/clientes/:id" element={<CustomerDetail />} />
            <Route path="/clientes/:id/editar" element={<EditCustomer />} />
            <Route path="/clientes/:id/transacao" element={<NewTransaction />} />
            <Route path="/compras" element={<Purchases />} />
            <Route path="/pedidos" element={<Orders />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/enviar-cardapio" element={<MenuSender />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/historico" element={<FinancialHistory />} />
            <Route path="/fila-espera" element={<WaitingListPage />} />
            <Route path="/cupons" element={<CouponsPage />} />
            <Route path="/auditoria" element={<AuditLogPage />} />
            <Route path="/cadastros" element={<Cadastros />} />
            <Route path="/cadastros/:tab" element={<Cadastros />} />
            <Route path="/campanhas" element={<Campaigns />} />
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
