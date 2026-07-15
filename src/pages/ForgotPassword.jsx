import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import db from "@/lib/db";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await db.auth.forgotPassword(email); } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Recuperar Senha</h1>
        </div>
        {sent ? (
          <div className="bg-card rounded-xl border border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.</p>
            <Link to="/login"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Voltar ao login</Button></Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar Link"}</Button>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">Voltar ao login</Link>
          </form>
        )}
      </div>
    </div>
  );
}
