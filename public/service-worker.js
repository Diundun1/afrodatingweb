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
        console.log("📨 [PUSH] ===== RAW PUSH PAYLOAD =====");
        console.log("📨 [PUSH] Full payload:", JSON.stringify(data, null, 2));
        console.log("📨 [PUSH] title:", data.title);
        console.log("📨 [PUSH] body:", data.body);
        console.log("📨 [PUSH] url:", data.url);
        console.log(
          "📨 [PUSH] data object:",
          JSON.stringify(data.data, null, 2),
        );
        console.log("📨 [PUSH] =====================================");
      } catch (e) {
        console.error("📨 [PUSH] Failed to parse JSON:", e);
        data = { title: "Diundun", body: event.data?.text() || "" };
      }

      let finalMessage = data.body || "You have a new notification";
      let messageTimestamp =
        data.data?.timestamp || data.data?.sent_at || Date.now();

      console.log("📨 [PUSH] Initial message:", finalMessage);
      console.log("📨 [PUSH] Initial timestamp:", messageTimestamp);

      // 1. Fetch API Fallback
      const token = await getAuthTokenFromDB();
      if (token) {
        console.log("🌐 [API] Making fetch request to chat-users endpoint");
        try {
          const response = await fetch(
            "https://backend-afrodate-8q6k.onrender.com/api/v1/messages/chat-users",
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          console.log("🌐 [API] Response status:", response.status);

          if (response.ok) {
            const result = await response.json();
            console.log(
              "🌐 [API] Response data received, chats count:",
              result?.data?.length,
            );

            const room = data.data?.room || data.data?.roomId;
            console.log("🔍 [API] Looking for room:", room);

            const chat = result?.data?.find((c) =>
              [c.room, c.chat_room_id, c.roomId].includes(room),
            );

            if (chat) {
              console.log(
                "✅ [API] Chat found:",
                JSON.stringify(chat, null, 2),
              );

              if (chat?.lastMessage) {
                const lm = chat.lastMessage;
                finalMessage =
                  typeof lm === "string" ? lm : lm.message || lm.text;
                messageTimestamp =
                  lm.createdAt || lm.sent_at || messageTimestamp;

                console.log("📝 [API] Updated message from API:", finalMessage);
                console.log(
                  "⏰ [API] Updated timestamp from API:",
                  messageTimestamp,
                );
              } else {
                console.warn("⚠️ [API] Chat found but no lastMessage");
              }
            } else {
              console.warn("⚠️ [API] No matching chat found for room:", room);
            }
          }
        } catch (e) {
          console.error("❌ [API] Fallback fetch failed:", e);
        }
      } else {
        console.log("⏭️ [API] Skipping API fetch - no token available");
      }

      // 2. Call Detection
      const callLinkPattern = /https:\/\/test\.unigate\.com\.ng\/[^\s]+/;
      const linkMatch = finalMessage.match(callLinkPattern);

      console.log("🔗 [CALL] Checking message for call link");
      console.log("🔗 [CALL] Message:", finalMessage);
      console.log("🔗 [CALL] Link match:", linkMatch);

      const timestamp =
        typeof messageTimestamp === "number"
          ? messageTimestamp
          : new Date(messageTimestamp).getTime();

      console.log("⏰ [CALL] Timestamp type:", typeof messageTimestamp);
      console.log("⏰ [CALL] Parsed timestamp:", timestamp);
      console.log("⏰ [CALL] Current time:", Date.now());

      const ageInMinutes = (Date.now() - timestamp) / 1000 / 60;
      console.log("⏰ [CALL] Message age (minutes):", ageInMinutes.toFixed(2));

      const isCall = linkMatch && ageInMinutes <= 2;
      console.log("📞 [CALL] Is this a call?", isCall ? "✅ YES" : "❌ NO");

      if (linkMatch && !isCall) {
        console.warn("⚠️ [CALL] Link found but message too old (>2 min)");
      }

      // 3. Get sender name - THE FIX IS HERE!
      // Since data.sender is spread into payload.data, it's at data.data.sender
      const senderName =
        data.data?.sender?.name ||
        data.data?.senderName ||
        data.title || // Fallback to title since that's where sender name goes
        "User";

      console.log("👤 [SENDER] ===== SENDER NAME RESOLUTION =====");
      console.log(
        "👤 [SENDER] data.data?.sender:",
        JSON.stringify(data.data?.sender),
      );
      console.log(
        "👤 [SENDER] data.data?.sender?.name:",
        data.data?.sender?.name,
      );
      console.log("👤 [SENDER] data.data?.senderName:", data.data?.senderName);
      console.log("👤 [SENDER] data.title:", data.title);
      console.log("👤 [SENDER] Final sender name:", senderName);
      console.log("👤 [SENDER] ========================================");

      // 4. Build Config
      const callUrl = linkMatch ? linkMatch[0] : null;
      const type = isCall ? "incoming_call" : data.data?.type || "default";

      console.log("🔗 [CALL] Extracted call URL:", callUrl);
      console.log("📋 [CONFIG] Notification type:", type);

      const options = {
        body: isCall ? `Incoming call from ${senderName}` : finalMessage,
        icon: data.icon || "/icon-192x192.png",
        badge: data.badge || "/badge-72x72.png",
        vibrate: isCall
          ? [500, 200, 500, 200, 500, 200, 500, 200, 500]
          : [200, 100, 200],
        requireInteraction: isCall ? true : false,
        data: {
          ...data.data,
          url: isCall ? `/incoming-call` : data.url || "/",
          callUrl: callUrl,
          isCall: isCall,
          originalMessage: finalMessage,
          timestamp: timestamp,
          senderName: senderName, // Store resolved sender name
        },
        tag: isCall
          ? `call-${data.data?.room}`
          : `msg-${data.data?.room || "default"}`,
      };

      console.log("🔔 [NOTIFICATION] ===== NOTIFICATION CONFIG =====");
      console.log(
        "🔔 [NOTIFICATION] Title:",
        isCall ? "Incoming Call" : data.title || "Diundun",
      );
      console.log("🔔 [NOTIFICATION] Body:", options.body);
      console.log("🔔 [NOTIFICATION] Tag:", options.tag);
      console.log(
        "🔔 [NOTIFICATION] RequireInteraction:",
        options.requireInteraction,
      );
      console.log("🔔 [NOTIFICATION] Sender name used:", senderName);
      console.log(
        "🔔 [NOTIFICATION] Full data:",
        JSON.stringify(options.data, null, 2),
      );
      console.log("🔔 [NOTIFICATION] ===============================");

      const notification = await self.registration.showNotification(
        isCall ? "Incoming Call" : data.title || "Diundun",
        options,
      );

      console.log("✅ [NOTIFICATION] Notification displayed successfully");
      return notification;
    })(),
  );
});

// call to chat screen

self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked:", event.notification.data);
  event.notification.close();

  const data = event.notification.data || {};

  // Resolve the Room ID (Fallback to sender ID if room is missing)
  const room = data.room || data.roomId || data.sender?.id || data.sender;

  // Decide target URL based on whether it is a call
  let targetUrl = `/chat/${room}`;
  if (data.isCall || data.type === "incoming_call") {
    // Navigate to the incoming call screen instead matching React Navigation config
    targetUrl = `/incoming-call?callUrl=${encodeURIComponent(data.callUrl)}&callerId=${data.callerId || ""}&callerName=${encodeURIComponent(data.senderName || "")}&room=${room}`;
  }

  // 1. Mark notification as opened
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
        // 2. Try to find an existing window and focus it
        for (const client of clientList) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            await client.focus();

            // 3. Tell the app to open the right screen internally
            if (data.isCall || data.type === "incoming_call") {
              return client.postMessage({
                type: "INCOMING_CALL",
                payload: {
                  callUrl: data.callUrl,
                  callerId: data.callerId,
                  callerName: data.senderName,
                  room: room,
                  callType: data.callType || "video",
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

        // 4. If app is closed, open the app directly to the resolved URL
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
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
