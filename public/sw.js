const CACHE_NAME = "fiadopro-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "FiadoPro",
      body: event.data.text(),
      icon: "/favicon.svg",
      badge: "/favicon.svg",
    };
  }

  const options = {
    body: data.body,
    icon: data.icon || "/favicon.svg",
    badge: data.badge || "/favicon.svg",
    vibrate: [200, 100, 200],
    tag: data.tag || "fiadopro-notification",
    renotify: true,
    data: data.url || "/",
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "FiadoPro", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
