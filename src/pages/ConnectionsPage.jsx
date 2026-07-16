import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Wifi, WifiOff, Trash2, RefreshCw, CheckCircle, XCircle,
  MessageSquare, Camera, Video, Globe, ExternalLink
} from "lucide-react";
import db from "@/lib/db";

const REDES = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    color: "green",
    description: "Via Evolution API (self-hosted, custo zero)",
    fields: [
      { key: "whatsapp_instance_id", label: "Instance ID", placeholder: "Ex: my-instance" },
      { key: "whatsapp_api_url", label: "API URL", placeholder: "Ex: https://evo.yourdomain.com" },
      { key: "whatsapp_api_key", label: "API Key", placeholder: "Sua chave de API" },
      { key: "whatsapp_phone_number", label: "Telefone", placeholder: "Ex: 5511999999999" },
    ],
    docs: "https://doc.evolution-api.com/",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: "📨",
    color: "blue",
    description: "Via Bot API oficial (gratuito)",
    fields: [
      { key: "telegram_bot_token", label: "Bot Token", placeholder: "Ex: 123456:ABC-DEF..." },
      { key: "telegram_bot_username", label: "Username", placeholder: "Ex: meu_bot" },
    ],
    docs: "https://core.telegram.org/bots",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "📸",
    color: "pink",
    description: "Via Meta Graph API (gratuito para Business)",
    fields: [
      { key: "meta_access_token", label: "Access Token", placeholder: "Token de acesso da página" },
      { key: "meta_ig_user_id", label: "Instagram User ID", placeholder: "ID do Instagram Business" },
      { key: "meta_page_name", label: "Nome da Página", placeholder: "Nome da página no Facebook" },
    ],
    docs: "https://developers.facebook.com/docs/instagram-api",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "👤",
    color: "indigo",
    description: "Via Meta Graph API (gratuito para Business)",
    fields: [
      { key: "meta_access_token", label: "Access Token", placeholder: "Token de acesso da página" },
      { key: "meta_page_id", label: "Page ID", placeholder: "ID da página no Facebook" },
    ],
    docs: "https://developers.facebook.com/docs/pages-api",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: "🎵",
    color: "red",
    description: "Via Content Posting API (gratuito)",
    fields: [
      { key: "tiktok_access_token", label: "Access Token", placeholder: "Token de acesso" },
      { key: "tiktok_open_id", label: "Open ID", placeholder: "ID do usuário" },
    ],
    docs: "https://developers.tiktok.com/doc/content-posting-api",
  },
  {
    id: "kwai",
    label: "Kwai",
    icon: "🎬",
    color: "orange",
    description: "Postagem semiautomática (requer configuração)",
    fields: [
      { key: "kwai_username", label: "Usuário", placeholder: "Seu usuário do Kwai" },
    ],
    docs: null,
  },
];

function ConnectionCard({ conexao, onDelete, onTest }) {
  const rede = REDES.find((r) => r.id === conexao.rede_social);
  const isConnected = conexao.status === "ativo" && conexao.whatsapp_connected !== false;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{rede?.icon}</span>
          <div>
            <p className="font-semibold text-foreground text-sm">{conexao.nome_conexao}</p>
            <p className="text-xs text-muted-foreground">{rede?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" /> Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <XCircle className="w-3 h-3" /> Desconectado
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={() => onDelete(conexao.id)} className="text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        {conexao.rede_social === "whatsapp" && conexao.whatsapp_phone_number && (
          <p>📱 {conexao.whatsapp_phone_number}</p>
        )}
        {conexao.rede_social === "telegram" && conexao.telegram_bot_username && (
          <p>🤖 @{conexao.telegram_bot_username}</p>
        )}
        {conexao.rede_social === "instagram" && conexao.meta_page_name && (
          <p>📸 {conexao.meta_page_name}</p>
        )}
        {conexao.rede_social === "facebook" && conexao.meta_page_name && (
          <p>👤 {conexao.meta_page_name}</p>
        )}
        {conexao.rede_social === "tiktok" && conexao.tiktok_open_id && (
          <p>🎵 ID: {conexao.tiktok_open_id}</p>
        )}
        {conexao.rede_social === "kwai" && conexao.kwai_username && (
          <p>🎬 @{conexao.kwai_username}</p>
        )}
      </div>
    </div>
  );
}

function NewConnectionForm({ onClose, onCreated }) {
  const [selectedRede, setSelectedRede] = useState(null);
  const [form, setForm] = useState({ nome_conexao: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedRede) { toast.error("Selecione uma rede social"); return; }
    if (!form.nome_conexao.trim()) { toast.error("Nome da conexão é obrigatório"); return; }

    setSaving(true);
    try {
      await db.entities.ConexaoRede.create({
        rede_social: selectedRede,
        nome_conexao: form.nome_conexao,
        status: "ativo",
        ...form,
      });
      toast.success("Conexão criada!");
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Nova Conexão</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕ Fechar</button>
      </div>

      <div>
        <Label>Rede Social *</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {REDES.map((rede) => (
            <button
              key={rede.id}
              onClick={() => setSelectedRede(rede.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                selectedRede === rede.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <span className="text-xl">{rede.icon}</span>
              {rede.label}
            </button>
          ))}
        </div>
      </div>

      {selectedRede && (
        <>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{REDES.find((r) => r.id === selectedRede)?.description}</p>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Nome da Conexão *</Label>
              <Input
                value={form.nome_conexao}
                onChange={(e) => setForm({ ...form, nome_conexao: e.target.value })}
                placeholder="Ex: WhatsApp Bar do João"
              />
            </div>

            {REDES.find((r) => r.id === selectedRede)?.fields.map((field) => (
              <div key={field.key}>
                <Label>{field.label}</Label>
                <Input
                  value={form[field.key] || ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  type={field.key.includes("token") || field.key.includes("key") ? "password" : "text"}
                />
              </div>
            ))}
          </div>

          {REDES.find((r) => r.id === selectedRede)?.docs && (
            <a
              href={REDES.find((r) => r.id === selectedRede).docs}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Ver documentação
            </a>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Criar Conexão"}
          </Button>
        </>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const { data } = await db.entities.ConexaoRede.list("-created_at", 50);
      setConnections(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta conexão?")) return;
    await db.entities.ConexaoRede.delete(id);
    toast.success("Conexão excluída");
    loadConnections();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground">Conexões de Redes Sociais</h2>
          <p className="text-xs text-muted-foreground">Conecte suas contas para enviar campanhas</p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      {showNew && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <NewConnectionForm onClose={() => setShowNew(false)} onCreated={loadConnections} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : connections.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <Wifi className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">Nenhuma conexão</p>
          <p className="text-xs text-muted-foreground mt-1">Conecte suas redes sociais para iniciar campanhas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {connections.map((conexao) => (
            <ConnectionCard key={conexao.id} conexao={conexao} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">ℹ️ Sobre as Conexões</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p><strong>WhatsApp:</strong> Requer Evolution API self-hosted. Documentação: <a href="https://doc.evolution-api.com/" target="_blank" className="text-primary hover:underline">doc.evolution-api.com</a></p>
          <p><strong>Telegram:</strong> Crie um bot via @BotFather no Telegram. 100% gratuito.</p>
          <p><strong>Instagram/Facebook:</strong> Requer conta Business conectada ao Meta for Developers.</p>
          <p><strong>TikTok:</strong> Requer app registrado no TikTok Developers Portal.</p>
          <p><strong>Kwai:</strong> Postagem semiautomática — o sistema prepara o conteúdo para postagem manual.</p>
        </div>
      </div>
    </div>
  );
}
