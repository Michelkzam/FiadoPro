import { useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, User, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/constants";
import db from "@/lib/db";
import { toast } from "sonner";

export default function CreditLimitApprovalPopup({ open, onClose, order, onApprove, onReject }) {
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const currentBalance = order.customer_balance || 0;
  const creditLimit = order.customer_credit_limit || 0;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await db.entities.Order.update(order.id, { status: "aprovado" });
      const currentCustomer = await db.entities.Customer.get(order.customer_id);
      if (currentCustomer) {
        const newBalance = (currentCustomer.balance || 0) + order.amount;
        await db.entities.Customer.update(order.customer_id, { balance: newBalance });
      }
      toast.success("Pedido aprovado e registrado como fiado!");
      onApprove?.();
      onClose();
    } catch (err) {
      toast.error("Erro ao aprovar pedido");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await db.entities.Order.update(order.id, { status: "recusado" });
      toast.success("Pedido recusado");
      onReject?.();
      onClose();
    } catch (err) {
      toast.error("Erro ao recusar pedido");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-red-200 bg-red-50/30">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle className="text-red-800">Limite de Crédito Excedido</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-white rounded-lg border border-red-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Compra: <strong>{formatCurrency(order.amount)}</strong></span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-red-200 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo atual:</span>
              <span className="font-semibold text-foreground">{formatCurrency(currentBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Limite de crédito:</span>
              <span className="font-semibold text-foreground">{formatCurrency(creditLimit)}</span>
            </div>
            <div className="border-t border-red-200 pt-2 flex justify-between text-sm">
              <span className="font-medium text-red-800">Novo saldo seria:</span>
              <span className="font-bold text-red-600">{formatCurrency(currentBalance + order.amount)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            O cliente <strong>{order.customer_name}</strong> está solicitando uma compra que excede seu limite de crédito.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={loading}
            className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" />
            Recusar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            {loading ? "Aprovando..." : "Aceitar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
