import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Send, Clock, CheckCircle, XCircle, AlertTriangle, Eye, Trash2,
  MessageSquare, Image, Video, FileText, Calendar, Users, Zap, Settings,
  RefreshCw, BarChart3, ChevronDown, ChevronRight, Play, Pause, Copy
} from "lucide-react";
import { useCustomers, useStoreProfile } from "@/hooks/useQueries";
import db from "@/lib/db";
import { formatCurrency } from "@/lib/constants";

const REDES_SOCIAIS = [
  { id: "whatsapp", label: "WhatsApp", color: "green", icon: "💬" },
  { id: "telegram", label: "Telegram", color: "blue", icon: "📨" },
  { id: "instagram", label: "Instagram", color: "pink", icon: "📸" },
  { id: "facebook", label: "Facebook", color: "indigo", icon: "👤" },
  { id: "tiktok", label: "TikTok", color: "red", icon: "🎵" },
  { id: "kwai", label: "Kwai", color: "orange", icon: "🎬" },
];

const STATUS_CONFIG = {
  rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-700", icon: FileText },
  agendada: { label: "Agendada", color: "bg-blue-100 text-blue-700", icon: Clock },
  em_progresso: { label: "Em Progresso", color: "bg-green-100 text-green-700", icon: Send },
  pausada: { label: "Pausada", color: "bg-yellow-100 text-yellow-700", icon: Pause },
  concluida: { label: "Concluída", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700", icon: XCircle },
  erro: { label: "Erro", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

function CampaignCard({ campaign, onStart, onPause, onDelete, onSelect }) {
  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.rascunho;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelect(campaign)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-semibold text-foreground text-sm truncate">{campaign.nome}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{campaign.legenda?.slice(0, 80)}...</p>
        </div>
        <span className={`text-[11px] px-2 py-1 rounded-full font-medium shrink-0 ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {campaign.canais?.map((canal) => {
          const rede = REDES_SOCIAIS.find((r) => r.id === canal);
          return (
            <span key={canal} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {rede?.icon} {rede?.label}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {campaign.total_enviados || 0}
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-3 h-3" /> {campaign.total_sucesso || 0}
          </span>
          {(campaign.total_falha || 0) > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-3 h-3" /> {campaign.total_falha}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {campaign.status === "rascunho" && (
            <Button size="sm" onClick={() => onStart(campaign.id)} className="h-7 text-xs">
              <Play className="w-3 h-3 mr-1" /> Iniciar
            </Button>
          )}
          {campaign.status === "em_progresso" && (
            <Button size="sm" variant="outline" onClick={() => onPause(campaign.id)} className="h-7 text-xs">
              <Pause className="w-3 h-3 mr-1" /> Pausar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDelete(campaign.id)} className="h-7 text-xs text-destructive">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {campaign.agendado_para && (
        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Agendada para {new Date(campaign.agendado_para).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
}

function CampaignDetail({ campaign, onBack }) {
  const [queueItems, setQueueItems] = useState([]);

  useEffect(() => {
    loadQueue();
  }, [campaign.id]);

  const loadQueue = async () => {
    const { data } = await db.entities.HistoricoEnvios.filter(
      { canal_id: campaign.id },
      "-criado_em",
      100
    );
    setQueueItems(data || []);
  };

  const stats = useMemo(() => {
    return {
      pendente: queueItems.filter((i) => i.status === "pendente").length,
      enviando: queueItems.filter((i) => i.status === "enviando").length,
      sucesso: queueItems.filter((i) => i.status === "sucesso").length,
      falha: queueItems.filter((i) => i.status === "falha").length,
    };
  }, [queueItems]);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Voltar</button>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">{campaign.nome}</h2>
            <p className="text-xs text-muted-foreground mt-1">{campaign.legenda}</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_CONFIG[campaign.status]?.color}`}>
            {STATUS_CONFIG[campaign.status]?.label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Pendentes", value: stats.pendente, color: "text-gray-600" },
            { label: "Enviando", value: stats.enviando, color: "text-blue-600" },
            { label: "Sucesso", value: stats.sucesso, color: "text-green-600" },
            { label: "Falha", value: stats.falha, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 bg-muted/50 rounded-xl">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-foreground text-sm">Fila de Envio</p>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {queueItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhum item na fila</p>
          ) : (
            queueItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    item.status === "sucesso" ? "bg-green-500" :
                    item.status === "falha" ? "bg-red-500" :
                    item.status === "enviando" ? "bg-blue-500 animate-pulse" :
                    "bg-gray-400"
                  }`} />
                  <span className="text-foreground">{item.destinatario_nome || item.destinatario_id}</span>
                </div>
                <span className="text-muted-foreground">{item.rede_social}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NewCampaignForm({ onClose, onCreated }) {
  const { data: customers = [] } = useCustomers();
  const [form, setForm] = useState({
    nome: "",
    legenda: "",
    canais: [],
    publico_alvo: "todos",
    agendamento_tipo: "agora",
    agendado_para: "",
    whatsapp_delay_segundos: 20,
    whatsapp_delay_max_segundos: 30,
  });
  const [saving, setSaving] = useState(false);

  const toggleCanal = (canalId) => {
    setForm((prev) => ({
      ...prev,
      canais: prev.canais.includes(canalId)
        ? prev.canais.filter((c) => c !== canalId)
        : [...prev.canais, canalId],
    }));
  };

  const handleSave = async (asDraft = true) => {
    if (!form.nome.trim()) { toast.error("Nome da campanha é obrigatório"); return; }
    if (!form.legenda.trim()) { toast.error("Legenda é obrigatória"); return; }
    if (form.canais.length === 0) { toast.error("Selecione pelo menos um canal"); return; }

    setSaving(true);
    try {
      const { data, error } = await db.entities.Campanha.create({
        nome: form.nome,
        legenda: form.legenda,
        canais: form.canais,
        publico_alvo: form.publico_alvo,
        agendamento_tipo: form.agendamento_tipo,
        agendado_para: form.agendado_para || null,
        status: asDraft ? "rascunho" : "agendada",
        whatsapp_delay_segundos: form.whatsapp_delay_segundos,
        whatsapp_delay_max_segundos: form.whatsapp_delay_max_segundos,
        total_enviados: 0,
        total_sucesso: 0,
        total_falha: 0,
      });

      toast.success(asDraft ? "Campanha salva como rascunho!" : "Campanha agendada!");
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const debtors = customers.filter((c) => (c.balance || 0) > 0).length;
  const active = customers.filter((c) => c.status === "ativo").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground">Nova Campanha</h2>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕ Fechar</button>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Nome da Campanha *</Label>
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Promoção de Sexta-feira"
          />
        </div>

        <div>
          <Label>Legenda / Mensagem *</Label>
          <Textarea
            value={form.legenda}
            onChange={(e) => setForm({ ...form, legenda: e.target.value })}
            placeholder="Escreva sua mensagem aqui. Use {nome} para inserir o nome do cliente."
            rows={5}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Variáveis: {"{nome}"} = nome do cliente
          </p>
        </div>

        <div>
          <Label>Canais de Envio *</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {REDES_SOCIAIS.map((rede) => (
              <button
                key={rede.id}
                onClick={() => toggleCanal(rede.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                  form.canais.includes(rede.id)
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span className="text-base">{rede.icon}</span> {rede.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Público Alvo *</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[
              { value: "todos", label: `Todos (${active} clientes)` },
              { value: "fiado", label: `Fiado (${debtors} clientes)` },
              { value: "inadimplente", label: `Inadimplentes (${debtors})` },
              { value: "canal_especifico", label: "Canal Específico" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, publico_alvo: opt.value })}
                className={`py-2 px-3 rounded-xl text-xs font-medium border-2 transition-all text-left ${
                  form.publico_alvo === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Agendamento</Label>
          <div className="flex gap-2 mt-1">
            {[
              { value: "agora", label: "Agora", icon: Zap },
              { value: "agendada", label: "Agendar", icon: Calendar },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, agendamento_tipo: opt.value })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
                  form.agendamento_tipo === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <opt.icon className="w-4 h-4" /> {opt.label}
              </button>
            ))}
          </div>
          {form.agendamento_tipo === "agendada" && (
            <Input
              type="datetime-local"
              value={form.agendado_para}
              onChange={(e) => setForm({ ...form, agendado_para: e.target.value })}
              className="mt-2"
            />
          )}
        </div>

        {form.canais.includes("whatsapp") && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1">
              ⚠️ Configuração WhatsApp (antiban)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Delay Mínimo (seg)</Label>
                <Input
                  type="number"
                  min="15"
                  max="60"
                  value={form.whatsapp_delay_segundos}
                  onChange={(e) => setForm({ ...form, whatsapp_delay_segundos: parseInt(e.target.value) || 15 })}
                />
              </div>
              <div>
                <Label className="text-xs">Delay Máximo (seg)</Label>
                <Input
                  type="number"
                  min="20"
                  max="120"
                  value={form.whatsapp_delay_max_segundos}
                  onChange={(e) => setForm({ ...form, whatsapp_delay_max_segundos: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Delay aleatório entre {form.whatsapp_delay_segundos}s e {form.whatsapp_delay_max_segundos}s para simular comportamento humano
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => handleSave(true)} variant="outline" disabled={saving} className="flex-1">
          {saving ? "Salvando..." : "Salvar Rascunho"}
        </Button>
        <Button onClick={() => handleSave(false)} disabled={saving} className="flex-1">
          {saving ? "Agendando..." : "Agendar / Iniciar"}
        </Button>
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data } = await db.entities.Campanha.list("-created_at", 50);
      setCampaigns(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id) => {
    try {
      const response = await fetch("/api/campaigns/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campanha_id: id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(result.message);
      loadCampaigns();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePause = async (id) => {
    await db.entities.Campanha.update(id, { status: "pausada" });
    toast.success("Campanha pausada");
    loadCampaigns();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta campanha?")) return;
    await db.entities.Campanha.delete(id);
    toast.success("Campanha excluída");
    loadCampaigns();
  };

  if (selectedCampaign) {
    return <CampaignDetail campaign={selectedCampaign} onBack={() => setSelectedCampaign(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Gerencie campanhas multicanal</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCampaigns}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Campanha
          </Button>
        </div>
      </div>

      {showNew && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <NewCampaignForm onClose={() => setShowNew(false)} onCreated={loadCampaigns} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: campaigns.length, color: "text-foreground" },
          { label: "Em Progresso", value: campaigns.filter((c) => c.status === "em_progresso").length, color: "text-green-600" },
          { label: "Rascunhos", value: campaigns.filter((c) => c.status === "rascunho").length, color: "text-gray-500" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <Send className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">Nenhuma campanha</p>
          <p className="text-xs text-muted-foreground mt-1">Crie sua primeira campanha multicanal</p>
          <Button onClick={() => setShowNew(true)} className="mt-4" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Criar Campanha
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStart={handleStart}
              onPause={handlePause}
              onDelete={handleDelete}
              onSelect={setSelectedCampaign}
            />
          ))}
        </div>
      )}
    </div>
  );
}
