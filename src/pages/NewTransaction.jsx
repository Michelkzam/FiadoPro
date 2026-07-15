import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { ArrowLeft, ShoppingCart, Banknote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCustomer, useStoreProfile } from "@/hooks/useQueries";
import { useTransactionActions } from "@/hooks/useActions";

export default function NewTransaction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer } = useCustomer(id);
  const { data: storeProfiles = [] } = useStoreProfile();
  const storeName = storeProfiles[0]?.store_name || "Nossa Loja";

  const urlParams = new URLSearchParams(window.location.search);
  const [type, setType] = useState(urlParams.get("type") || "compra");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const { registerTransaction, sendTransactionWhatsApp, loading } = useTransactionActions(customer);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    const result = await registerTransaction({ type, amount, description });
    if (result) {
      sendTransactionWhatsApp(result, storeName);
      toast.success(`${type === "compra" ? "Compra" : "Pagamento"} registrado!`);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      navigate(`/clientes/${id}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nova Transação</h1>
          {customer && <p className="text-sm text-muted-foreground">{customer.name}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType("compra")}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-medium ${
              type === "compra"
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <ShoppingCart className="w-5 h-5" /> Compra
          </button>
          <button
            type="button"
            onClick={() => setType("pagamento")}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-medium ${
              type === "pagamento"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <Banknote className="w-5 h-5" /> Pagamento
          </button>
        </div>

        <div>
          <Label>Valor (R$) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0,00"
            className="text-lg font-semibold"
          />
        </div>

        <div>
          <Label>Descrição (opcional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes da transação..."
            rows={3}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Data: {format(new Date(), "dd/MM/yyyy")} às {format(new Date(), "HH:mm")}
        </p>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Registrando..." : `Registrar ${type === "compra" ? "Compra" : "Pagamento"}`}
        </Button>
      </form>
    </div>
  );
}
