import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wifi, WifiOff, QrCode, Bot, User, RefreshCw, CheckCircle, Loader2, Zap, Settings, ExternalLink } from "lucide-react";
import { setEvolutionConfig, isConfigured, createInstance, getQRCode, getConnectionState } from "@/lib/evolutionApi";

function StatusBadge({ status }) {
  const config = {
    open: { label: "Conectado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
    close: { label: "Desconectado", color: "bg-red-100 text-red-700 border-red-200", icon: WifiOff },
    connecting: { label: "Conectando", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Loader2 },
  };
  const cfg = config[status] || config.close;
  const Icon = cfg.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className={`w-3 h-3 ${status === "connecting" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function QRCodeDisplay({ qrCode, onRefresh, isLoading }) {
  if (!qrCode) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <QrCode className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhum QR Code disponivel</p>
        <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isLoading ? "Carregando..." : "Gerar QR Code"}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center py-6 space-y-4">
      <div className="bg-white p-4 rounded-2xl border-2 border-border shadow-lg">
        <img src={qrCode} alt="QR Code" className="w-72 h-72 object-contain" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Escaneie com o WhatsApp</p>
        <p className="text-xs text-muted-foreground">
          WhatsApp - Menu - Dispositivos conectados - Conectar dispositivo
        </p>
      </div>
      <Button onClick={onRefresh} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="w-4 h-4" /> Atualizar
      </Button>
    </div>
  );
}

function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [instance, setInstance] = useState("fiadopro");
  const [loading, setLoading] = useState(false);
  
  const handleConnect = async () => {
    if (!apiKey) {
      toast.error("Cole sua API Key");
      return;
    }
    
    setLoading(true);
    try {
      setEvolutionConfig("https://api.evolutionapi.com.br", apiKey, instance);
      
      const createRes = await createInstance();
      if (!createRes.ok) {
        toast.error("Erro ao criar instancia: " + createRes.error);
        return;
      }
      
      toast.success("Instancia criada! Configure o webhook abaixo.");
      onComplete();
    } catch (error) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {step === 1 && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium">100% Gratuito</p>
            <p className="text-xs text-green-700 mt-1">
              O Evolution API hospeda o Baileys para voce. Sem custo por mensagem.
            </p>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium">Passo 1: Crie sua conta</p>
            <a 
              href="https://evolution-api.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> Acessar Evolution API (gratis)
            </a>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-medium">Passo 2: Copie sua API Key</p>
            <p className="text-xs text-muted-foreground">
              No painel do Evolution API, va em "API Key" e copie a chave.
            </p>
          </div>
          
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua API Key aqui"
            />
          </div>
          
          <div>
            <Label>Nome da Instancia</Label>
            <Input
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              placeholder="fiadopro"
            />
          </div>
          
          <Button onClick={handleConnect} className="w-full" disabled={loading || !apiKey}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Conectando..." : "Conectar"}
          </Button>
        </>
      )}
    </div>
  );
}

export default function WhatsAppConnectionPanel() {
  const queryClient = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const configured = isConfigured();
  
  const { data: waStatus, isLoading, refetch } = useQuery({
    queryKey: ["wa_status"],
    queryFn: async () => {
      if (!configured) return { status: "desconectado", qr_code: null };
      
      try {
        const stateRes = await getConnectionState();
        if (stateRes.ok) {
          return {
            status: stateRes.data?.instance?.state || "close",
            qr_code: null,
          };
        }
        return { status: "close", qr_code: null };
      } catch {
        return { status: "close", qr_code: null };
      }
    },
    refetchInterval: 5000,
    enabled: configured,
  });
  
  const { data: qrData, isLoading: loadingQR, refetch: refreshQR } = useQuery({
    queryKey: ["wa_qr"],
    queryFn: async () => {
      if (!configured) return null;
      
      try {
        const res = await getQRCode();
        if (res.ok && res.data?.base64) {
          return res.data.base64;
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: configured && waStatus?.status !== "open",
    refetchInterval: 3000,
  });
  
  const handleSetupComplete = useCallback(() => {
    setShowSetup(false);
    queryClient.invalidateQueries({ queryKey: ["wa_status"] });
    queryClient.invalidateQueries({ queryKey: ["wa_qr"] });
  }, [queryClient]);
  
  const handleRefreshQR = useCallback(() => {
    refreshQR();
  }, [refreshQR]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const status = waStatus?.status || "close";
  const qrCode = qrData || null;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp AI Agent</h2>
          <p className="text-sm text-muted-foreground">Atendimento automatico via WhatsApp (100% gratuito)</p>
        </div>
      </div>
      
      {!configured && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Configure o WhatsApp</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Conecte seu WhatsApp para receber pedidos e atualizar status automaticamente.
              </p>
              <p className="text-xs text-green-600 mt-2 font-medium">
                Custo total: R$ 0,00 (Evolution API + Baileys = gratis)
              </p>
              <Button onClick={() => setShowSetup(true)} className="mt-4 gap-2">
                <Settings className="w-4 h-4" /> Configurar Agora
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status === "open" ? "bg-green-100" : "bg-muted"}`}>
              {status === "open" ? (
                <Wifi className="w-6 h-6 text-green-600" />
              ) : (
                <WifiOff className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">WhatsApp</h3>
                <StatusBadge status={status} />
              </div>
              {status === "open" && (
                <p className="text-sm text-green-600 mt-0.5">Recebendo mensagens</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
              <Zap className="w-3 h-3" /> Gratis
            </span>
            {configured && status !== "open" && (
              <Button onClick={() => setShowSetup(true)} variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {status !== "open" && configured && (
          <div className="border-t border-border pt-4">
            <QRCodeDisplay qrCode={qrCode} onRefresh={handleRefreshQR} isLoading={loadingQR} />
          </div>
        )}
        
        {status === "open" && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">WhatsApp conectado! Bot respondendo automaticamente.</span>
            </div>
          </div>
        )}
        
        <div className="border-t border-border pt-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Bot className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Robot</p>
                <p className="text-xs text-muted-foreground">Ativo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <User className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Humano</p>
                <p className="text-xs text-muted-foreground">Quando necessario</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Como Funciona</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-green-600">1</span>
            </div>
            <div>
              <p className="text-sm font-medium">Cliente envia WhatsApp</p>
              <p className="text-xs text-muted-foreground">Mensagem chega automaticamente</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-green-600">2</span>
            </div>
            <div>
              <p className="text-sm font-medium">Bot responde</p>
              <p className="text-xs text-muted-foreground">Menu, saldo, pedido, pagamento</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-green-600">3</span>
            </div>
            <div>
              <p className="text-sm font-medium">Pedido registrado</p>
              <p className="text-xs text-muted-foreground">Status atualizado no sistema</p>
            </div>
          </div>
        </div>
      </div>
      
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> Configurar WhatsApp
            </DialogTitle>
          </DialogHeader>
          <SetupWizard onComplete={handleSetupComplete} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
