import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import db from "@/lib/db";
import { formatCurrency, PAYMENT_METHODS } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/sendWhatsApp";

export default function PaymentDialog({ customer, onClose, onSuccess }) {
  const [paymentType, setPaymentType] = useState("unico");
  const [amount1, setAmount1] = useState("");
  const [method1, setMethod1] = useState("dinheiro");
  const [amount2, setAmount2] = useState("");
  const [method2, setMethod2] = useState("pix");
  const [loading, setLoading] = useState(false);

  const totalDebito = customer.balance || 0;

  const handlePay = async () => {
    const total = paymentType === "unico"
      ? parseFloat(amount1) || 0
      : (parseFloat(amount1) || 0) + (parseFloat(amount2) || 0);

    if (total <= 0) {
      toast.error("Informe um valor de pagamento");
      return;
    }

    setLoading(true);
    const today = format(new Date(), "dd/MM/yyyy");
    const now = format(new Date(), "HH:mm");

    const desc = paymentType === "dividido"
      ? `Pagamento dividido: ${formatCurrency(parseFloat(amount1) || 0)} (${PAYMENT_METHODS.find(m => m.value === method1)?.label}) + ${formatCurrency(parseFloat(amount2) || 0)} (${PAYMENT_METHODS.find(m => m.value === method2)?.label})`
      : `Pagamento via ${PAYMENT_METHODS.find(m => m.value === method1)?.label}`;

    await db.entities.Transaction.create({
      customer_id: customer.id,
      customer_name: customer.name,
      type: "pagamento",
      amount: total,
      date: today,
      time: now,
      description: desc,
    });

    const newBalance = totalDebito - total;
    await db.entities.Customer.update(customer.id, { balance: newBalance });

    if (customer.phone) {
      let saldoMsg = "";
      if (newBalance < 0) {
        saldoMsg = `Você possui *${formatCurrency(Math.abs(newBalance))} de crédito* disponível para sua próxima compra!`;
      } else if (newBalance === 0) {
        saldoMsg = `Sua conta está *zerada*. Obrigado!`;
      } else {
        saldoMsg = `Saldo restante em aberto: *${formatCurrency(newBalance)}*.`;
      }
      const msg = `Olá ${customer.name}! Recebemos seu pagamento de *${formatCurrency(total)}*.\n\n${saldoMsg}\n\nObrigado!`;
      sendWhatsApp(customer.phone, msg);
    }

    toast.success("Pagamento registrado!");
    setLoading(false);
    onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <p className="font-semibold text-foreground">{customer.name}</p>
            <p className="text-sm text-muted-foreground">Saldo devedor: <span className="font-bold text-red-600">{formatCurrency(totalDebito)}</span></p>
          </div>

          <div>
            <Label className="mb-2 block">Forma de Pagamento</Label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setPaymentType("unico")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${paymentType === "unico" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                Único
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("dividido")}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${paymentType === "dividido" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                Dividido (2 formas)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{paymentType === "dividido" ? "Pagamento 1" : "Valor"}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                className="flex-1"
              />
              <select
                value={method1}
                onChange={(e) => setMethod1(e.target.value)}
                className="border border-input rounded-md px-2 text-sm bg-background text-foreground"
              >
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {paymentType === "dividido" && (
            <div className="space-y-2">
              <Label>Pagamento 2</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={amount2}
                  onChange={(e) => setAmount2(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={method2}
                  onChange={(e) => setMethod2(e.target.value)}
                  className="border border-input rounded-md px-2 text-sm bg-background text-foreground"
                >
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {(amount1 || amount2) && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-2 text-center text-sm">
              <span className="text-green-700">Total: <strong>{formatCurrency((parseFloat(amount1) || 0) + (paymentType === "dividido" ? (parseFloat(amount2) || 0) : 0))}</strong></span>
            </div>
          )}

          <Button onClick={handlePay} disabled={loading} className="w-full gap-2 bg-green-600 hover:bg-green-700">
            <CreditCard className="w-4 h-4" />
            {loading ? "Registrando..." : "Confirmar Pagamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
