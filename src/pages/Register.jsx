import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";
import db from "@/lib/db";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("As senhas não coincidem"); return; }
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    setLoading(true); setError("");
    try {
      await db.auth.register({ email, password });
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Erro ao criar conta. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Criar Conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastre-se como lojista</p>
        </div>
        <form onSubmit={handleRegister} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          <div><Label>Confirmar Senha</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar Conta"}</Button>
          <p className="text-center text-sm text-muted-foreground">Já tem conta? <a href="/login" className="text-primary hover:underline">Entrar</a></p>
        </form>
      </div>
    </div>
  );
}
