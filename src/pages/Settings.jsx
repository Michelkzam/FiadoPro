import { useState } from "react";
import { Store, MessageCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import StoreProfilePage from "./StoreProfilePage";
import WhatsAppChannels from "./WhatsAppChannels";

const tabs = [
  { id: "loja", label: "Minha Loja", icon: Store },
  { id: "whatsapp", label: "Canais WhatsApp", icon: MessageCircle },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("loja");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary/10 text-primary border-b-2 border-primary -mb-[1px]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "loja" && <StoreProfilePage />}
        {activeTab === "whatsapp" && <WhatsAppChannels />}
      </div>
    </div>
  );
}
