import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wifi, WifiOff, QrCode, Bot, User, RefreshCw, CheckCircle, Loader2, Zap, Settings, Copy, Check, AlertTriangle } from "lucide-react";

function StatusBadge({ status }) {
  const cfg = {
    conectado: { label: "Conectado", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
    aguardando_qr: { label: "Aguardando QR", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: QrCode },
    desconectado: { label: "Desconectado", color: "bg-red-100 text-red-700 border-red-200", icon: WifiOff },
  };
  const c = cfg[status] || cfg.desconectado;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.color}`}>
      <Icon className="w-3 h-3" />{c.label}
    </span>
  );
}

function SetupWizard({ onClose }) {
  const [copied, setCopied] = useState(false);

  const copyCmd = () => {
    navigator.clipboard.writeText("cd server && npm install && npm start");
    setCopied(true);
    toast.success("Comando copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800 font-medium">100% Gratuito</p>
        <p className="text-xs text-green-700 mt-1">
          O bot roda no seu computador. Sem custo, sem limite de mensagens.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Como iniciar:</p>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-green-600">1</span>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Windows:</strong> Clique duas vezes no arquivo <code className="bg-muted px-1 rounded">iniciar.bat</code>
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-green-600">2</span>
          </div>
          <p className="text-sm text-muted-foreground">Escaneie o QR Code que aparecer no navegador</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-green-600">3</span>
          </div>
          <p className="text-sm text-muted-foreground">Pronto! O bot esta ativo e respondendo</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Ou via terminal:</p>
        <div className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
          <code className="text-green-400 text-xs">cd server && npm install && npm start</code>
          <Button onClick={copyCmd} variant="ghost" size="sm" className="ml-2">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </Button>
        </div>
      </div>

      <Button onClick={onClose} className="w-full">Entendi</Button>
    </div>
  );
}

export default function WhatsAppConnectionPanel() {
  const [showSetup, setShowSetup] = useState(false);
  const [serverUrl, setServerUrl] = useState("http://localhost:3001");

  const { data: status, isLoading, error: statusError } = useQuery({
    queryKey: ["wa_status", serverUrl],
    queryFn: async () => {
      try {
        const res = await fetch(`${serverUrl}/status`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error("Server error");
        return res.json();
      } catch {
        return { status: "desconectado", offline: true };
      }
    },
    refetchInterval: 5000,
    retry: 1,
  });

  const { data: qrData, refetch } = useQuery({
    queryKey: ["wa_qr", serverUrl],
    queryFn: async () => {
      try {
        const res = await fetch(`${serverUrl}/qr`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        return data.qr || null;
      } catch {
        return null;
      }
    },
    refetchInterval: 3000,
    enabled: status?.status !== "conectado" && status?.status !== "desconectado",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const st = status?.status || "desconectado";
  const isOffline = status?.offline;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp AI Agent</h2>
          <p className="text-sm text-muted-foreground">Atendimento automatico via WhatsApp</p>
        </div>
      </div>

      {isOffline && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Servidor WhatsApp offline</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Para conectar o WhatsApp, inicie o servidor. Clique no botao abaixo para copiar o comando:
              </p>
              <div className="bg-gray-900 rounded-lg p-3 mt-3 flex items-center">
                <code className="text-green-400 text-sm flex-1">cd server && npm install && npm start</code>
                <Button onClick={() => { navigator.clipboard.writeText("cd server && npm install && npm start"); toast.success("Comando copiado! Cole no terminal."); }} variant="ghost" size="sm">
                  <Copy className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Ou execute o arquivo <strong>iniciar.bat</strong> na pasta do projeto (Windows).
              </p>
              <div className="flex gap-2 mt-3">
                <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Testar Conexao
                </Button>
                <Button onClick={() => setShowSetup(true)} variant="ghost" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" /> Instrucoes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${st === "conectado" ? "bg-green-100" : "bg-muted"}`}>
              {st === "conectado" ? <Wifi className="w-6 h-6 text-green-600" /> : <WifiOff className="w-6 h-6 text-muted-foreground" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">WhatsApp</h3>
                <StatusBadge status={st} />
              </div>
              {st === "conectado" && <p className="text-sm text-green-600 mt-0.5">Bot ativo e respondendo</p>}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            <Zap className="w-3 h-3" /> Gratis
          </span>
        </div>

        {st === "aguardando_qr" && qrData && (
          <div className="border-t border-border pt-4">
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="bg-white p-4 rounded-2xl border-2 border-border shadow-lg">
                <img src={qrData} alt="QR Code" className="w-72 h-72 object-contain" />
              </div>
              <p className="text-xs text-muted-foreground">Escaneie com o WhatsApp - Dispositivos conectados</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" /> Atualizar
              </Button>
            </div>
          </div>
        )}

        {st === "aguardando_qr" && !qrData && (
          <div className="border-t border-border pt-4">
            <div className="flex flex-col items-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Aguardando QR Code do servidor...</p>
              <p className="text-xs text-muted-foreground">Certifique-se que o servidor esta rodando</p>
            </div>
          </div>
        )}

        {st === "conectado" && (
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
          {[
            { n: "1", t: "Inicie o servidor", d: "Execute iniciar.bat ou use o terminal" },
            { n: "2", t: "Escaneie o QR Code", d: "WhatsApp > Dispositivos conectados > Conectar" },
            { n: "3", t: "Pronto!", d: "Cliente envia msg, bot responde automaticamente" },
          ].map(i => (
            <div key={i.n} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-green-600">{i.n}</span>
              </div>
              <div>
                <p className="text-sm font-medium">{i.t}</p>
                <p className="text-xs text-muted-foreground">{i.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar WhatsApp</DialogTitle>
          </DialogHeader>
          <SetupWizard onClose={() => setShowSetup(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
