import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { generatePixPayload } from "@/utils/pixUtils";
import { formatCurrency } from "@/lib/constants";
import { toast } from "sonner";
import { Copy, Check, Smartphone } from "lucide-react";

export default function PortalAccount({ customer, storeProfile, pendingOrders }) {
  const [pixAmount, setPixAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const balance = customer?.balance || 0;
  const creditLimit = customer?.credit_limit || 0;

  const copyPixKey = () => {
    navigator.clipboard.writeText(storeProfile?.pix_key_1 || "");
    setCopied(true);
    toast.success("Chave Pix copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <div className={`rounded-2xl border shadow-sm p-6 text-center transition-colors ${
        balance < 0 ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800" :
        balance > 0 ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800" :
        "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
      }`}>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          {balance < 0 ? "Seu Crédito" : balance > 0 ? "Saldo em Aberto" : "Saldo"}
        </p>
        <p className={`text-4xl font-bold ${
          balance < 0 ? "text-blue-600" : balance > 0 ? "text-red-600" : "text-green-600"
        }`}>
          {formatCurrency(Math.abs(balance))}
        </p>
        {balance < 0 && (
          <p className="text-xs text-blue-600 mt-2">🎉 Você tem crédito disponível!</p>
        )}
        {creditLimit > 0 && balance > 0 && balance <= creditLimit && (
          <p className="text-xs text-muted-foreground mt-2">
            Limite: {formatCurrency(creditLimit)} | Disponível: {formatCurrency(creditLimit - balance)}
          </p>
        )}
        {creditLimit > 0 && balance > creditLimit && (
          <div className="mt-3 p-3 bg-amber-100 border border-amber-300 rounded-xl">
            <p className="text-xs font-semibold text-amber-700">⚠️ Limite de crédito excedido</p>
            <p className="text-[11px] text-amber-600 mt-1">Aguarde liberação do lojista</p>
          </div>
        )}
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800">
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
              Pedidos em Aberto ({pendingOrders.length})
            </p>
          </div>
          <div className="divide-y divide-border">
            {pendingOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-sm text-foreground truncate">{o.description || "Pedido"}</p>
                  <p className="text-[11px] text-muted-foreground">{o.status.replace(/_/g, " ")}</p>
                </div>
                <span className="font-bold text-sm text-amber-600 shrink-0">{formatCurrency(o.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account OK */}
      {pendingOrders.length === 0 && balance <= 0 && (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">✅</span>
          </div>
          <p className="text-sm font-medium text-foreground">Sua conta está em dia!</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum saldo pendente</p>
        </div>
      )}

      {/* Pix Payment */}
      {balance > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Pagar com Pix</p>
              <p className="text-[11px] text-muted-foreground">Escaneie o QR Code ou copie a chave</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              placeholder={formatCurrency(balance)}
              value={pixAmount}
              onChange={(e) => setPixAmount(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPixAmount(String(balance))}
                className="flex-1 py-2 text-xs rounded-xl border border-border hover:bg-muted transition-colors font-medium"
              >
                Valor total
              </button>
              <button
                onClick={() => setPixAmount(String(Math.round(balance / 2 * 100) / 100))}
                className="flex-1 py-2 text-xs rounded-xl border border-border hover:bg-muted transition-colors font-medium"
              >
                Metade
              </button>
              <button
                onClick={() => setPixAmount(String(Math.round(balance / 3 * 100) / 100))}
                className="flex-1 py-2 text-xs rounded-xl border border-border hover:bg-muted transition-colors font-medium"
              >
                1/3
              </button>
            </div>
          </div>

          {storeProfile?.pix_key_1 ? (
            <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex flex-col items-center">
              <QRCodeSVG
                value={generatePixPayload({
                  key: storeProfile.pix_key_1,
                  amount: (parseFloat(pixAmount) || balance).toFixed(2),
                  merchantName: storeProfile.store_name || "Loja",
                  merchantCity: storeProfile.city || "SAO PAULO",
                })}
                size={180}
                level="M"
                includeMargin
              />
              <p className="text-xl font-bold text-foreground mt-3">
                {formatCurrency(parseFloat(pixAmount) || balance)}
              </p>
              <button
                onClick={copyPixKey}
                className="mt-3 flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-4 py-2 rounded-xl hover:bg-green-200 dark:hover:bg-green-800 transition-colors font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado!" : "Copiar chave Pix"}
              </button>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">Chave Pix não configurada</p>
              <p className="text-xs mt-1">Entre em contato com a loja</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
