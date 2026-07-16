import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Store } from "lucide-react";

export default function PortalLogin({ onLogin, storeProfile }) {
  const [cpf, setCpf] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalize = (str) => str.replace(/\D/g, "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const normalizedCpf = normalize(cpf);
    const accessCode = code.toUpperCase();

    if (!normalizedCpf || normalizedCpf.length < 11) {
      setError("CPF inválido");
      return;
    }
    if (!accessCode || accessCode.length < 4) {
      setError("Código de acesso inválido");
      return;
    }

    setLoading(true);
    try {
      await onLogin(normalizedCpf, accessCode);
    } catch (err) {
      setError(err.message || "Erro ao verificar credenciais");
    } finally {
      setLoading(false);
    }
  };

  const formatCpf = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          {storeProfile?.logo_url ? (
            <img src={storeProfile.logo_url} alt="Logo" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-lg" />
          ) : (
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              {storeProfile?.store_name ? (
                <span className="text-2xl font-bold text-primary-foreground">{storeProfile.store_name[0]}</span>
              ) : (
                <Store className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">{storeProfile?.store_name || "Portal do Cliente"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Consulte seu saldo e faça pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <div>
            <Label>CPF</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>
          <div>
            <Label>Código de Acesso</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: ABC123"
              required
            />
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Acessar
              </span>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Solicite seu código de acesso ao estabelecimento
        </p>
      </div>
    </div>
  );
}
