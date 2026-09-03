import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wifi, WifiOff, QrCode, Bot, User, Settings, RefreshCw, MessageSquare, BarChart3, Clock, CheckCircle, XCircle, Loader2, Phone, Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

function StatusBadge({ status }) {
  const config = {
    conectado: { label: "Conectado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
    aguardando_qr: { label: "Aguardando QR", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: QrCode },
    desconectado: { label: "Desconectado", color: "bg-red-100 text-red-700 border-red-200", icon: WifiOff },
    erro: { label: "Erro", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  };
  const cfg = config[status] || config.desconectado;
  const Icon = cfg.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function QRCodeDisplay({ qrCode, onRefresh }) {
  if (!qrCode) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <QrCode className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhum QR Code disponível</p>
        <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Gerar QR Code
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center py-4 space-y-4">
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
        <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Escaneie com o WhatsApp no seu celular
      </p>
      <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="w-4 h-4" /> Atualizar QR
      </Button>
    </div>
  );
}

function ConnectionConfig({ session, onSave }) {
  const [form, setForm] = useState({
    api_url: session?.api_url || "https://api.evolutionapi.com.br",
    api_key: session?.api_key || "",
    instance_id: session?.instance_id || "",
    phone_number: session?.phone_number || "",
  });
  
  return (
    <div className="space-y-4">
      <div>
        <Label>Provider</Label>
        <select
          value={session?.provider || "evolution"}
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground mt-1"
          disabled
        >
          <option value="evolution">Evolution API (Recomendado - Gratuito)</option>
          <option value="baileys">Baileys (Local)</option>
          <option value="zapi">Z-API (Pago)</option>
        </select>
      </div>
      
      <div>
        <Label>URL da API</Label>
        <Input
          value={form.api_url}
          onChange={(e) => setForm({ ...form, api_url: e.target.value })}
          placeholder="https://api.evolutionapi.com.br"
        />
      </div>
      
      <div>
        <Label>API Key</Label>
        <Input
          type="password"
          value={form.api_key}
          onChange={(e) => setForm({ ...form, api_key: e.target.value })}
          placeholder="Sua API Key do Evolution"
        />
      </div>
      
      <div>
        <Label>Instance ID</Label>
        <Input
          value={form.instance_id}
          onChange={(e) => setForm({ ...form, instance_id: e.target.value })}
          placeholder="Nome da instância"
        />
      </div>
      
      <div>
        <Label>Número WhatsApp</Label>
        <Input
          value={form.phone_number}
          onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          placeholder="5511999999999"
        />
      </div>
      
      <Button onClick={() => onSave(form)} className="w-full gap-2">
        <Settings className="w-4 h-4" /> Salvar Configuração
      </Button>
    </div>
  );
}

function StatsCard({ icon: Icon, label, value, color = "primary" }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}`} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function WhatsAppConnectionPanel() {
  const queryClient = useQueryClient();
  const [showConfig, setShowConfig] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["wa_session"],
    queryFn: async () => {
      const { data } = await supabase.rpc("wa_get_session", { p_session_id: "DEFAULT_SESSION" });
      return data;
    },
    refetchInterval: 5000,
  });
  
  const { data: stats } = useQuery({
    queryKey: ["wa_stats"],
    queryFn: async () => {
      const { data } = await supabase.rpc("wa_get_daily_stats");
      return data;
    },
    refetchInterval: 30000,
  });
  
  const { data: conversations = [] } = useQuery({
    queryKey: ["wa_conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_conversas")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 10000,
  });
  
  const { data: queue = [] } = useQuery({
    queryKey: ["wa_queue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_fila_atendimento")
        .select("*")
        .eq("status", "aguardando")
        .order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 5000,
  });
  
  const updateSession = useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc("wa_upsert_session", params);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa_session"] });
      toast.success("Sessão atualizada!");
    },
  });
  
  const toggleRobot = useCallback(() => {
    if (!session) return;
    updateSession.mutate({
      p_session_id: session.session_id || "DEFAULT_SESSION",
      p_robot_active: !session.robot_active,
    });
  }, [session, updateSession]);
  
  const toggleHumanMode = useCallback(() => {
    if (!session) return;
    updateSession.mutate({
      p_session_id: session.session_id || "DEFAULT_SESSION",
      p_human_mode: !session.human_mode,
    });
  }, [session, updateSession]);
  
  const saveConfig = useCallback((config) => {
    updateSession.mutate({
      p_session_id: session?.session_id || "DEFAULT_SESSION",
      p_status: session?.status || "desconectado",
      p_instance_id: config.instance_id,
      p_api_url: config.api_url,
      p_api_key: config.api_key,
      p_phone_number: config.phone_number,
      p_provider: session?.provider || "evolution",
    });
    setShowConfig(false);
  }, [session, updateSession]);
  
  const refreshQR = useCallback(() => {
    updateSession.mutate({
      p_session_id: session?.session_id || "DEFAULT_SESSION",
      p_status: "aguardando_qr",
    });
    toast.info("Solicitando novo QR Code...");
  }, [session, updateSession]);
  
  if (loadingSession) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp AI Agent</h2>
          <p className="text-sm text-muted-foreground">Conexão e controle do bot automatizado</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowStats(true)} className="gap-2">
            <BarChart3 className="w-4 h-4" /> Métricas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)} className="gap-2">
            <Settings className="w-4 h-4" /> Configurar
          </Button>
        </div>
      </div>
      
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session?.status === "conectado" ? "bg-green-100" : "bg-muted"}`}>
              {session?.status === "conectado" ? (
                <Wifi className="w-6 h-6 text-green-600" />
              ) : (
                <WifiOff className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Status da Conexão</h3>
                <StatusBadge status={session?.status || "desconectado"} />
              </div>
              {session?.phone_number && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  <Phone className="w-3 h-3 inline mr-1" />
                  {session.phone_number}
                </p>
              )}
              {session?.connected_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conectado desde: {new Date(session.connected_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          
          {session?.status === "aguardando_qr" && (
            <Button onClick={refreshQR} className="gap-2">
              <QrCode className="w-4 h-4" /> Obter QR Code
            </Button>
          )}
        </div>
        
        {session?.status === "aguardando_qr" && session?.qr_code && (
          <div className="border-t border-border pt-4">
            <QRCodeDisplay qrCode={session.qr_code} onRefresh={refreshQR} />
          </div>
        )}
        
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Robô Automático</span>
                </div>
                <button
                  onClick={toggleRobot}
                  className={`relative w-11 h-6 rounded-full transition-colors ${session?.robot_active ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${session?.robot_active ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {session?.robot_active ? "Bot respondendo automaticamente" : "Bot pausado — mensagens não respondidas"}
              </p>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Atendimento Humano</span>
                </div>
                <button
                  onClick={toggleHumanMode}
                  className={`relative w-11 h-6 rounded-full transition-colors ${session?.human_mode ? "bg-amber-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${session?.human_mode ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {session?.human_mode ? "Modo manual — todas as conversas vão para a fila" : "Bot decide quando transferir"}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {queue.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Fila de Atendimento ({queue.length})</h3>
          </div>
          <div className="space-y-2">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.customer_name || item.phone_number}</p>
                  <p className="text-xs text-muted-foreground">{item.phone_number} — {item.reason}</p>
                </div>
                <StatusBadge status={item.priority === "urgente" ? "erro" : item.priority === "alta" ? "aguardando_qr" : "conectado"} />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={MessageSquare} label="Conversas Hoje" value={stats?.total_conversas || 0} color="primary" />
        <StatsCard icon={Bot} label="Resolvidas pelo Bot" value={stats?.resolvidas_bot || 0} color="green" />
        <StatsCard icon={User} label="Transbordos Humanos" value={stats?.transbordo_humano || 0} color="amber" />
        <StatsCard icon={BarChart3} label="Mensagens Enviadas" value={stats?.mensagens_enviadas || 0} color="blue" />
      </div>
      
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Conversas Recentes</h3>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Nenhuma conversa ainda</p>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {conv.customer_name?.charAt(0)?.toUpperCase() || conv.phone_number?.slice(-2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {conv.customer_name || conv.phone_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conv.phone_number} — {conv.flow_state?.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={conv.status === "ativa" ? "conectado" : conv.status === "transbordo_humano" ? "aguardando_qr" : "desconectado"} />
                  {conv.protocol && (
                    <span className="text-xs text-muted-foreground font-mono">{conv.protocol}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> Configuração WhatsApp
            </DialogTitle>
          </DialogHeader>
          <ConnectionConfig session={session} onSave={saveConfig} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Métricas do Dia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{stats?.total_conversas || 0}</p>
                <p className="text-xs text-muted-foreground">Total de Conversas</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats?.resolvidas_bot || 0}</p>
                <p className="text-xs text-muted-foreground">Resolvidas pelo Bot</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats?.transbordo_humano || 0}</p>
                <p className="text-xs text-muted-foreground">Transbordos Humanos</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats?.mensagens_recebidas || 0}</p>
                <p className="text-xs text-muted-foreground">Mensagens Recebidas</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{stats?.mensagens_enviadas || 0}</p>
              <p className="text-xs text-muted-foreground">Mensagens Enviadas pelo Bot</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
