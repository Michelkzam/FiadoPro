import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Clock, CheckCircle, XCircle, Timer } from "lucide-react";
import { useWaitingList } from "@/hooks/useFeatures";
import { toast } from "sonner";

export default function WaitingListPage() {
  const { add, seat, cancel, list, loading } = useWaitingList();
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", party_size: "1", table_number: "", notes: "" });

  useEffect(() => {
    loadEntries();
    const interval = setInterval(loadEntries, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEntries = async () => {
    const data = await list();
    setEntries(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await add({
        ...form,
        party_size: parseInt(form.party_size) || 1,
      });
      toast.success("Cliente adicionado à fila!");
      setForm({ customer_name: "", customer_phone: "", party_size: "1", table_number: "", notes: "" });
      setShowForm(false);
      loadEntries();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSeat = async (id) => {
    await seat(id);
    toast.success("Cliente sentado!");
    loadEntries();
  };

  const handleCancel = async (id) => {
    await cancel(id);
    toast.success("Removido da fila");
    loadEntries();
  };

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const seatedEntries = entries.filter((e) => e.status === "seated");

  const getWaitTime = (createdAt) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lista de Espera</h1>
          <p className="text-sm text-muted-foreground">Gerencie a fila de clientes aguardando mesa</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar à Fila
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Cliente</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Nº de Pessoas</Label>
              <Input type="number" min="1" value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} />
            </div>
            <div>
              <Label>Mesa Preferencial</Label>
              <Input value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex: Criança, acessibilidade..." />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Adicionando..." : "Adicionar"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Aguardando ({waitingEntries.length})
          </h2>
          {waitingEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma pessoa na fila</p>
            </div>
          ) : (
            waitingEntries.map((entry) => (
              <div key={entry.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{entry.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.party_size} pessoa{entry.party_size > 1 ? "s" : ""}
                        {entry.customer_phone && ` • ${entry.customer_phone}`}
                      </p>
                      {entry.notes && <p className="text-xs text-muted-foreground mt-1">📝 {entry.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Esperando</p>
                      <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {getWaitTime(entry.created_at)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleSeat(entry.id)} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-1" /> Sentar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleCancel(entry.id)}>
                      <XCircle className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> Sentados ({seatedEntries.length})
          </h2>
          {seatedEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
              <p className="text-sm">Nenhum cliente sentado hoje</p>
            </div>
          ) : (
            seatedEntries.map((entry) => (
              <div key={entry.id} className="bg-card rounded-xl border border-border p-3 opacity-75">
                <p className="text-sm font-medium text-foreground">{entry.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.party_size} pessoa{entry.party_size > 1 ? "s" : ""} • Sentou às {new Date(entry.seated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
