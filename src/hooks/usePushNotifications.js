import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState("default");
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        setPermission("granted");
      }
    } catch {
      // no existing subscription
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;

    setLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      setSubscription(sub);

      const { endpoint } = sub;
      const key = sub.getKey("p256dh");
      const auth = sub.getKey("auth");

      const p256dh = key ? btoa(String.fromCharCode(...new Uint8Array(key))) : "";
      const authStr = auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "";

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from("push_subscriptions").upsert(
        { endpoint, p256dh, auth: authStr, user_id: user?.id || null },
        { onConflict: "endpoint" }
      );

      setLoading(false);
      return true;
    } catch (error) {
      console.error("Push subscription failed:", error);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      await subscription.unsubscribe();
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
      setSubscription(null);
      setLoading(false);
    } catch (error) {
      console.error("Push unsubscribe failed:", error);
      setLoading(false);
    }
  }, [subscription]);

  return {
    subscription,
    permission,
    isSupported,
    loading,
    subscribe,
    unsubscribe,
  };
}
