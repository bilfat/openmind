/* OPEN MIND — Web Push Service Worker */
self.addEventListener("push", (event) => {
  let data = { title: "OPEN MIND", message: "", link: "/admin/notifications", type: "" };

  try {
    const parsed = event.data ? event.data.json() : {};
    data = {
      title: parsed.title || data.title,
      message: parsed.message || "",
      link: parsed.link || data.link,
      type: parsed.type || "",
    };
  } catch (err) {
    data = {
      title: event.data ? event.data.text() : data.title,
      message: "",
      link: "/admin/notifications",
      type: "",
    };
  }

  const options = {
    body: data.message,
    icon: "/icon.jpg",
    badge: "/icon.jpg",
    data: { url: data.link || "/admin/notifications" },
    vibrate: [120, 60, 120],
    tag: data.type || "openmind-push",
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});