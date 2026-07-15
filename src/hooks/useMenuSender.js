import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db from "@/lib/db";
import { sendBulkMessages, checkConnection, configureWhatsApp, getConfig } from "@/services/whatsappApi";
import { formatCurrency, formatDateBR } from "@/lib/constants";

const STORAGE_KEY = "whatsapp_config";
const SCHEDULE_KEY = "menu_schedule_config";

const loadConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

const loadScheduleConfig = () => {
  try {
    const saved = localStorage.getItem(SCHEDULE_KEY);
    return saved ? JSON.parse(saved) : { enabled: false, hour: "11", minute: "30" };
  } catch {
    return { enabled: false, hour: "11", minute: "30" };
  }
};

const saveScheduleConfig = (config) => {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(config));
};

const generateMenuMessage = (products, storeProfile, customMessage = "") => {
  const storeName = storeProfile?.store_name || "Nossa Loja";
  const today = formatDateBR();
  const greeting = getGreeting();

  const availableProducts = products.filter((p) => p.available !== false);

  const grouped = availableProducts.reduce((acc, p) => {
    const cat = p.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  let message = `${greeting} ${storeName}! 🍽️\n\n`;
  message += `📋 *Cardápio do Dia - ${today}*\n`;
  message += "━━━━━━━━━━━━━━━━━━━━━━\n\n";

  for (const [category, items] of Object.entries(grouped)) {
    message += `*${category}*\n`;
    for (const item of items) {
      const price = formatCurrency(item.price);
      const desc = item.description ? ` - ${item.description}` : "";
      message += `✅ ${item.name}${desc}\n`;
      message += `   💰 ${price}\n`;
    }
    message += "\n";
  }

  message += "━━━━━━━━━━━━━━━━━━━━━━\n";

  if (customMessage) {
    message += `\n${customMessage}\n\n`;
  }

  message += `Para fazer seu pedido, entre em contato! 😊`;

  return message;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia,";
  if (hour < 18) return "Boa tarde,";
  return "Boa noite,";
};

export function useMenuSender() {
  const queryClient = useQueryClient();
  const scheduleTimerRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastSendResult, setLastSendResult] = useState(null);
  const [scheduleConfig, setScheduleConfig] = useState(loadScheduleConfig);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => db.entities.Customer.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => db.entities.Product.list("category", 200),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["store_profile"],
    queryFn: () => db.entities.StoreProfile.list(),
  });

  const storeProfile = profiles[0];

  const activeCustomers = customers.filter(
    (c) => c.status !== "inativo" && c.phone
  );

  const previewMessage = generateMenuMessage(products, storeProfile);

  const configureApi = useCallback((instanceId, token) => {
    configureWhatsApp(instanceId, token);
    saveConfig({ instanceId, token });
  }, []);

  const testConnection = useCallback(async () => {
    const savedConfig = loadConfig();
    if (savedConfig) {
      configureWhatsApp(savedConfig.instanceId, savedConfig.token);
    }
    return checkConnection();
  }, []);

  const sendMenu = useCallback(
    async (options = {}) => {
      const { customMessage = "", customerFilter = "all", customerIds = [] } = options;

      setSending(true);
      setProgress({ current: 0, total: 0 });
      setLastSendResult(null);

      try {
        let recipients = activeCustomers;

        if (customerFilter === "selected" && customerIds.length > 0) {
          recipients = activeCustomers.filter((c) => customerIds.includes(c.id));
        }

        if (recipients.length === 0) {
          throw new Error("Nenhum cliente ativo com telefone encontrado");
        }

        const message = generateMenuMessage(products, storeProfile, customMessage);

        const results = await sendBulkMessages(
          recipients,
          message,
          (current, total) => setProgress({ current, total })
        );

        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        const sendRecord = {
          date: new Date().toISOString(),
          total: recipients.length,
          successful,
          failed,
          message,
          results,
        };

        await db.entities.MenuSendHistory.create(sendRecord).catch(() => {});

        setLastSendResult(sendRecord);
        return sendRecord;
      } catch (error) {
        setLastSendResult({ error: error.message });
        throw error;
      } finally {
        setSending(false);
      }
    },
    [activeCustomers, products, storeProfile]
  );

  const updateSchedule = useCallback((newConfig) => {
    setScheduleConfig(newConfig);
    saveScheduleConfig(newConfig);
  }, []);

  const getTodayHistory = useCallback(async () => {
    try {
      const history = await db.entities.MenuSendHistory.list("-date", 10);
      const today = formatDateBR();
      return history.filter((h) => {
        const sendDate = new Date(h.date).toLocaleDateString("pt-BR");
        return sendDate === today;
      });
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    const savedConfig = loadConfig();
    if (savedConfig) {
      configureWhatsApp(savedConfig.instanceId, savedConfig.token);
    }
  }, []);

  useEffect(() => {
    if (scheduleTimerRef.current) {
      clearInterval(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }

    if (scheduleConfig.enabled) {
      scheduleTimerRef.current = setInterval(() => {
        const now = new Date();
        const hour = now.getHours().toString().padStart(2, "0");
        const minute = now.getMinutes().toString().padStart(2, "0");

        if (hour === scheduleConfig.hour && minute === scheduleConfig.minute) {
          sendMenu().catch(console.error);
        }
      }, 60000);
    }

    return () => {
      if (scheduleTimerRef.current) {
        clearInterval(scheduleTimerRef.current);
      }
    };
  }, [scheduleConfig.enabled, scheduleConfig.hour, scheduleConfig.minute, sendMenu]);

  return {
    customers: activeCustomers,
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
    getTodayHistory,
  };
}
