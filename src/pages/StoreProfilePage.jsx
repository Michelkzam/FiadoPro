import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { Save, Upload, Store, Bell, Landmark } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "../components/LoadingSpinner";
import db from "@/lib/db";
import { useStoreProfile } from "@/hooks/useQueries";

export default function StoreProfilePage() {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const [form, setForm] = useState(null);

  const { data: profiles = [], isLoading } = useStoreProfile();
  const profile = profiles[0];

  useEffect(() => {
    if (!form) {
      setForm({
        store_name: profile?.store_name || "",
        logo_url: profile?.logo_url || "",
        business_type: profile?.business_type || "pj",
        cnpj: profile?.cnpj || "",
        cpf: profile?.cpf || "",
        owner_name: profile?.owner_name || "",
        email: profile?.email || "",
        phone: profile?.phone || "",
        address: profile?.address || "",
        neighborhood: profile?.neighborhood || "",
        city: profile?.city || "",
        state: profile?.state || "",
        cep: profile?.cep || "",
        instagram: profile?.instagram || "",
        bank_name: profile?.bank_name || "",
        bank_agency: profile?.bank_agency || "",
        bank_account: profile?.bank_account || "",
        bank_account_type: profile?.bank_account_type || "",
        bank_holder: profile?.bank_holder || "",
        pix_key_1: profile?.pix_key_1 || "",
        pix_key_2: profile?.pix_key_2 || "",
        message_template: profile?.message_template || "Olá {nome}, você possui um saldo devedor de {valor} em nossa loja. Entre em contato para regularizar.",
        auto_message_enabled: profile?.auto_message_enabled || false,
        auto_message_interval_days: profile?.auto_message_interval_days || 15,
      });
    }
  }, [profile, form]);

  const save = useMutation({
    mutationFn: (data) =>
      profile
        ? db.entities.StoreProfile.update(profile.id, data)
        : db.entities.StoreProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_profile"] });
      toast.success("Perfil salvo!");
    },
  });

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, logo_url: file_url }));
  };

  if (isLoading || !form) {
    return <LoadingSpinner />;
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Store className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Perfil da Loja</h1>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-6">
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Informações da Loja</h2>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-muted"
              onClick={() => fileRef.current?.click()}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            <p className="text-sm text-muted-foreground">Clique para fazer upload do logotipo</p>
          </div>

          <div>
            <Label>Tipo de Negócio</Label>
            <Select value={form.business_type} onValueChange={(v) => setForm((f) => ({ ...f, business_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pj">Pessoa Jurídica (CNPJ)</SelectItem>
                <SelectItem value="pf">Pessoa Física / MEI (CPF)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Nome da Loja / Estabelecimento</Label><Input value={form.store_name} onChange={set("store_name")} /></div>
            {form.business_type === "pj" ? (
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0001-00" /></div>
            ) : (
              <div><Label>CPF</Label><Input value={form.cpf} onChange={set("cpf")} placeholder="000.000.000-00" /></div>
            )}
            <div><Label>Nome do Proprietário / Responsável</Label><Input value={form.owner_name} onChange={set("owner_name")} /></div>
            <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
            <div><Label>Telefone / WhatsApp</Label><Input value={form.phone} onChange={set("phone")} /></div>
            <div><Label>Instagram</Label><Input value={form.instagram} onChange={set("instagram")} placeholder="@suaLoja" /></div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Dados Bancários</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Nome do Banco</Label><Input value={form.bank_name} onChange={set("bank_name")} placeholder="Ex: Bradesco, Itaú, Nubank..." /></div>
            <div><Label>Agência</Label><Input value={form.bank_agency} onChange={set("bank_agency")} placeholder="0000-0" /></div>
            <div><Label>Conta Corrente</Label><Input value={form.bank_account} onChange={set("bank_account")} placeholder="00000000-0" /></div>
            <div><Label>Tipo de Conta</Label>
              <Select value={form.bank_account_type || "corrente"} onValueChange={(v) => setForm((f) => ({ ...f, bank_account_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Conta Poupança</SelectItem>
                  <SelectItem value="pagamento">Conta de Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Titular da Conta</Label><Input value={form.bank_holder} onChange={set("bank_holder")} placeholder="Nome do titular" /></div>
            <div><Label>Chave Pix Principal</Label><Input value={form.pix_key_1 || ""} onChange={set("pix_key_1")} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" /></div>
            <div><Label>Chave Pix Secundária</Label><Input value={form.pix_key_2 || ""} onChange={set("pix_key_2")} placeholder="Segunda chave Pix (opcional)" /></div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>CEP</Label><Input value={form.cep} onChange={set("cep")} placeholder="00000-000" /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.address} onChange={set("address")} /></div>
            <div><Label>Bairro</Label><Input value={form.neighborhood} onChange={set("neighborhood")} /></div>
            <div><Label>Cidade</Label><Input value={form.city} onChange={set("city")} /></div>
            <div><Label>Estado (UF)</Label><Input value={form.state} onChange={set("state")} maxLength={2} placeholder="SP" /></div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Mensagens Automáticas de Cobrança</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ativar envio automático</p>
              <p className="text-xs text-muted-foreground">Enviar cobrança via WhatsApp para clientes devedores</p>
            </div>
            <Switch checked={form.auto_message_enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, auto_message_enabled: v }))} />
          </div>
          {form.auto_message_enabled && (
            <div>
              <Label>Intervalo de Envio</Label>
              <Select value={String(form.auto_message_interval_days)} onValueChange={(v) => setForm((f) => ({ ...f, auto_message_interval_days: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Todo dia</SelectItem>
                  <SelectItem value="3">A cada 3 dias</SelectItem>
                  <SelectItem value="5">A cada 5 dias</SelectItem>
                  <SelectItem value="7">Semanal</SelectItem>
                  <SelectItem value="10">A cada 10 dias</SelectItem>
                  <SelectItem value="15">A cada 15 dias</SelectItem>
                  <SelectItem value="30">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Modelo de Mensagem</Label>
            <Textarea value={form.message_template} onChange={set("message_template")} rows={3} />
            <p className="text-xs text-muted-foreground mt-1">Use {"{nome}"} e {"{valor}"} como variáveis</p>
          </div>
        </div>

        <Button type="submit" disabled={save.isPending} className="w-full gap-2">
          <Save className="w-4 h-4" /> {save.isPending ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </form>
    </div>
  );
}
