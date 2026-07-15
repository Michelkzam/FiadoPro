import { cn } from "@/lib/utils";

export default function BalanceBadge({ balance, size = "md" }) {
  const isDebt = balance > 0;
  const isCredit = balance < 0;
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Math.abs(balance));

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full",
        size === "lg" ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-sm",
        isDebt
          ? "bg-red-50 text-red-700 border border-red-200"
          : isCredit
          ? "bg-blue-50 text-blue-700 border border-blue-200"
          : "bg-green-50 text-green-700 border border-green-200"
      )}
    >
      {isDebt ? `Deve: ${formatted}` : isCredit ? `Crédito: ${formatted}` : "R$ 0,00"}
    </span>
  );
}