import { AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/constants";

export default function CreditLimitExceededPopup({ open, onClose, customer, cartTotal, onContactStore }) {
  const currentBalance = customer?.balance || 0;
  const creditLimit = customer?.credit_limit || 0;
  const newBalance = currentBalance + (cartTotal || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm border-amber-200 bg-amber-50/50">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle className="text-amber-800">Limite de Crédito Excedido</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-amber-900">
            Sua compra de <strong>{formatCurrency(cartTotal)}</strong> ultrapassaria seu limite de crédito.
          </p>

          <div className="bg-white rounded-lg border border-amber-200 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo atual:</span>
              <span className="font-semibold text-foreground">{formatCurrency(currentBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Limite de crédito:</span>
              <span className="font-semibold text-foreground">{formatCurrency(creditLimit)}</span>
            </div>
            <div className="border-t border-amber-200 pt-2 flex justify-between text-sm">
              <span className="font-medium text-amber-800">Novo saldo seria:</span>
              <span className="font-bold text-red-600">{formatCurrency(newBalance)}</span>
            </div>
          </div>

          <div className="bg-amber-100 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">O que fazer?</p>
            <p>Entre em contato com o estabelecimento para solicitar a liberação do crédito.</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button onClick={onContactStore} className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
            <Phone className="w-4 h-4" />
            Contatar Loja
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
