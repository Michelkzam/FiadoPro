import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Send, Settings, Clock, Users, CheckCircle, XCircle,
  Loader2, Wifi, WifiOff, Copy, Eye, ImageIcon, X
} from "lucide-react";
import { toast } from "sonner";
import db from "@/lib/db";
import { useMenuSender } from "@/hooks/useMenuSender";
import { MAX_UPLOAD_SIZE, formatCurrency } from "@/lib/constants";

export default function MenuSender() {
  const {
    customers,
    products,
    storeProfile,
    previewMessage,
    sending,
    progress,
    lastSendResult,
    scheduleConfig,
    configureApi,
    testConnection,
    sendMenu,
    updateSchedule,
  } = useMenuSender();

  const [activeTab, setActiveTab] = useState("preview");
  const [apiConfig, setApiConfig] = useState({ instanceId: "", token: "" });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ schedule: false, customers: false });
  const [menuImage, setMenuImage] = useState(null);
  const [menuImagePreview, setMenuImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("whatsapp_config");
    if (saved) {
      const config = JSON.parse(saved);
      setApiConfig(config);
    }
  }, []);

  const handleConfigure = () => {
    if (!apiConfig.instanceId || !apiConfig.token) {
      toast.error("Preencha Instance ID e Token");
      return;
    }
    configureApi(apiConfig.instanceId, apiConfig.token);
    toast.success("Configuração salva!");
    setShowConfigDialog(false);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testConnection();
      setConnectionStatus(result);
      if (result.connected) {
        toast.success("Conexão OK!");
      } else {
        toast.error(result.error || "Falha na conexão");
      }
    } catch (error) {
      setConnectionStatus({ connected: false, error: error.message });
      toast.error("Erro ao testar conexão");
    }
    setTestingConnection(false);
  };

  const handleSend = async () => {
    if (!apiConfig.instanceId || !apiConfig.token) {
      toast.error("Configure a Z-API primeiro");
      setShowConfigDialog(true);
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSend = async () => {
    setShowConfirmDialog(false);
    try {
      await sendMenu({ customMessage, customerFilter, customerIds: selectedCustomers, imageUrl: menuImagePreview });
      toast.success("Cardápio enviado com sucesso!");
    } catch (error) {
      toast.error(error.message || "Erro ao enviar cardápio");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = MAX_UPLOAD_SIZE;
    if (file.size > MAX_SIZE) {
      toast.error("Imagem muito grande. Máximo: 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setMenuImage(file);
      setMenuImagePreview(file_url);
    } catch {
      toast.error("Erro ao enviar imagem");
    }
    setUploadingImage(false);
  };

  const removeImage = () => {
    setMenuImage(null);
    setMenuImagePreview(null);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(previewMessage);
    toast.success("Mensagem copiada!");
  };

  const toggleCustomerSelection = (customerId) => {
    setSelectedCustomers((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  };

  const tabs = [
    { id: "preview", label: "Preview", icon: Eye },
    { id: "send", label: "Enviar", icon: Send },
    { id: "schedule", label: "Agendar", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Send className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Enviar Cardápio</h1>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus && (
            <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              connectionStatus.connected
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {connectionStatus.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {connectionStatus.connected ? "Conectado" : "Desconectado"}
            </span>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowConfigDialog(true)}>
            <Settings className="w-4 h-4" /> Configurar Z-API
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "preview" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <h2 className="font-semibold text-foreground mb-3">Produtos Disponíveis</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {products.filter((p) => p.available !== false).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum produto disponível
                  </p>
                ) : (
                  products
                    .filter((p) => p.available !== false)
                    .reduce((acc, p) => {
                      const cat = p.category || "Outros";
                      if (!acc.find((a) => a.category === cat)) {
                        acc.push({ category: cat, items: [] });
                      }
                      acc.find((a) => a.category === cat).items.push(p);
                      return acc;
                    }, [])
                    .map((group) => (
                      <div key={group.category}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                          {group.category}
                        </p>
                        {group.items.map((p) => (
                          <div key={p.id} className="flex justify-between text-sm py-1">
                            <span>{p.name}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(p.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <h2 className="font-semibold text-foreground mb-3">Mensagem Personalizada</h2>
              <Textarea
                placeholder="Adicione uma mensagem extra ao cardápio (opcional)"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <h2 className="font-semibold text-foreground mb-3">Imagem do Cardápio</h2>
              <p className="text-xs text-muted-foreground mb-3">Envie uma imagem junto com a mensagem (opcional)</p>
              {menuImagePreview ? (
                <div className="relative">
                  <img src={menuImagePreview} alt="Cardápio" className="w-full max-h-48 object-cover rounded-lg" />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    {uploadingImage ? (
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {uploadingImage ? "Enviando..." : "Clique para enviar imagem"}
                    </span>
                    <span className="text-xs text-muted-foreground">JPG, PNG ou WebP (máx. 5MB)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Preview da Mensagem</h2>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyMessage}>
                <Copy className="w-3.5 h-3.5" /> Copiar
              </Button>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 whitespace-pre-wrap text-sm text-green-900 font-mono max-h-96 overflow-y-auto">
              {previewMessage}
            </div>
          </div>
        </div>
      )}

      {activeTab === "send" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">
                Clientes para Envio ({customers.length} ativos)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCustomerFilter("all")}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${
                    customerFilter === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-muted"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setCustomerFilter("selected")}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors ${
                    customerFilter === "selected"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:bg-muted"
                  }`}
                >
                  Selecionar
                </button>
              </div>
            </div>

            {customerFilter === "selected" && (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg p-2">
                {customers.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(c.id)}
                      onChange={() => toggleCustomerSelection(c.id)}
                      className="rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {customerFilter === "all" && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                <Users className="w-4 h-4 inline mr-2" />
                Todos os {customers.length} clientes ativos receberão o cardápio
              </div>
            )}
          </div>

          {sending && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="font-medium text-foreground">Enviando cardápio...</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {progress.current} de {progress.total} clientes
              </p>
            </div>
          )}

          {lastSendResult && !sending && (
            <div className={`rounded-xl border shadow-sm p-4 ${
              lastSendResult.error
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}>
              {lastSendResult.error ? (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Erro: {lastSendResult.error}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Envio concluído!</span>
                  </div>
                  <div className="text-sm text-green-600">
                    <p>✅ {lastSendResult.successful} enviados com sucesso</p>
                    {lastSendResult.failed > 0 && (
                      <p>❌ {lastSendResult.failed} falhas</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleSend}
              disabled={sending || (!apiConfig.instanceId || !apiConfig.token)}
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Enviando..." : "Enviar Cardápio Agora"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Agendamento Diário</h2>
              <Switch
                checked={scheduleConfig.enabled}
                onCheckedChange={(checked) =>
                  updateSchedule({ ...scheduleConfig, enabled: checked })
                }
              />
            </div>

            {scheduleConfig.enabled && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-1.5">
                    <Label>Hora</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={scheduleConfig.hour}
                      onChange={(e) =>
                        updateSchedule({ ...scheduleConfig, hour: e.target.value.padStart(2, "0") })
                      }
                      className="w-20"
                    />
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground">:</span>
                  <div className="space-y-1.5">
                    <Label>Minuto</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={scheduleConfig.minute}
                      onChange={(e) =>
                        updateSchedule({ ...scheduleConfig, minute: e.target.value.padStart(2, "0") })
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 inline mr-2" />
                  O cardápio será enviado automaticamente todos os dias às{" "}
                  <strong>
                    {scheduleConfig.hour}:{scheduleConfig.minute}
                  </strong>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                  ⚠️ O agendamento funciona apenas enquanto a página estiver aberta.
                  Para envio automático 24/7, considere usar um servidor backend.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Z-API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Instance ID</Label>
              <Input
                placeholder="Sua Instance ID da Z-API"
                value={apiConfig.instanceId}
                onChange={(e) => setApiConfig({ ...apiConfig, instanceId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Token</Label>
              <Input
                type="password"
                placeholder="Seu Token da Z-API"
                value={apiConfig.token}
                onChange={(e) => setApiConfig({ ...apiConfig, token: e.target.value })}
              />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Como obter:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Acesse <a href="https://z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">z-api.io</a></li>
                <li>Crie uma instância</li>
                <li>Copie o Instance ID e Token</li>
              </ol>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? "Testando..." : "Testar Conexão"}
            </Button>
            <Button onClick={handleConfigure}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Envio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Você está prestes a enviar o cardápio do dia para{" "}
              <strong className="text-foreground">
                {customerFilter === "all"
                  ? `${customers.length} clientes`
                  : `${selectedCustomers.length} clientes selecionados`}
              </strong>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              Esta ação enviará mensagens reais via WhatsApp. Deseja continuar?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSend} disabled={sending}>
              {sending ? "Enviando..." : "Confirmar Envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
