// service-worker.js
const CACHE_NAME = "afrodating-cache-v2";
const urlsToCache = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  console.log("Service Worker installing");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Cache opened, adding resources...");
        return Promise.allSettled(
          urlsToCache.map((url) =>
            cache.add(url).catch((error) => {
              console.log(`Failed to cache ${url}:`, error);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log("Install completed, skipping waiting");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker installation failed:", error);
      })
  );
});

self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and external URLs
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if found
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Enhanced offline fallback
          if (event.request.destination === "document") {
            return caches.match("/");
          }
          // Return a more helpful offline response
          return new Response(
            JSON.stringify({
              error: "You're offline",
              message: "Please check your internet connection",
            }),
            {
              status: 408,
              headers: { "Content-Type": "application/json" },
            }
          );
        });
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating");
  event.waitUntil(
    Promise.all([
      // Claim clients immediately
      self.clients.claim(),

      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
    ]).then(() => {
      console.log("Service Worker activated successfully");
    })
  );
});

self.addEventListener("push", function (event) {
  console.log("Push notification received", event);

  let data = {};

  try {
    data = event.data?.json() || {};
  } catch (e) {
    data = {
      title: "Afro Dating",
      body: event.data?.text() || "You have a new notification",
    };
  }

  const options = {
    body: data.body || "You have a new notification",
    icon: "https://test.unigate.com.ng/testfiles/icon.png",
    badge: "https://test.unigate.com.ng/testfiles/icon.png",
    tag: "closematch-notification",
    data: data,
  };

  event.waitUntil(
    self.registration
      .showNotification(data.title || "Afro Dating", options)
      .then(() => {
        console.log("Notification shown successfully");
      })
      .catch((error) => {
        console.error("Failed to show notification:", error);
      })
  );
});

self.addEventListener("notificationclick", function (event) {
  console.log("Notification clicked", event.notification.data);
  event.notification.close();

  const data = event.notification.data;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Try to focus existing window first
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            if (data.type === "new_message") {
              client.postMessage({
                type: "OPEN_CHAT",
                roomId: data.roomId,
                messageId: data.messageId,
              });
            } else if (data.type === "incoming_call") {
              client.postMessage({
                type: "INCOMING_CALL",
                callUrl: data.callUrl,
                callerId: data.callerId,
              });
            }

            return client.focus();
          }
        }

        // If no existing window, open new one
        if (clients.openWindow) {
          let url = "/";

          if (data.type === "new_message") {
            url = `/?roomId=${data.roomId}&openChat=true`;
          } else if (data.type === "incoming_call") {
            url = `/?callUrl=${encodeURIComponent(data.callUrl)}&callerId=${
              data.callerId
            }`;
          }

          return clients.openWindow(url);
        }
      })
  );
});

self.addEventListener("notificationclose", function (event) {
  console.log("Notification closed", event.notification.data);
});

self.addEventListener("message", (event) => {
  console.log("Message received in service worker:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
