import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wifi, WifiOff, QrCode, Bot, User, RefreshCw, BarChart3, CheckCircle, XCircle, Loader2, Phone, Zap, Settings } from "lucide-react";

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

function QRCodeDisplay({ qrCode, onRefresh, isConnecting }) {
  if (!qrCode) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <QrCode className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhum QR Code disponivel</p>
        <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2" disabled={isConnecting}>
          {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isConnecting ? "Conectando..." : "Gerar QR Code"}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center py-6 space-y-4">
      <div className="bg-white p-4 rounded-2xl border-2 border-border shadow-lg">
        <img src={qrCode} alt="QR Code WhatsApp" className="w-72 h-72 object-contain" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Escaneie com o WhatsApp</p>
        <p className="text-xs text-muted-foreground">
          Abra o WhatsApp no celular - Menu - Dispositivos conectados - Conectar dispositivo
        </p>
      </div>
      <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="w-4 h-4" /> Atualizar QR
      </Button>
    </div>
  );
}

function ConnectionConfig({ onSave, onClose }) {
  const [form, setForm] = useState({
    api_url: "https://api.evolutionapi.com.br",
    api_key: "",
    instance_id: "fiadopro",
  });
  
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          Use o Evolution API (gratis) para conectar o WhatsApp via Baileys.
          <br />
          Acesse: <a href="https://evolution-api.com" target="_blank" rel="noopener noreferrer" className="underline">evolution-api.com</a>
        </p>
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
        <Label>Nome da Instancia</Label>
        <Input
          value={form.instance_id}
          onChange={(e) => setForm({ ...form, instance_id: e.target.value })}
          placeholder="fiadopro"
        />
      </div>
      
      <div className="flex gap-2">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancelar
        </Button>
        <Button onClick={() => onSave(form)} className="flex-1 gap-2">
          <Settings className="w-4 h-4" /> Conectar
        </Button>
      </div>
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
  
  const { data: waStatus, isLoading } = useQuery({
    queryKey: ["wa_status"],
    queryFn: async () => {
      const res = await fetch("/api/whatsapp/connect");
      const data = await res.json();
      return data;
    },
    refetchInterval: 3000,
  });
  
  const { data: stats } = useQuery({
    queryKey: ["wa_stats"],
    queryFn: async () => {
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_stats" }),
      });
      const data = await res.json();
      return data;
    },
    refetchInterval: 30000,
  });
  
  const connectMutation = useMutation({
    mutationFn: async (config) => {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", ...config }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wa_status"] });
      if (data.ok) {
        toast.success("Conexao iniciada!");
        setShowConfig(false);
      } else {
        toast.error(data.error || "Erro ao conectar");
      }
    },
  });
  
  const toggleMutation = useMutation({
    mutationFn: async (action) => {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa_status"] });
    },
  });
  
  const handleConnect = useCallback((config) => {
    connectMutation.mutate(config);
  }, [connectMutation]);
  
  const handleToggleRobot = useCallback(() => {
    toggleMutation.mutate("toggle_robot");
  }, [toggleMutation]);
  
  const handleToggleHuman = useCallback(() => {
    toggleMutation.mutate("toggle_human");
  }, [toggleMutation]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const status = waStatus?.status || "desconectado";
  const qrCode = waStatus?.qr_code || null;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp AI Agent</h2>
          <p className="text-sm text-muted-foreground">Motor de atendimento gratuito via QR Code (Baileys)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowStats(true)} className="gap-2">
            <BarChart3 className="w-4 h-4" /> Metricas
          </Button>
        </div>
      </div>
      
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status === "conectado" ? "bg-green-100" : "bg-muted"}`}>
              {status === "conectado" ? (
                <Wifi className="w-6 h-6 text-green-600" />
              ) : (
                <WifiOff className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Status da Conexao</h3>
                <StatusBadge status={status} />
              </div>
              {waStatus?.phone_number && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  <Phone className="w-3 h-3 inline mr-1" />
                  {waStatus.phone_number}
                </p>
              )}
              {waStatus?.connected_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conectado desde: {new Date(waStatus.connected_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
              <Zap className="w-3 h-3" /> 100% Gratuito
            </span>
            {status === "desconectado" && (
              <Button onClick={() => setShowConfig(true)} className="gap-2">
                <QrCode className="w-4 h-4" /> Conectar WhatsApp
              </Button>
            )}
          </div>
        </div>
        
        {status === "aguardando_qr" && (
          <div className="border-t border-border pt-4">
            <QRCodeDisplay qrCode={qrCode} onRefresh={() => connectMutation.mutate({ action: "connect" })} isConnecting={connectMutation.isPending} />
          </div>
        )}
        
        {status === "conectado" && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">WhatsApp conectado e operacional</span>
            </div>
          </div>
        )}
        
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Robot Automatico</span>
                </div>
                <button
                  onClick={handleToggleRobot}
                  className={`relative w-11 h-6 rounded-full transition-colors ${waStatus?.robot_active ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${waStatus?.robot_active ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {waStatus?.robot_active ? "Bot respondendo automaticamente" : "Bot pausado - mensagens nao respondidas"}
              </p>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Atendimento Humano</span>
                </div>
                <button
                  onClick={handleToggleHuman}
                  className={`relative w-11 h-6 rounded-full transition-colors ${waStatus?.human_mode ? "bg-amber-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${waStatus?.human_mode ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {waStatus?.human_mode ? "Modo manual - todas as conversas vao para a fila" : "Bot decide quando transferir"}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> Configurar WhatsApp
            </DialogTitle>
          </DialogHeader>
          <ConnectionConfig onSave={handleConnect} onClose={() => setShowConfig(false)} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Metricas do Dia
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
