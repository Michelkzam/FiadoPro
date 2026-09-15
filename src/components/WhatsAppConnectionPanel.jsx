import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wifi, WifiOff, QrCode, Bot, User, RefreshCw, CheckCircle, Loader2, Zap, Power } from "lucide-react";

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

const getServerUrl = () => {
  const { hostname, port } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "";
  return "http://localhost:3001";
};

export default function WhatsAppConnectionPanel() {
  const serverUrl = getServerUrl();

  const { data: status, isLoading } = useQuery({
    queryKey: ["wa_status"],
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

  const { data: qrData, refetch: refetchQr } = useQuery({
    queryKey: ["wa_qr"],
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
    enabled: status?.status === "aguardando_qr",
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${serverUrl}/status`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error("Servidor offline");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Servidor encontrado! Aguardando QR Code...");
      refetchQr();
    },
    onError: () => {
      toast.error("Servidor WhatsApp não encontrado. Execute npm run dev primeiro.");
    },
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
      <div>
        <h2 className="text-xl font-bold text-foreground">WhatsApp AI Agent</h2>
        <p className="text-sm text-muted-foreground">Atendimento automatico via WhatsApp</p>
      </div>

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

        {isOffline && (
          <div className="border-t border-border pt-4">
            <div className="flex flex-col items-center py-6 space-y-4">
              <p className="text-sm text-muted-foreground">Servidor WhatsApp não encontrado</p>
              <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending} className="gap-2">
                {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                Conectar
              </Button>
              <p className="text-xs text-muted-foreground">
                Execute <code className="bg-muted px-1 rounded">npm run dev</code> ou <code className="bg-muted px-1 rounded">iniciar.bat</code> primeiro
              </p>
            </div>
          </div>
        )}

        {st === "aguardando_qr" && (
          <div className="border-t border-border pt-4">
            <div className="flex flex-col items-center py-6 space-y-4">
              {qrData ? (
                <>
                  <div className="bg-white p-4 rounded-2xl border-2 border-border shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`}
                      alt="QR Code"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Escaneie com o WhatsApp - Dispositivos conectados</p>
                  <Button onClick={() => refetchQr()} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Atualizar
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center py-6 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Aguardando QR Code...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {st === "conectado" && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">WhatsApp conectado! Bot respondendo automaticamente.</span>
              </div>
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
            { n: "1", t: "Execute npm run dev", d: "Ou clique duas vezes em iniciar.bat" },
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
    </div>
  );
}
