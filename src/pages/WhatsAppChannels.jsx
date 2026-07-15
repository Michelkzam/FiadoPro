import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Send, Users, Clock, Settings, Trash2 } from "lucide-react";
import db from "@/lib/db";
import { useCanaisWhatsApp, useClientesCanal, useHistoricoEnvios } from "@/hooks/useQueries";

export default function WhatsAppChannels() {
  const queryClient = useQueryClient();
  const { data: canais = [], isLoading } = useCanaisWhatsApp();
  const [selectedCanal, setSelectedCanal] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [sending, setSending] = useState(false);

  const createCanal = useMutation({
    mutationFn: (data) => db.entities.CanalWhatsApp.create({
      ...data,
      status: "ativo",
      total_enviados: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canais_whatsapp"] });
      toast.success("Canal criado!");
      setShowCreateDialog(false);
    },
  });

  const deleteCanal = useMutation({
    mutationFn: async (id) => {
      const { data: clientes } = await db.entities.ClienteCanal.filter({ canal_id: id }, "-criado_em", 1000);
      if (clientes) {
        for (const c of clientes) {
          await db.entities.ClienteCanal.delete(c.id);
        }
      }
      await db.entities.CanalWhatsApp.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canais_whatsapp"] });
      setSelectedCanal(null);
      toast.success("Canal excluído!");
    },
  });

  const handleBroadcast = async (canalId, customMessage) => {
    setSending(true);
    try {
      const response = await fetch("/api/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal_id: canalId, custom_message: customMessage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["canais_whatsapp"] });
      queryClient.invalidateQueries({ queryKey: ["historico_envios"] });
      setShowSendDialog(false);
    } catch (error) {
      toast.error(error.message || "Erro ao enviar cardápio");
    }
    setSending(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Envie cardápios via Meta Cloud API</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4" /> Novo Canal
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Configuração Necessária</p>
            <p className="text-xs text-blue-600 mt-1">
              Cadastre as variáveis de ambiente no Vercel: <code className="bg-blue-100 px-1 rounded">META_ACCESS_TOKEN</code> e <code className="bg-blue-100 px-1 rounded">META_PHONE_NUMBER_ID</code>
            </p>
          </div>
        </div>
      </div>

      {canais.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum canal cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Crie um canal para começar a enviar cardápios</p>
          <Button className="mt-4 gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" /> Criar Canal
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {canais.map((canal) => (
            <div
              key={canal.id}
              className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{canal.nome_canal}</h3>
                  {canal.descricao && (
                    <p className="text-xs text-muted-foreground mt-0.5">{canal.descricao}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  canal.status === "ativo"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200"
                }`}>
                  {canal.status === "ativo" ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {canal.total_enviados || 0} enviados
                </span>
                {canal.ultima_envio && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(canal.ultima_envio).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setSelectedCanal(canal)}
                >
                  <Users className="w-3.5 h-3.5" /> Gerenciar
                </Button>
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => { setSelectedCanal(canal); setShowSendDialog(true); }}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  onClick={() => {
                    if (confirm(`Excluir canal "${canal.nome_canal}"?`)) {
                      deleteCanal.mutate(canal.id);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCanal && !showSendDialog && (
        <CanalDetail
          canal={selectedCanal}
          onClose={() => setSelectedCanal(null)}
          onAddClient={() => setShowAddClientDialog(true)}
        />
      )}

      {showCreateDialog && (
        <Dialog open onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Novo Canal WhatsApp</DialogTitle>
            </DialogHeader>
            <CanalForm
              onSubmit={(data) => createCanal.mutate(data)}
              loading={createCanal.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {showSendDialog && selectedCanal && (
        <SendCardapioDialog
          canal={selectedCanal}
          onSend={(msg) => handleBroadcast(selectedCanal.id, msg)}
          sending={sending}
          onClose={() => setShowSendDialog(false)}
        />
      )}

      {showAddClientDialog && selectedCanal && (
        <AddClientDialog
          canalId={selectedCanal.id}
          onClose={() => setShowAddClientDialog(false)}
        />
      )}
    </div>
  );
}

function CanalForm({ onSubmit, loading }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Nome do Canal *</Label>
        <Input placeholder="Ex: Delivery, Promocões..." value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea placeholder="Descrição do canal..." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ nome_canal: nome, descricao })} disabled={loading || !nome.trim()}>
          {loading ? "Criando..." : "Criar Canal"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function CanalDetail({ canal, onClose, onAddClient }) {
  const { data: clientes = [], refetch } = useClientesCanal(canal.id);
  const { data: historico = [] } = useHistoricoEnvios(canal.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{canal.nome_canal}</DialogTitle>
            <Button size="sm" className="gap-1" onClick={onAddClient}>
              <Plus className="w-3.5 h-3.5" /> Cliente
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Clientes ({clientes.length})
            </p>
            {clientes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cliente neste canal
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-border">
                {clientes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.telefone}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === "ativo" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Histórico de Envios ({historico.length})
            </p>
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum envio realizado
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto rounded-lg border border-border">
                {historico.map((h) => (
                  <div key={h.id} className="px-3 py-2 text-sm border-b border-border last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.criado_em).toLocaleString("pt-BR")}
                      </span>
                      <span className={`text-xs font-medium ${
                        h.status === "enviado" ? "text-green-600" : "text-red-600"
                      }`}>
                        {h.sucesso}/{h.total_destinatarios}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{h.tipo_mensagem}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SendCardapioDialog({ canal, onSend, sending, onClose }) {
  const [customMessage, setCustomMessage] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Enviar Cardápio
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Enviar cardápio do dia para o canal <strong>{canal.nome_canal}</strong>?
          </p>
          <div className="space-y-1.5">
            <Label>Mensagem personalizada (opcional)</Label>
            <Textarea
              placeholder="Ex: Hoje temos promoção especial..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p>A mensagem será enviada via <strong>Meta Cloud API</strong> (WhatsApp oficial).</p>
            <p className="mt-1">Inclui link para pedido online e WhatsApp direto.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onSend(customMessage)}
            disabled={sending}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {sending ? "Enviando..." : "Enviar Cardápio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddClientDialog({ canalId, onClose }) {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  const addClient = useMutation({
    mutationFn: (data) => db.entities.ClienteCanal.create({
      canal_id: canalId,
      ...data,
      status: "ativo",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes_canal"] });
      toast.success("Cliente adicionado!");
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Cliente ao Canal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input placeholder="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone *</Label>
            <Input placeholder="11999999999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => addClient.mutate({ nome, telefone })} disabled={addClient.isPending || !nome.trim() || !telefone.trim()}>
            {addClient.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
