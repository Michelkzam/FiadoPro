import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import db from "@/lib/db";

export default function ResetPassword() {
  const hash = window.location.hash;
  const hashParams = new URLSearchParams(hash.substring(1));
  const accessToken = hashParams.get("access_token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Link Inválido</h1>
          <div className="bg-card rounded-xl border border-border p-6 space-y-3">
            <p className="text-sm text-destructive">O link de redefinição de senha é inválido ou expirou.</p>
            <a href="/forgot-password" className="text-primary hover:underline text-sm">Solicitar novo link</a>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("As senhas não coincidem"); return; }
    setLoading(true); setError("");
    try {
      await db.auth.resetPassword(accessToken, password);
      setDone(true);
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    } catch {
      setError("Erro ao redefinir senha");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-foreground text-center">Nova Senha</h1>
        {done ? (
          <div className="bg-card rounded-xl border border-border p-6 text-center space-y-3">
            <p className="text-green-600 font-medium">Senha redefinida com sucesso!</p>
            <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div><Label>Nova Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <div><Label>Confirmar Senha</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Redefinindo..." : "Redefinir Senha"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
