import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "../components/LoadingSpinner";
import db from "@/lib/db";
import { useCustomer } from "@/hooks/useQueries";

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);

  const { data: customer } = useCustomer(id);

  useEffect(() => {
    if (customer && !form) {
      setForm({
        name: customer.name || "", cpf: customer.cpf || "", phone: customer.phone || "",
        email: customer.email || "", cep: customer.cep || "", address: customer.address || "",
        neighborhood: customer.neighborhood || "", city: customer.city || "", state: customer.state || "",
        credit_limit: customer.credit_limit || "",
      });
    }
  }, [customer, form]);

  const update = useMutation({
    mutationFn: (data) => db.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente atualizado!");
      navigate(`/clientes/${id}`);
    },
  });

  if (!form) return <LoadingSpinner />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-foreground">Editar Cliente</h1>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); update.mutate(form); }} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Label>Nome *</Label><Input value={form.name} onChange={set("name")} required /></div>
          <div><Label>CPF *</Label><Input value={form.cpf} onChange={set("cpf")} required /></div>
          <div><Label>Telefone *</Label><Input value={form.phone} onChange={set("phone")} required /></div>
          <div className="md:col-span-2"><Label>E-mail</Label><Input value={form.email} onChange={set("email")} /></div>
          <div><Label>CEP</Label><Input value={form.cep} onChange={set("cep")} /></div>
          <div><Label>Bairro</Label><Input value={form.neighborhood} onChange={set("neighborhood")} /></div>
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.address} onChange={set("address")} /></div>
          <div><Label>Cidade</Label><Input value={form.city} onChange={set("city")} /></div>
          <div><Label>Estado</Label><Input value={form.state} onChange={set("state")} /></div>
          <div><Label>Limite de Crédito (R$)</Label><Input type="number" min="0" step="0.01" value={form.credit_limit} onChange={set("credit_limit")} placeholder="0,00 (sem limite)" /></div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={update.isPending} className="gap-2"><Save className="w-4 h-4" /> Salvar</Button>
        </div>
      </form>
    </div>
  );
}
