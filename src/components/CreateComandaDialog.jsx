import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import db from "@/lib/db";
import { useCustomers } from "@/hooks/useQueries";

export default function CreateComandaDialog({ onClose, defaultTable = "" }) {
  const queryClient = useQueryClient();
  const [tableNumber, setTableNumber] = useState(defaultTable);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");

  const { data: customers = [] } = useCustomers();

  const normalize = (str) => (str || "").replace(/\D/g, "");

  const createComanda = useMutation({
    mutationFn: async (data) => {
      let customerId = null;
      let customerName = data.name;
      let customerPhone = "";

      if (data.cpf) {
        const normalizedCpf = normalize(data.cpf);
        const found = customers.find((c) => normalize(c.cpf) === normalizedCpf);
        if (found) {
          customerId = found.id;
          customerName = found.name;
          customerPhone = found.phone || "";
        }
      }

      return db.entities.Comanda.create({
        table_number: data.table_number,
        customer_id: customerId,
        customer_name: customerName,
        customer_cpf: data.cpf || null,
        label: data.name,
        status: "aberta",
        total: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      toast.success("Comanda aberta!");
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!tableNumber.trim()) {
      toast.error("Informe o número da mesa");
      return;
    }
    if (!name.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    createComanda.mutate({
      table_number: tableNumber.trim(),
      name: name.trim(),
      cpf: cpf.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Abrir Comanda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Número da Mesa *</Label>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 1, 2, 3..."
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nome do Cliente *</Label>
            <Input
              placeholder="Nome da pessoa"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>CPF (opcional)</Label>
            <Input
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se o CPF estiver cadastrado, a comanda será vinculada ao cliente
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createComanda.isPending}>
            {createComanda.isPending ? "Criando..." : "Abrir Comanda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
