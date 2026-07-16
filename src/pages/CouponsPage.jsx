import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Tag, Percent, DollarSign, Copy, Check } from "lucide-react";
import { useCoupons } from "@/hooks/useFeatures";
import { toast } from "sonner";

export default function CouponsPage() {
  const { create, list, deactivate, loading } = useCoupons();
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_purchase: "",
    max_uses: "",
    valid_until: "",
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    const data = await list();
    setCoupons(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await create({
        ...form,
        discount_value: parseFloat(form.discount_value),
        min_purchase: parseFloat(form.min_purchase) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
      });
      toast.success("Cupom criado com sucesso!");
      setForm({ code: "", discount_type: "percentage", discount_value: "", min_purchase: "", max_uses: "", valid_until: "" });
      setShowForm(false);
      loadCoupons();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeactivate = async (id) => {
    await deactivate(id);
    toast.success("Cupom desativado");
    loadCoupons();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cupons de Desconto</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie cupons promocionais</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Cupom
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código do Cupom</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Ex: DESCONTO10"
                required
              />
            </div>
            <div>
              <Label>Tipo de Desconto</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, discount_type: "percentage" })}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    form.discount_type === "percentage" ? "border-primary bg-primary/5 text-primary" : "border-border"
                  }`}
                >
                  <Percent className="w-4 h-4 inline mr-1" /> Percentual
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, discount_type: "fixed" })}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    form.discount_type === "fixed" ? "border-primary bg-primary/5 text-primary" : "border-border"
                  }`}
                >
                  <DollarSign className="w-4 h-4 inline mr-1" /> Valor Fixo
                </button>
              </div>
            </div>
            <div>
              <Label>{form.discount_type === "percentage" ? "Percentual (%)" : "Valor (R$)"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Compra Mínima (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.min_purchase}
                onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Limite de Usos</Label>
              <Input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Ilimitado"
              />
            </div>
            <div>
              <Label>Válido até</Label>
              <Input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar Cupom"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cupom criado</p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className={`bg-card rounded-xl border border-border p-4 flex items-center justify-between ${!coupon.active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${coupon.discount_type === "percentage" ? "bg-purple-100 text-purple-600" : "bg-green-100 text-green-600"}`}>
                  {coupon.discount_type === "percentage" ? <Percent className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-foreground">{coupon.code}</p>
                    <button onClick={() => copyCode(coupon.code)} className="text-muted-foreground hover:text-foreground">
                      {copied === coupon.code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {coupon.discount_type === "percentage" ? `${coupon.discount_value}% de desconto` : `${formatCurrency(coupon.discount_value)} de desconto`}
                    {coupon.min_purchase > 0 && ` • Mínimo: ${formatCurrency(coupon.min_purchase)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usado {coupon.used_count}x {coupon.max_uses ? `/ ${coupon.max_uses}` : ""}
                    {coupon.valid_until && ` • Válido até ${new Date(coupon.valid_until).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${coupon.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {coupon.active ? "Ativo" : "Inativo"}
                </span>
                {coupon.active && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeactivate(coupon.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatCurrency(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
