// // service-worker.js
// const CACHE_NAME = "Diundun-cache-v2";
// const urlsToCache = ["/", "/index.html"];

// self.addEventListener("install", (event) => {
//   console.log("Service Worker installing");
//   event.waitUntil(
//     caches
//       .open(CACHE_NAME)
//       .then((cache) => {
//         console.log("Cache opened, adding resources...");
//         return Promise.allSettled(
//           urlsToCache.map((url) =>
//             cache.add(url).catch((error) => {
//               console.log(`Failed to cache ${url}:`, error);
//               return null;
//             })
//           )
//         );
//       })
//       .then(() => {
//         console.log("Install completed, skipping waiting");
//         return self.skipWaiting();
//       })
//       .catch((error) => {
//         console.error("Service Worker installation failed:", error);
//       })
//   );
// });

// self.addEventListener("fetch", (event) => {
//   // Skip non-GET requests and external URLs
//   if (
//     event.request.method !== "GET" ||
//     !event.request.url.startsWith(self.location.origin)
//   ) {
//     return;
//   }

//   event.respondWith(
//     caches.match(event.request).then((response) => {
//       // Return cached version if found
//       if (response) {
//         return response;
//       }

//       return fetch(event.request)
//         .then((response) => {
//           // Only cache successful responses
//           if (!response || response.status !== 200) {
//             return response;
//           }

//           // Clone and cache the response
//           const responseToCache = response.clone();
//           caches.open(CACHE_NAME).then((cache) => {
//             cache.put(event.request, responseToCache);
//           });

//           return response;
//         })
//         .catch(() => {
//           // Enhanced offline fallback
//           if (event.request.destination === "document") {
//             return caches.match("/");
//           }
//           // Return a more helpful offline response
//           return new Response(
//             JSON.stringify({
//               error: "You're offline",
//               message: "Please check your internet connection",
//             }),
//             {
//               status: 408,
//               headers: { "Content-Type": "application/json" },
//             }
//           );
//         });
//     })
//   );
// });

// self.addEventListener("activate", (event) => {
//   console.log("Service Worker activating");
//   event.waitUntil(
//     Promise.all([
//       // Claim clients immediately
//       self.clients.claim(),

//       // Clean up old caches
//       caches.keys().then((cacheNames) => {
//         return Promise.all(
//           cacheNames.map((cacheName) => {
//             if (cacheName !== CACHE_NAME) {
//               console.log("Deleting old cache:", cacheName);
//               return caches.delete(cacheName);
//             }
//           })
//         );
//       }),
//     ]).then(() => {
//       console.log("Service Worker activated successfully");
//     })
//   );
// });

// self.addEventListener("push", function (event) {
//   console.log("Push notification received", event);

//   let data = {};

//   try {
//     data = event.data?.json() || {};
//   } catch (e) {
//     data = {
//       title: "Diundun",
//       body: event.data?.text() || "You have a new notification from sw",
//     };
//   }

//   const options = {
//     body: data.body || "You have a new notification",
//     icon: "/favicon.ico",
//     badge: "/favicon.ico",
//     tag: "diundun-notification",
//     data: data,
//   };

//   event.waitUntil(
//     self.registration
//       .showNotification(data.title || "Diundun", options)
//       .then(() => {
//         console.log("Notification shown successfully");
//       })
//       .catch((error) => {
//         console.error("Failed to show notification:", error);
//       })
//   );
// });

// // self.addEventListener("notificationclick", function (event) {
// //   console.log("Notification clicked", event.notification.data);
// //   event.notification.close();

// //   const data = event.notification.data;

// //   event.waitUntil(
// //     clients
// //       .matchAll({
// //         type: "window",
// //         includeUncontrolled: true,
// //       })
// //       .then((clientList) => {
// //         // Try to focus existing window first
// //         for (const client of clientList) {
// //           if (client.url.includes(self.location.origin) && "focus" in client) {
// //             if (data.type === "new_message") {
// //               client.postMessage({
// //                 type: "OPEN_CHAT",
// //                 roomId: data.roomId,
// //                 messageId: data.messageId,
// //               });
// //             } else if (data.type === "incoming_call") {
// //               client.postMessage({
// //                 type: "INCOMING_CALL",
// //                 callUrl: data.callUrl,
// //                 callerId: data.callerId,
// //               });
// //             }

// //             return client.focus();
// //           }
// //         }

// //         // If no existing window, open new one
// //         if (clients.openWindow) {
// //           let url = "/";

// //           if (data.type === "new_message") {
// //             url = `/?roomId=${data.roomId}&openChat=true`;
// //           } else if (data.type === "incoming_call") {
// //             url = `/?callUrl=${encodeURIComponent(data.callUrl)}&callerId=${
// //               data.callerId
// //             }`;
// //           }

// //           return clients.openWindow(url);
// //         }
// //       })
// //   );
// // });

// self.addEventListener("notificationclick", function (event) {
//   console.log("🔔 Notification clicked:", event.notification.data);

//   event.notification.close();
//   const data = event.notification.data;

//   event.waitUntil(
//     self.clients
//       .matchAll({
//         type: "window",
//         includeUncontrolled: true,
//       })
//       .then(async (clientList) => {
//         // 1️⃣ Try existing window
//         for (const client of clientList) {
//           if (
//             client.url.startsWith(self.location.origin) &&
//             "focus" in client
//           ) {
//             await client.focus();

//             if (data.type === "new_message") {
//               client.postMessage({
//                 type: "OPEN_CHAT",
//                 payload: {
//                   roomId: data.roomId,
//                   messageId: data.messageId,
//                 },
//               });
//             }

//             if (data.type === "incoming_call") {
//               client.postMessage({
//                 type: "INCOMING_CALL",
//                 payload: {
//                   callUrl: data.callUrl,
//                   callerId: data.callerId,
//                   callerName: data.callerName,
//                   room: data.room,
//                   callType: data.callType,
//                 },
//               });
//             }

//             return;
//           }
//         }

//         // 2️⃣ No window → open new one
//         let url = "/";

//         if (data.type === "new_message") {
//           url = `/?openChat=true&roomId=${data.roomId}`;
//         }

//         if (data.type === "incoming_call") {
//           url =
//             `/?incomingCall=true` +
//             `&callUrl=${encodeURIComponent(data.callUrl)}` +
//             `&callerId=${data.callerId}` +
//             `&callerName=${encodeURIComponent(data.callerName)}` +
//             `&room=${data.room}` +
//             `&callType=${data.callType}`;
//         }

//         return self.clients.openWindow(url);
//       })
//   );
// });

// self.addEventListener("notificationclose", function (event) {
//   console.log("Notification closed", event.notification.data);
// });

// self.addEventListener("message", (event) => {
//   console.log("Message received in service worker:", event.data);

//   if (event.data && event.data.type === "SKIP_WAITING") {
//     self.skipWaiting();
//   }
// });

// service-worker.js

const CACHE_NAME = "Diundun-cache-v2";
const urlsToCache = ["/", "/index.html"];

async function getAuthTokenFromDB() {
  // 1. Try localStorage first (app stores token here)
  try {
    const lsToken = self.__localStorage_token;
    if (lsToken) return lsToken;
  } catch (_) { }

  // 2. Try IndexedDB (AsyncStorage web adapter stores here)
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("keyval-store");
      request.onsuccess = () => {
        try {
          const db = request.result;
          const tx = db.transaction("keyval", "readonly");
          const store = tx.objectStore("keyval");
          const getReq = store.get("userToken");
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

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
            }),
          ),
        );
      })
      .then(() => {
        console.log("Install completed, skipping waiting");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker installation failed:", error);
      }),
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
            },
          );
        });
    }),
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
          }),
        );
      }),
    ]).then(() => {
      console.log("Service Worker activated successfully");
    }),
  );
});

// ===== ENHANCED PUSH NOTIFICATION HANDLER =====
self.addEventListener("push", async (event) => {
  console.log("📨 [PUSH] Push event received");

  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data?.json() || {};
      } catch (e) {
        console.error("📨 [PUSH] Failed to parse JSON:", e);
        data = { title: "Diundun", body: event.data?.text() || "" };
      }

      const type = data.data?.type || "default";
      const isCall = type === "incoming_call" || type === "call";

      // For calls, use the payload directly — no API fetch needed
      const senderName =
        data.data?.sender?.name ||
        data.data?.senderName ||
        data.data?.callerName ||
        data.title ||
        "Someone";

      let finalMessage = data.body || "You have a new notification";

      // For non-call messages, try to get the latest message text from the API
      if (!isCall) {
        const token = await getAuthTokenFromDB();
        if (token) {
          try {
            const response = await fetch(
              "https://backend-afrodate-8q6k.onrender.com/api/v1/messages/chat-users",
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (response.ok) {
              const result = await response.json();
              const room = data.data?.room || data.data?.roomId;
              const chat = result?.data?.find((c) =>
                [c.room, c.chat_room_id, c.roomId].includes(room),
              );
              if (chat?.lastMessage) {
                const lm = chat.lastMessage;
                finalMessage =
                  typeof lm === "string" ? lm : lm.message || lm.text || finalMessage;
              }
            }
          } catch (e) {
            console.error("❌ [API] Fallback fetch failed:", e);
          }
        }
      }

      const options = {
        body: isCall ? `Incoming call from ${senderName}` : finalMessage,
        icon: data.icon || "/icon-192x192.png",
        badge: data.badge || "/badge-72x72.png",
        vibrate: isCall
          ? [500, 200, 500, 200, 500, 200, 500, 200, 500]
          : [200, 100, 200],
        requireInteraction: isCall,
        renotify: isCall,
        data: {
          ...data.data,
          url: isCall ? "/incoming-call" : data.url || "/",
          isCall,
          senderName,
          originalMessage: finalMessage,
        },
        tag: isCall
          ? `call-${data.data?.room || "call"}`
          : `msg-${data.data?.room || "default"}`,
      };

      await self.registration.showNotification(
        isCall ? `📞 Incoming Call` : data.title || "Diundun",
        options,
      );
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked:", event.notification.data);
  event.notification.close();

  const data = event.notification.data || {};
  const isCall = data.isCall || data.type === "incoming_call" || data.type === "call";

  // Mark notification as opened
  if (data.notificationId) {
    fetch(`/api/push/notifications/${data.notificationId}/open`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    }).catch((err) => console.error("Failed to mark as opened:", err));
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        if (isCall) {
          // For calls: focus or open the app and send INCOMING_CALL message
          const callPayload = {
            callUrl: data.callUrl,
            callerId: data.callerId || data.sender?.id,
            callerName: data.callerName || data.senderName,
            room: data.room,
            callType: data.callType || "video",
          };

          for (const client of clientList) {
            if (client.url.startsWith(self.location.origin) && "focus" in client) {
              await client.focus();
              client.postMessage({ type: "INCOMING_CALL", payload: callPayload });
              return;
            }
          }

          // No open window — open app at incoming-call route
          if (clients.openWindow) {
            const url =
              `/incoming-call` +
              `?callUrl=${encodeURIComponent(data.callUrl || "")}` +
              `&callerId=${data.callerId || ""}` +
              `&callerName=${encodeURIComponent(data.callerName || data.senderName || "")}` +
              `&room=${data.room || ""}` +
              `&callType=${data.callType || "video"}`;
            return clients.openWindow(url);
          }
        } else {
          // For messages: focus or open the chat
          const room = data.room || data.roomId || data.sender?.id;

          for (const client of clientList) {
            if (client.url.startsWith(self.location.origin) && "focus" in client) {
              await client.focus();
              client.postMessage({
                type: "OPEN_CHAT",
                payload: { roomId: room, senderId: data.sender?.id || data.sender },
              });
              return;
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(`/chat/${room}`);
          }
        }
      }),
  );
});

console.log("✅ [SERVICE WORKER] Push notification handlers registered");

self.addEventListener("notificationclose", function (event) {
  console.log("Notification closed", event.notification.data);

  // Optional: Track notification dismissals
  const data = event.notification.data;
  if (data.notificationId) {
    fetch(`/api/push/notifications/${data.notificationId}/dismissed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dismissedAt: new Date().toISOString(),
      }),
    }).catch((err) => console.error("Failed to track dismissal:", err));
  }
});

// ===== MESSAGE HANDLER (for communication with app) =====
self.addEventListener("message", (event) => {
  console.log("Message received in service worker:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Handle auth token updates
  if (event.data && event.data.type === "SET_AUTH_TOKEN") {
    self.__localStorage_token = event.data.token;
    console.log("Auth token updated in service worker");
  }

  // Handle notification preferences update
  if (event.data && event.data.type === "UPDATE_NOTIFICATION_PREFS") {
    self.notificationPrefs = event.data.preferences;
    console.log("Notification preferences updated:", self.notificationPrefs);
  }
});
