import { useState } from "react";
import { Settings as SettingsIcon, Store, MessageSquare, CreditCard, Bell, Percent, Shield, RotateCcw } from "lucide-react";
import StoreProfilePage from "./StoreProfilePage";
import WhatsAppChannels from "./WhatsAppChannels";
import CouponsPage from "./CouponsPage";
import AuditLogPage from "./AuditLogPage";
import BusinessRulesSettings from "../components/BusinessRulesSettings";

const tabs = [
  { id: "store", label: "Perfil da Loja", icon: Store },
  { id: "business", label: "Regras de Negócio", icon: SettingsIcon },
  { id: "coupons", label: "Cupons", icon: Percent },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "audit", label: "Auditoria", icon: Shield },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("store");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "store" && <StoreProfilePage />}
        {activeTab === "business" && <BusinessRulesSettings />}
        {activeTab === "coupons" && <CouponsPage />}
        {activeTab === "whatsapp" && <WhatsAppChannels />}
        {activeTab === "audit" && <AuditLogPage />}
      </div>
    </div>
  );
}
