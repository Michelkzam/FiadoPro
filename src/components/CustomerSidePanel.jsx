import { X, Phone, Mail, MapPin, Send, TrendingDown, TrendingUp, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCustomer } from "@/hooks/useQueries";
import { formatCurrency, openWhatsApp } from "@/lib/constants";

export default function CustomerSidePanel({ customerId, onClose }) {
  const { data: customer, isLoading } = useCustomer(customerId);

  const sendPositiveBalanceMsg = () => {
    if (!customer?.phone) return;
    const credit = formatCurrency(Math.abs(customer.balance));
    const msg = `Olá ${customer.name}! Você possui um *saldo positivo* de *${credit}* disponível na nossa loja. Esse crédito pode ser utilizado na sua próxima compra. Obrigado! 😊`;
    openWhatsApp(customer.phone, msg);
  };

  const balance = customer?.balance || 0;
  const isPositive = balance < 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Dados do Cliente</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : customer ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                {customer.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{customer.name}</p>
                {customer.cpf && <p className="text-xs text-muted-foreground">CPF: {customer.cpf}</p>}
              </div>
            </div>

            <div className="space-y-2">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" /> {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" /> {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{customer.address}{customer.neighborhood ? `, ${customer.neighborhood}` : ""}{customer.city ? ` - ${customer.city}` : ""}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              {balance > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-foreground">Saldo Devedor</span>
                  </div>
                  <span className="font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-0.5 text-sm">
                    {formatCurrency(balance)}
                  </span>
                </div>
              )}

              {isPositive && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-foreground">Saldo Positivo</span>
                    </div>
                    <span className="font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-0.5 text-sm">
                      {formatCurrency(Math.abs(balance))}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={sendPositiveBalanceMsg}
                  >
                    <Send className="w-3.5 h-3.5" /> Avisar cliente sobre crédito
                  </Button>
                </div>
              )}

              {balance === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span className="font-medium">✅ Sem débitos</span>
                </div>
              )}
            </div>

            <Link to={`/clientes/${customerId}`} onClick={onClose}>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Link2 className="w-3.5 h-3.5" /> Ver perfil completo
              </Button>
            </Link>
          </div>
        ) : (
          <p className="p-6 text-center text-muted-foreground text-sm">Cliente não encontrado</p>
        )}
      </div>
    </>
  );
}
