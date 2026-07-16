import { LogOut, Moon, Sun } from "lucide-react";

export default function PortalHeader({ customerName, storeProfile, darkMode, onToggleTheme, onLogout }) {
  return (
    <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
      <div className="flex items-center gap-3">
        {storeProfile?.logo_url ? (
          <img src={storeProfile.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
        ) : (
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold">{storeProfile?.store_name?.[0] || "L"}</span>
          </div>
        )}
        <div>
          <p className="font-semibold text-sm">Olá, {customerName?.split(" ")[0]}</p>
          <p className="text-[10px] opacity-80">{storeProfile?.store_name || "Loja"}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onToggleTheme} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
