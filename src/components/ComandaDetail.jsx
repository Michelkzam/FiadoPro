import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle, Clock, CreditCard, Banknote, Smartphone, XCircle, AlertTriangle } from "lucide-react";
import { useComandaActions } from "@/hooks/useActions";
import { useComandaItems } from "@/hooks/useQueries";
import { formatCurrency, COMANDA_STATUS_CONFIG, PAYMENT_METHODS } from "@/lib/constants";
import AddComandaItemDialog from "./AddComandaItemDialog";

export default function ComandaDetail({ comanda, onClose, onUpdate }) {
  const { removeItem, closeComanda, reopenComanda, cancelComanda, updateItemStatus, loading } = useComandaActions();
  const { data: items = [], refetch } = useComandaItems(comanda?.id);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [confirmRemoveItem, setConfirmRemoveItem] = useState(null);
  const [confirmCancelComanda, setConfirmCancelComanda] = useState(false);

  if (!comanda) return null;

  const statusConfig = COMANDA_STATUS_CONFIG[comanda.status] || COMANDA_STATUS_CONFIG.aberta;
  const isOpen = comanda.status === "aberta";

  const handleRemoveItem = async (itemId) => {
    await removeItem(itemId, comanda.id);
    setConfirmRemoveItem(null);
    refetch();
    onUpdate?.();
    toast.success("Item removido!");
  };

  const handleMarkDelivered = async (itemId) => {
    await updateItemStatus(itemId, "entregue");
    refetch();
  };

  const handleClose = async (paymentMethod = null) => {
    await closeComanda(comanda.id, paymentMethod);
    toast.success(paymentMethod ? "Comanda paga!" : "Comanda fechada!");
    setShowPayment(false);
    onUpdate?.();
    onClose();
  };

  const handleReopen = async () => {
    await reopenComanda(comanda.id);
    toast.success("Comanda reaberta!");
    onUpdate?.();
  };

  const handleCancelComanda = async () => {
    await cancelComanda(comanda.id);
    toast.success("Comanda cancelada!");
    setConfirmCancelComanda(false);
    onUpdate?.();
    onClose();
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {comanda.label}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </DialogTitle>
              {isOpen && (
                <Button size="sm" className="gap-1.5" onClick={() => setShowAddItem(true)}>
                  <Plus className="w-3.5 h-3.5" /> Item
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Mesa {comanda.table_number}
              {comanda.customer_cpf && ` • CPF: ${comanda.customer_cpf}`}
            </p>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-2">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                Nenhum item nesta comanda
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.status === "entregue" ? "bg-green-50 border-green-200" : "bg-background border-border"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                      {item.quantity > 1 && (
                        <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(item.unit_price)} {item.quantity > 1 && `× ${item.quantity}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    {formatCurrency(item.subtotal)}
                  </span>
                  {isOpen && (
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === "pendente" && (
                        <button
                          onClick={() => handleMarkDelivered(item.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Marcar como entregue"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmRemoveItem(item)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {item.status === "entregue" && (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(comanda.total || 0)}</span>
            </div>

            {isOpen ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Fechar
                  </Button>
                  <Button onClick={() => setShowPayment(true)} disabled={comanda.total <= 0} className="flex-1 gap-2">
                    <CreditCard className="w-4 h-4" /> Pagar
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setConfirmCancelComanda(true)}
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancelar Comanda
                </Button>
              </div>
            ) : comanda.status === "fechada" ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReopen} className="flex-1 gap-2">
                  <Clock className="w-4 h-4" /> Reabrir
                </Button>
                <Button onClick={() => setShowPayment(true)} disabled={comanda.total <= 0} className="flex-1 gap-2">
                  <CreditCard className="w-4 h-4" /> Pagamento
                </Button>
              </div>
            ) : (
              <p className="text-sm text-center text-green-600 font-medium">
                ✓ Paga via {PAYMENT_METHODS.find(m => m.value === comanda.payment_method)?.label || comanda.payment_method}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showAddItem && (
        <AddComandaItemDialog
          comandaId={comanda.id}
          onClose={() => {
            setShowAddItem(false);
            refetch();
            onUpdate?.();
          }}
        />
      )}

      {showPayment && (
        <Dialog open onOpenChange={() => setShowPayment(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Forma de Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <p className="text-center text-muted-foreground text-sm">
                Total: <span className="font-bold text-foreground">{formatCurrency(comanda.total || 0)}</span>
              </p>
              {[
                { value: "dinheiro", label: "Dinheiro", icon: Banknote },
                { value: "pix", label: "Pix", icon: Smartphone },
                { value: "cartao_credito", label: "Cartão de Crédito", icon: CreditCard },
                { value: "cartao_debito", label: "Cartão de Débito", icon: CreditCard },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleClose(value)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {confirmRemoveItem && (
        <AlertDialog open onOpenChange={() => setConfirmRemoveItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover item?</AlertDialogTitle>
              <AlertDialogDescription>
                Remover <strong>{confirmRemoveItem.product_name}</strong> ({formatCurrency(confirmRemoveItem.subtotal)}) desta comanda?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleRemoveItem(confirmRemoveItem.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {confirmCancelComanda && (
        <AlertDialog open onOpenChange={() => setConfirmCancelComanda(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Cancelar Comanda?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá <strong>excluir permanentemente</strong> a comanda <strong>{comanda.label}</strong> e todos os seus {items.length} item(ns). Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não, manter</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelComanda} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Sim, cancelar comanda
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
