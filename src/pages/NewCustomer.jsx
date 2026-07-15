import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import db from "@/lib/db";
import { generateAccessCode } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { notifyNewCustomer } from "@/lib/notify";

export default function NewCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState("cpf");
  const [form, setForm] = useState({
    name: "", cpf: "", phone: "", email: "", cep: "", address: "", neighborhood: "", city: "", state: "", credit_limit: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const sendWelcomeWhatsApp = async (customer, code) => {
    if (!customer.phone) return;
    const docLabel = docType === "cnpj" ? "CNPJ" : "CPF";
    const docValue = customer.cpf || "";
    const msg = `Olá ${customer.name}! Seu cadastro foi realizado com sucesso.\n\n` +
      `📋 *Dados de Acesso ao Portal:*\n` +
      `${docLabel}: ${docValue}\n` +
      `Código de Acesso: ${code}\n\n` +
      `Acesse o portal para consultar seu saldo e fazer pedidos. 😊`;
    await sendWhatsApp(customer.phone, msg);
  };

  const create = useMutation({
    mutationFn: (data) => {
      const code = generateAccessCode();
      return db.entities.Customer.create({ ...data, balance: 0, status: "ativo", access_code: code })
        .then(async (created) => {
          await sendWelcomeWhatsApp(created, created.access_code || code);
          notifyNewCustomer(created.name);
          return created;
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente cadastrado! Dados enviados via WhatsApp.");
      navigate("/clientes");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    create.mutate(form);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Novo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nome Completo</Label>
            <Input value={form.name} onChange={set("name")} placeholder="Nome do cliente" />
          </div>

          <div className="md:col-span-2">
            <Label>Tipo de Documento</Label>
            <div className="flex gap-3 mt-1">
              <button type="button" onClick={() => setDocType("cpf")}
                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${docType === "cpf" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}>
                CPF (Pessoa Física)
              </button>
              <button type="button" onClick={() => setDocType("cnpj")}
                className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${docType === "cnpj" ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}>
                CNPJ (Pessoa Jurídica)
              </button>
            </div>
          </div>

          <div>
            <Label>{docType === "cnpj" ? "CNPJ" : "CPF"}</Label>
            <Input value={form.cpf} onChange={set("cpf")} placeholder={docType === "cnpj" ? "00.000.000/0001-00" : "000.000.000-00"} />
          </div>
          <div>
            <Label>Telefone (WhatsApp)</Label>
            <Input value={form.phone} onChange={set("phone")} placeholder="(00) 00000-0000" />
          </div>
          <div className="md:col-span-2">
            <Label>E-mail</Label>
            <Input value={form.email} onChange={set("email")} placeholder="email@exemplo.com" type="email" />
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={form.cep} onChange={set("cep")} placeholder="00000-000" />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={form.neighborhood} onChange={set("neighborhood")} placeholder="Bairro" />
          </div>
          <div className="md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.address} onChange={set("address")} placeholder="Rua, número, complemento" />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={form.city} onChange={set("city")} placeholder="Cidade" />
          </div>
          <div>
            <Label>Estado</Label>
            <Input value={form.state} onChange={set("state")} placeholder="UF" />
          </div>
          <div>
            <Label>Limite de Crédito (R$)</Label>
            <Input type="number" min="0" step="0.01" value={form.credit_limit} onChange={set("credit_limit")} placeholder="0,00 (deixe vazio para sem limite)" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            <Save className="w-4 h-4" /> {create.isPending ? "Salvando..." : "Cadastrar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
