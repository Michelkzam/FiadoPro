import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Send, Trash2, Edit, FileDown } from "lucide-react";
import { downloadTransactionPDF, downloadStatementPDF } from "../utils/pdfUtils";
import { Button } from "@/components/ui/button";
import BalanceBadge from "../components/BalanceBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import db from "@/lib/db";
import { useCustomer, useTransactions } from "@/hooks/useQueries";
import { formatCurrency } from "@/lib/constants";
import { sendWhatsApp } from "@/lib/sendWhatsApp";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useCustomer(id);
  const { data: transactions = [] } = useTransactions(id);

  const deleteCustomer = useMutation({
    mutationFn: () => db.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente excluído");
      navigate("/clientes");
    },
  });

  const sendPositiveBalanceMsg = () => {
    if (!customer?.phone) return;
    const credit = formatCurrency(Math.abs(customer.balance));
    const msg = `Olá ${customer.name}! Você possui um *saldo positivo* de *${credit}* disponível na nossa loja. Esse crédito pode ser utilizado na sua próxima compra. Obrigado! 😊`;
    sendWhatsApp(customer.phone, msg);
  };

  const sendReceiptWhatsApp = (transaction) => {
    if (!customer?.phone) return;
    const msg = transaction
      ? `*Recibo de ${transaction.type === "compra" ? "Compra" : "Pagamento"}*\n\nCliente: ${customer.name}\nData: ${transaction.date}\nValor: ${formatCurrency(transaction.amount)}\n\n*Saldo devedor: ${formatCurrency(customer.balance || 0)}*`
      : `Olá ${customer.name}, seu saldo devedor atual é de *${formatCurrency(customer.balance || 0)}*. Entre em contato para mais informações.`;
    sendWhatsApp(customer.phone, msg);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!customer) {
    return <p className="text-center py-10 text-muted-foreground">Cliente não encontrado</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" /> {customer.phone}
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" /> {customer.email}
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" /> {customer.address}, {customer.neighborhood} - {customer.city}/{customer.state}
              </div>
            )}
            <p className="text-xs text-muted-foreground">CPF: {customer.cpf}</p>
            <p className="text-xs text-muted-foreground">Código de acesso: <span className="font-mono font-bold text-primary">{customer.access_code}</span></p>
            {(customer.credit_limit || 0) > 0 && (
              <p className="text-xs text-muted-foreground">Limite de crédito: <span className="font-semibold text-foreground">{formatCurrency(customer.credit_limit)}</span></p>
            )}
          </div>
          <div className="text-right space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {(customer.balance || 0) < 0 ? "Saldo Positivo (Crédito)" : "Saldo Devedor"}
            </p>
            <BalanceBadge balance={customer.balance || 0} size="lg" />
            {customer.credit_limit > 0 && (
              <p className="text-xs text-muted-foreground">Limite: {formatCurrency(customer.credit_limit || 0)}</p>
            )}
            {customer.credit_limit > 0 && (customer.balance || 0) > (customer.credit_limit || 0) && (
              <div className="mt-1 p-2 bg-red-50 border border-red-300 rounded-lg text-left space-y-2">
                <p className="text-xs font-bold text-red-700">⚠️ Limite de crédito excedido!</p>
                <p className="text-xs text-red-600">
                  Saldo: {formatCurrency(customer.balance)} | Limite: {formatCurrency(customer.credit_limit)}
                </p>
                <Button
                  size="sm"
                  className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs"
                  onClick={async () => {
                    const novoLimite = prompt("Novo limite de crédito (R$):", customer.credit_limit);
                    if (novoLimite && parseFloat(novoLimite) > 0) {
                      await db.entities.Customer.update(customer.id, { credit_limit: parseFloat(novoLimite) });
                      toast.success("Limite atualizado! Cliente pode fazer novas compras.");
                      window.location.reload();
                    }
                  }}
                >
                  🔓 Liberar Crédito
                </Button>
              </div>
            )}
            {(customer.balance || 0) < 0 && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <p className="text-sm font-bold text-blue-700 mb-2">{formatCurrency(Math.abs(customer.balance || 0))} de crédito</p>
                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white w-full" onClick={sendPositiveBalanceMsg}>
                  <Send className="w-3.5 h-3.5" /> Notificar Cliente
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadStatementPDF(customer, transactions)}>
            <FileDown className="w-4 h-4" /> Extrato PDF
          </Button>
          <Link to={`/clientes/${id}/editar`}>
            <Button variant="outline" size="sm" className="gap-2"><Edit className="w-4 h-4" /> Editar</Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2"><Trash2 className="w-4 h-4" /> Excluir</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteCustomer.mutate()}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Histórico de Transações</h2>
        </div>
        <div className="divide-y divide-border">
          {transactions.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma transação registrada</p>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {t.type === "compra" ? "🛒 Compra" : "💰 Pagamento"}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.date} {t.time && `às ${t.time}`}</p>
                  {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${t.type === "compra" ? "text-red-600" : "text-green-600"}`}>
                    {t.type === "compra" ? "-" : "+"} {formatCurrency(t.amount)}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => downloadTransactionPDF(customer, t)} title="Baixar recibo PDF">
                    <FileDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => sendReceiptWhatsApp(t)} title="Enviar recibo via WhatsApp">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
