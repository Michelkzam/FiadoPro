import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, CreditCard, AlertTriangle, Clock, Percent, DollarSign, ShoppingCart, Bell } from "lucide-react";
import db from "@/lib/db";
import { toast } from "sonner";

export default function BusinessRulesSettings() {
  const [settings, setSettings] = useState({
    min_order_value: 0,
    delivery_fee_default: 0,
    late_fee_percentage: 0,
    early_payment_discount: 0,
    auto_cancel_minutes: 30,
    credit_alert_threshold: 80,
    cashback_enabled: false,
    default_cashback_percentage: 0,
    loyalty_enabled: false,
    loyalty_points_per_real: 1,
    catalog_enabled: false,
    auto_message_enabled: false,
    auto_message_interval_days: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const profiles = await db.entities.StoreProfile.list();
      if (profiles[0]) {
        setSettings((prev) => ({ ...prev, ...profiles[0] }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const profiles = await db.entities.StoreProfile.list();
      if (profiles[0]) {
        await db.entities.StoreProfile.update(profiles[0].id, settings);
      } else {
        await db.entities.StoreProfile.create(settings);
      }
      toast.success("Configurações salvas com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Regras de Negócio</h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Pedidos</h3>
          </div>
          <div>
            <Label>Valor Mínimo do Pedido (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={settings.min_order_value}
              onChange={(e) => setSettings({ ...settings, min_order_value: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground mt-1">Pedidos abaixo deste valor serão bloqueados</p>
          </div>
          <div>
            <Label>Taxa de Entrega Padrão (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={settings.delivery_fee_default}
              onChange={(e) => setSettings({ ...settings, delivery_fee_default: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>Auto-cancelar Pedidos Pendentes (minutos)</Label>
            <Input
              type="number"
              min="1"
              value={settings.auto_cancel_minutes}
              onChange={(e) => setSettings({ ...settings, auto_cancel_minutes: parseInt(e.target.value) || 30 })}
            />
            <p className="text-xs text-muted-foreground mt-1">Pedidos pendentes serão cancelados automaticamente</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Crédito & Pagamento</h3>
          </div>
          <div>
            <Label>Taxa de Atraso (% ao mês)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.late_fee_percentage}
              onChange={(e) => setSettings({ ...settings, late_fee_percentage: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground mt-1">Juros aplicados automaticamente sobre saldos em atraso</p>
          </div>
          <div>
            <Label>Desconto Pagamento Antecipado (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.early_payment_discount}
              onChange={(e) => setSettings({ ...settings, early_payment_discount: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground mt-1">Desconto concedido ao pagar antes do vencimento</p>
          </div>
          <div>
            <Label>Alerta de Limite (%)</Label>
            <Input
              type="number"
              step="1"
              min="1"
              max="100"
              value={settings.credit_alert_threshold}
              onChange={(e) => setSettings({ ...settings, credit_alert_threshold: parseInt(e.target.value) || 80 })}
            />
            <p className="text-xs text-muted-foreground mt-1">Notificar quando saldo atingir este % do limite</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Cashback</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Habilitar Cashback</Label>
              <p className="text-xs text-muted-foreground">Clientes ganham % de volta em cada compra</p>
            </div>
            <Switch
              checked={settings.cashback_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, cashback_enabled: v })}
            />
          </div>
          {settings.cashback_enabled && (
            <div>
              <Label>% de Cashback Padrão</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.default_cashback_percentage}
                onChange={(e) => setSettings({ ...settings, default_cashback_percentage: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label>Programa de Fidelidade</Label>
              <p className="text-xs text-muted-foreground">Clientes acumulam pontos a cada compra</p>
            </div>
            <Switch
              checked={settings.loyalty_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, loyalty_enabled: v })}
            />
          </div>
          {settings.loyalty_enabled && (
            <div>
              <Label>Pontos por Real Gasto</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={settings.loyalty_points_per_real}
                onChange={(e) => setSettings({ ...settings, loyalty_points_per_real: parseFloat(e.target.value) || 1 })}
              />
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notificações</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Mensagens Automáticas</Label>
              <p className="text-xs text-muted-foreground">Enviar lembretes automáticos de pagamento</p>
            </div>
            <Switch
              checked={settings.auto_message_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, auto_message_enabled: v })}
            />
          </div>
          {settings.auto_message_enabled && (
            <div>
              <Label>Intervalo (dias)</Label>
              <Input
                type="number"
                min="1"
                value={settings.auto_message_interval_days}
                onChange={(e) => setSettings({ ...settings, auto_message_interval_days: parseInt(e.target.value) || 15 })}
              />
              <p className="text-xs text-muted-foreground mt-1">Enviar lembrete a cada X dias para clientes com saldo</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label>Catálogo Online</Label>
              <p className="text-xs text-muted-foreground">Habilitar página de catálogo para clientes</p>
            </div>
            <Switch
              checked={settings.catalog_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, catalog_enabled: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
