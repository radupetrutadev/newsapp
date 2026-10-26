// Pulse service worker: shows push notifications and opens them when tapped.
// Registered from Settings when a reader turns push on (src/lib/push/browser.ts).
// Pushes are { title, body, url, tag } from src/lib/push/send.ts.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : "" };
  }
  const url = typeof message.url === "string" && message.url.startsWith("/") ? message.url : "/notifications";

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(message.title || "Pulse", {
        body: message.body || "",
        tag: message.tag || undefined,
        // A newer version of a notification (another like) alerts again.
        renotify: Boolean(message.tag),
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        data: { url },
      });
      // Open tabs update their unread badge straight away.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) client.postMessage({ type: "pulse:push" });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) {
        try {
          await open.focus();
          await open.navigate(url);
          return;
        } catch {
          // Tabs opened before this worker started can't be navigated; open a new one.
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
