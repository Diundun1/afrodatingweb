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
  return new Promise((resolve) => {
    const request = indexedDB.open("keyval-store");
    request.onsuccess = () => {
      try {
        const db = request.result;
        const tx = db.transaction("keyval", "readonly");
        const store = tx.objectStore("keyval");
        const getReq = store.get("userToken");
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
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
        console.log("📨 [PUSH] Full payload:", JSON.stringify(data, null, 2));
      } catch (e) {
        console.error("📨 [PUSH] Failed to parse JSON:", e);
        data = { title: "Diundun", body: event.data?.text() || "" };
      }

      let finalMessage = data.body || "You have a new notification";
      let messageTimestamp =
        data.data?.timestamp || data.data?.sent_at || Date.now();

      // 1. Fetch API Fallback (existing logic)
      const token = await getAuthTokenFromDB();
      if (token) {
        try {
          const response = await fetch(
            "https://backend-afrodate-8q6k.onrender.com/api/v1/messages/chat-users",
            {
              headers: { Authorization: `Bearer ${token}` },
            },
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
                typeof lm === "string" ? lm : lm.message || lm.text;
              messageTimestamp = lm.createdAt || lm.sent_at || messageTimestamp;
            }
          }
        } catch (e) {
          console.error("❌ [API] Fallback fetch failed:", e);
        }
      }

      // 2. Call Detection with Type Differentiation
      const callLinkPattern = /https:\/\/test\.unigate\.com\.ng\/[^\s]+/;
      const linkMatch = finalMessage.match(callLinkPattern);

      const timestamp =
        typeof messageTimestamp === "number"
          ? messageTimestamp
          : new Date(messageTimestamp).getTime();

      const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;
      const isCall = linkMatch && ageInMinutes <= 2;

      // Detect call type from URL or explicit data
      let callType = data.data?.callType || "video";
      if (linkMatch && linkMatch[0].includes("/w/vvc.php")) {
        callType = "voice";
      } else if (linkMatch && linkMatch[0].includes("/w/vc.php")) {
        callType = "video";
      }

      const senderName =
        data.data?.sender?.name || data.data?.senderName || data.title || "User";

      const callUrl = linkMatch ? linkMatch[0] : null;

      const options = {
        body: isCall
          ? `Incoming ${callType} call from ${senderName}`
          : finalMessage,
        icon: data.icon || "/icon-192x192.png",
        badge: data.badge || "/badge-72x72.png",
        vibrate: isCall
          ? [500, 200, 500, 200, 500, 200, 500, 200, 500]
          : [200, 100, 200],
        requireInteraction: isCall ? true : false,
        actions: isCall
          ? [
              {
                action: "answer",
                title: "Answer Call",
                icon: "/icon-192x192.png",
              },
              {
                action: "decline",
                title: "Decline Call",
                icon: "/icon-192x192.png",
              },
            ]
          : [],
        data: {
          ...data.data,
          url: isCall ? `/incoming-call` : data.url || "/",
          callUrl: callUrl,
          isCall: isCall,
          callType: callType,
          originalMessage: finalMessage,
          timestamp: timestamp,
          senderName: senderName,
        },
        tag: isCall
          ? `call-${data.data?.room}`
          : `msg-${data.data?.room || "default"}`,
      };

      const notification = await self.registration.showNotification(
        isCall
          ? `Incoming ${callType === "voice" ? "Voice" : "Video"} Call`
          : data.title || "Diundun",
        options,
      );

      return notification;
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked:", event.notification.data);
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Resolve the Room ID (Fallback to sender ID if room is missing)
  const room = data.room || data.roomId || data.sender?.id || data.sender;
  const isCall = data.isCall;
  const callType = data.callType || "video";

  // 1. Mark notification as opened/dismissed
  const status = action === "decline" ? "dismissed" : "open";
  if (data.notificationId) {
    fetch(`/api/v1/push/notifications/${data.notificationId}/${status}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    }).catch((err) => console.error(`Failed to mark as ${status}:`, err));
  }

  // Handle Decline specific action
  if (action === "decline") {
    return;
  }

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        // 2. Try to find an existing window and focus it
        for (const client of clientList) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            await client.focus();

            // 3. Tell the app to navigate appropriately
            if (isCall) {
              return client.postMessage({
                type: "NAVIGATE_TO_CALL",
                payload: {
                  callerName: data.senderName || "Someone",
                  callUrl: data.callUrl,
                  callerId: data.sender?.id || data.sender,
                  room: room,
                  callType: callType,
                  autoAccept: action === "answer",
                },
              });
            } else {
              return client.postMessage({
                type: "OPEN_CHAT",
                payload: {
                  roomId: room,
                  senderId: data.sender?.id || data.sender,
                },
              });
            }
          }
        }

        // 4. If app is closed, open the correct deep link
        if (clients.openWindow) {
          if (isCall) {
            const callParams = new URLSearchParams({
              callerName: data.senderName || "Someone",
              callUrl: data.callUrl,
              callerId: data.sender?.id || data.sender,
              room: room,
              callType: callType,
              autoAccept: action === "answer" ? "true" : "false",
            }).toString();
            return clients.openWindow(`/incoming-call?${callParams}`);
          } else {
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
    // Store token for authenticated requests
    // You can use IndexedDB here if needed
    self.authToken = event.data.token;
    console.log("Auth token updated in service worker");
  }

  // Handle notification preferences update
  if (event.data && event.data.type === "UPDATE_NOTIFICATION_PREFS") {
    self.notificationPrefs = event.data.preferences;
    console.log("Notification preferences updated:", self.notificationPrefs);
  }
});
