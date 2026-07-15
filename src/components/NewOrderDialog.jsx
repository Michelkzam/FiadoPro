import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import db from "@/lib/db";
import { useCustomers } from "@/hooks/useQueries";

export default function NewOrderDialog({ onClose }) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const { data: customers = [] } = useCustomers();
  const activeCustomers = customers.filter((c) => c.status !== "inativo");

  const createOrder = useMutation({
    mutationFn: (data) => db.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pedido cadastrado com sucesso!");
      onClose();
    },
  });

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmit = () => {
    if (!customerId) {
      toast.error("Selecione um cliente");
      return;
    }
    createOrder.mutate({
      customer_id: customerId,
      customer_name: selectedCustomer?.name || "",
      customer_phone: selectedCustomer?.phone || "",
      description: description.trim(),
      amount: parseFloat(amount) || 0,
      status: "pendente",
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {activeCustomers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição do pedido</Label>
            <Textarea
              placeholder="Descreva os itens solicitados..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Valor estimado (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createOrder.isPending}>
            {createOrder.isPending ? "Salvando..." : "Criar Pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
