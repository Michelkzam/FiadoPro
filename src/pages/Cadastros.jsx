import { useState } from "react";
import { Users, Package } from "lucide-react";
import Customers from "./Customers";
import Products from "./Products";

const tabs = [
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "produtos", label: "Produtos", icon: Package },
];

export default function Cadastros() {
  const [activeTab, setActiveTab] = useState("clientes");

  return (
    <div className="space-y-6">
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

      <div>
        {activeTab === "clientes" && <Customers />}
        {activeTab === "produtos" && <Products />}
      </div>
    </div>
  );
}
