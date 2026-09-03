import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wifi, WifiOff, QrCode, Bot, User, RefreshCw, CheckCircle, Loader2, Zap, Settings, Terminal, Copy, Check } from "lucide-react";

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
        <p className="text-sm text-green-800 font-medium">100% Gratuito e Pra Sempre</p>
        <p className="text-xs text-green-700 mt-1">
          Roda no seu computador. Sem conta, sem mensalidade, sem limite.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Abra o terminal e execute:</p>
        <div className="bg-gray-900 rounded-lg p-3 flex items-center justify-between">
          <code className="text-green-400 text-sm">cd server && npm install && npm start</code>
          <Button onClick={copyCmd} variant="ghost" size="sm" className="ml-2">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p><strong>1.</strong> Abra o terminal na pasta do projeto</p>
        <p><strong>2.</strong> Execute o comando acima</p>
        <p><strong>3.</strong> Escaneie o QR Code que aparecer no terminal</p>
        <p><strong>4.</strong> Volte aqui e atualize a pagina</p>
      </div>

      <Button onClick={onClose} className="w-full">Entendi</Button>
    </div>
  );
}

export default function WhatsAppConnectionPanel() {
  const [showSetup, setShowSetup] = useState(false);
  const [serverUrl, setServerUrl] = useState("http://localhost:3001");

  const { data: status, isLoading } = useQuery({
    queryKey: ["wa_status", serverUrl],
    queryFn: async () => {
      try {
        const res = await fetch(`${serverUrl}/status`);
        return res.json();
      } catch {
        return { status: "desconectado" };
      }
    },
    refetchInterval: 3000,
  });

  const { data: qrData, isLoading: loadingQR, refetch } = useQuery({
    queryKey: ["wa_qr", serverUrl],
    queryFn: async () => {
      try {
        const res = await fetch(`${serverUrl}/qr`);
        const data = await res.json();
        return data.qr || null;
      } catch {
        return null;
      }
    },
    refetchInterval: 2000,
    enabled: status?.status !== "conectado",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const st = status?.status || "desconectado";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp AI Agent</h2>
          <p className="text-sm text-muted-foreground">Atendimento automatico via WhatsApp</p>
        </div>
      </div>

      {st === "desconectado" && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Terminal className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Inicie o servidor WhatsApp</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Abra o terminal e execute o comando abaixo. O QR Code vai aparecer la.
              </p>
              <div className="bg-gray-900 rounded-lg p-3 mt-3 flex items-center">
                <code className="text-green-400 text-sm flex-1">cd server && npm install && npm start</code>
              </div>
              <Button onClick={() => setShowSetup(true)} variant="outline" size="sm" className="mt-3 gap-2">
                <Settings className="w-4 h-4" /> Ver instrucoes completas
              </Button>
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
              <p className="text-xs text-muted-foreground">Execute: cd server && npm start</p>
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
            { n: "1", t: "Execute o servidor", d: "cd server && npm start" },
            { n: "2", t: "Escaneie o QR Code", d: "WhatsApp - Dispositivos conectados" },
            { n: "3", t: "Pronto!", d: "Cliente envia msg, bot responde, pedido registrado" },
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
