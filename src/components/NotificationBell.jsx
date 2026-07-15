import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationBell() {
  const { isSupported, permission, subscribe, unsubscribe, subscription } = usePushNotifications();
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
          if (permission === "granted") {
            try {
              new Notification(payload.new.title, {
                body: payload.new.body,
                icon: "/favicon.svg",
                tag: payload.new.tag || `notif-${payload.new.id}`,
              });
            } catch {
              // notification failed silently
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  const markAsRead = async (id) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleTogglePush = async () => {
    if (subscription) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
      >
        {subscription ? (
          <BellRing className="w-4 h-4 text-foreground" />
        ) : (
          <Bell className="w-4 h-4 text-foreground" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col lg:absolute lg:h-auto lg:top-auto lg:right-0 lg:mt-2 lg:rounded-xl lg:w-96 lg:max-h-[70vh]">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="font-semibold text-foreground">Notificações</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Marcar lidas
                  </button>
                )}
                <button onClick={() => setShowPanel(false)} className="p-1 hover:bg-muted rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="shrink-0 p-3 border-b border-border">
              <Button
                size="sm"
                variant={subscription ? "outline" : "default"}
                className="w-full gap-2 text-xs"
                onClick={handleTogglePush}
              >
                {subscription ? (
                  <>
                    <Bell className="w-3.5 h-3.5" /> Notificações Push Ativas
                  </>
                ) : (
                  <>
                    <BellRing className="w-3.5 h-3.5" /> Ativar Notificações Push
                  </>
                )}
              </Button>
              {!isSupported && (
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Push não suportado neste navegador
                </p>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-10">
                  Nenhuma notificação
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.url) window.location.href = n.url;
                    }}
                    className={`w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
