import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Users, ShoppingBag } from "lucide-react";
import db from "@/lib/db";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState("comercio");
  const [storeProfile, setStoreProfile] = useState(null);

  useEffect(() => {
    db.entities.StoreProfile.list().then((p) => { if (p[0]) setStoreProfile(p[0]); }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (profile === "cliente") {
      window.location.href = "/portal";
      return;
    }
    setLoading(true);
    setError("");
    try {
      await db.auth.login(email, password);
      window.location.href = "/";
    } catch {
      setError("E-mail ou senha inválidos");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          {storeProfile?.logo_url ? (
            <img src={storeProfile.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">{storeProfile?.store_name || "Fiado"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Selecione seu perfil de acesso</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setProfile("comercio")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${profile === "comercio" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
          >
            <ShoppingBag className={`w-6 h-6 ${profile === "comercio" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${profile === "comercio" ? "text-primary" : "text-foreground"}`}>Comércio</span>
          </button>
          <button
            type="button"
            onClick={() => setProfile("cliente")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${profile === "cliente" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
          >
            <Users className={`w-6 h-6 ${profile === "cliente" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${profile === "cliente" ? "text-primary" : "text-foreground"}`}>Cliente</span>
          </button>
        </div>

        {profile === "cliente" ? (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">Acesse o portal do cliente com seu CPF/CNPJ e código de acesso.</p>
            <a href="/portal">
              <Button className="w-full">Acessar Portal do Cliente</Button>
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
            <div className="flex items-center justify-between text-sm">
              <a href="/forgot-password" className="text-primary hover:underline">Esqueceu a senha?</a>
              <a href="/register" className="text-primary hover:underline">Criar conta</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
