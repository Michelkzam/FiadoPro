import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wifi, WifiOff, QrCode, Bot, User, RefreshCw, BarChart3, CheckCircle, XCircle, Loader2, Phone, Zap, Settings } from "lucide-react";

const BAILEYS_SERVER_KEY = "fiadopro_wa_server_url";

function getServerUrl() {
  return localStorage.getItem(BAILEYS_SERVER_KEY) || "";
}

function setServerUrl(url) {
  localStorage.setItem(BAILEYS_SERVER_KEY, url);
}

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

function ServerConfig({ onSave, onClose }) {
  const [serverUrl, setUrl] = useState(getServerUrl());
  
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-xs text-green-700 font-medium mb-1">100% Gratuito</p>
        <p className="text-xs text-green-600">
          O servidor Baileys roda no Railway (free tier). Nao ha custos por mensagem.
        </p>
      </div>
      
      <div>
        <Label>URL do Servidor Baileys</Label>
        <Input
          value={serverUrl}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://seu-app.up.railway.app"
        />
        <p className="text-xs text-muted-foreground mt-1">
          URL do servidor deployado no Railway
        </p>
      </div>
      
      <div className="bg-muted rounded-lg p-3">
        <p className="text-xs font-medium text-foreground mb-2">Como obter a URL:</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Acesse railway.app</li>
          <li>Deploy o projeto da pasta `server/`</li>
          <li>Copie a URL gerada</li>
          <li>Cole aqui em cima</li>
        </ol>
      </div>
      
      <div className="flex gap-2">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancelar
        </Button>
        <Button onClick={() => onSave(serverUrl)} className="flex-1 gap-2" disabled={!serverUrl}>
          <Settings className="w-4 h-4" /> Salvar
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
  
  const serverUrl = getServerUrl();
  
  const { data: waStatus, isLoading, error } = useQuery({
    queryKey: ["wa_status", serverUrl],
    queryFn: async () => {
      if (!serverUrl) return { status: "desconectado", qr_code: null };
      
      try {
        const res = await fetch(`${serverUrl}/status`);
        const data = await res.json();
        return data;
      } catch (err) {
        return { status: "erro", qr_code: null, error: "Servidor indisponivel" };
      }
    },
    refetchInterval: serverUrl ? 3000 : false,
    enabled: !!serverUrl,
  });
  
  const { data: stats } = useQuery({
    queryKey: ["wa_stats"],
    queryFn: async () => {
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_stats" }),
      });
      return res.json();
    },
    refetchInterval: 30000,
  });
  
  const handleSaveServer = useCallback((url) => {
    setServerUrl(url);
    setShowConfig(false);
    queryClient.invalidateQueries({ queryKey: ["wa_status"] });
    toast.success("Servidor configurado!");
  }, [queryClient]);
  
  const handleRefreshQR = useCallback(async () => {
    if (!serverUrl) {
      toast.error("Configure o servidor primeiro");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["wa_status"] });
  }, [serverUrl, queryClient]);
  
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
      
      {!serverUrl && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Servidor nao configurado</h3>
              <p className="text-sm text-amber-700 mt-1">
                Para usar o WhatsApp, voce precisa deployar o servidor Baileys no Railway (gratis) e configurar a URL aqui.
              </p>
              <Button onClick={() => setShowConfig(true)} size="sm" className="mt-3 gap-2">
                <Settings className="w-4 h-4" /> Configurar Servidor
              </Button>
            </div>
          </div>
        </div>
      )}
      
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
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
              <Zap className="w-3 h-3" /> 100% Gratuito
            </span>
            {serverUrl && (
              <Button variant="outline" size="sm" onClick={() => setShowConfig(true)} className="gap-2">
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-700">
              Erro ao conectar com o servidor. Verifique a URL e tente novamente.
            </p>
          </div>
        )}
        
        {status === "aguardando_qr" && (
          <div className="border-t border-border pt-4">
            <QRCodeDisplay qrCode={qrCode} onRefresh={handleRefreshQR} isConnecting={false} />
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
        
        {status === "desconectado" && serverUrl && (
          <div className="border-t border-border pt-4">
            <Button onClick={handleRefreshQR} className="gap-2">
              <QrCode className="w-4 h-4" /> Conectar WhatsApp
            </Button>
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
                <div className={`w-11 h-6 rounded-full ${waStatus?.robot_active ? "bg-green-500" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${waStatus?.robot_active ? "translate-x-5 ml-0.5" : "ml-0.5"}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {waStatus?.robot_active !== false ? "Bot respondendo automaticamente" : "Bot pausado"}
              </p>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Atendimento Humano</span>
                </div>
                <div className={`w-11 h-6 rounded-full ${waStatus?.human_mode ? "bg-amber-500" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${waStatus?.human_mode ? "translate-x-5 ml-0.5" : "ml-0.5"}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {waStatus?.human_mode ? "Modo manual ativo" : "Bot decide quando transferir"}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={BarChart3} label="Conversas Hoje" value={stats?.total_conversas || 0} color="primary" />
        <StatsCard icon={Bot} label="Resolvidas pelo Bot" value={stats?.resolvidas_bot || 0} color="green" />
        <StatsCard icon={User} label="Transbordos" value={stats?.transbordo_humano || 0} color="amber" />
        <StatsCard icon={BarChart3} label="Mensagens" value={stats?.mensagens_enviadas || 0} color="blue" />
      </div>
      
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Como Funciona</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-600">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Deploy o servidor Baileys</p>
              <p className="text-xs text-muted-foreground">No Railway (gratis) - 500h/mes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-600">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Configure a URL</p>
              <p className="text-xs text-muted-foreground">Cole a URL do servidor aqui</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-blue-600">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Escaneie o QR Code</p>
              <p className="text-xs text-muted-foreground">WhatsApp conectado para sempre</p>
            </div>
          </div>
        </div>
      </div>
      
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> Configurar Servidor
            </DialogTitle>
          </DialogHeader>
          <ServerConfig onSave={handleSaveServer} onClose={() => setShowConfig(false)} />
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
