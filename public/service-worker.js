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
self.addEventListener("push", function (event) {
  console.log("🔔 Push notification received", event);

  let data = {};

  try {
    data = event.data?.json() || {};
  } catch (e) {
    data = {
      title: "Diundun",
      body: event.data?.text() || "You have a new notification",
    };
  }

  // Enhanced notification options based on type
  const getNotificationConfig = (notifData) => {
    const baseConfig = {
      body: notifData.body || "You have a new notification",
      icon: notifData.icon || "/icon-192x192.png",
      badge: notifData.badge || "/badge-72x72.png",
      image: notifData.image,
      vibrate: notifData.vibrate || [200, 100, 200],
      requireInteraction: notifData.requireInteraction || false,
      data: {
        url: notifData.url || "/",
        notificationId: notifData.data?.notificationId,
        type: notifData.data?.type,
        ...notifData.data,
      },
      actions: notifData.actions || [],
      timestamp: Date.now(),
    };

    // Customize based on notification type
    const type = notifData.data?.type;

    switch (type) {
      case "message":
      case "new_message":
        return {
          ...baseConfig,
          tag: `message-${notifData.data?.roomId || notifData.data?.messageId}`,
          requireInteraction: true,
          actions: [
            { action: "view", title: "👀 View" },
            { action: "reply", title: "💬 Reply" },
          ],
        };

      case "match":
        return {
          ...baseConfig,
          tag: `match-${notifData.data?.matchId}`,
          requireInteraction: true,
          actions: [
            { action: "view", title: "👀 View Profile" },
            { action: "message", title: "💬 Send Message" },
          ],
        };

      case "like":
        return {
          ...baseConfig,
          tag: "new-likes",
          actions: [{ action: "view", title: "👀 View Likes" }],
        };

      case "incoming_call":
        return {
          ...baseConfig,
          tag: `call-${notifData.data?.callerId}`,
          requireInteraction: true,
          vibrate: [500, 250, 500, 250, 500],
          actions: [
            { action: "answer", title: "📞 Answer" },
            { action: "decline", title: "❌ Decline" },
          ],
        };

      case "profileView":
        return {
          ...baseConfig,
          tag: "profile-views",
        };

      default:
        return {
          ...baseConfig,
          tag: "diundun-notification",
        };
    }
  };

  const options = getNotificationConfig(data);

  event.waitUntil(
    self.registration
      .showNotification(data.title || "Diundun", options)
      .then(() => {
        console.log("✅ Notification shown successfully");
      })
      .catch((error) => {
        console.error("❌ Failed to show notification:", error);
      }),
  );
});

// self.addEventListener("push", (e) => {
//   const data = e.data.json();

//   self.registration.showNotification(data.title, {
//     body: data.body,
//     icon: data.icon,
//     badge: data.badge,
//     data: { url: data.url }, // Pass the URL to the click event
//     actions: data.actions,
//     vibrate: data.vibrate,
//   });
// });

// self.addEventListener("notificationclick", (e) => {
//   e.notification.close();
//   // Open the specific chat room
//   e.waitUntil(clients.openWindow(e.notification.data.url));
// });
// ===== ENHANCED NOTIFICATION CLICK HANDLER =====
self.addEventListener("notificationclick", function (event) {
  console.log("🔔 Notification clicked:", event.notification.data);
  console.log("Action:", event.action);

  event.notification.close();

  const data = event.notification.data;
  const action = event.action;
  const type = data.type;

  // Mark notification as opened in backend
  if (data.notificationId) {
    fetch(`/api/push/notifications/${data.notificationId}/open`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((err) => console.error("Failed to mark as opened:", err));
  }

  // Handle action buttons
  if (action === "decline") {
    console.log("Call declined");
    return; // Don't open app
  }

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (clientList) => {
        // Determine the URL to open
        let url = data.url || "/";

        // Override URL based on type
        if (type === "message" || type === "new_message") {
          url = `/chat/${data.roomId || data.sender}`;
        } else if (type === "match") {
          url = `/matches/${data.matchId}`;
        } else if (type === "like") {
          url = "/likes";
        } else if (type === "profileView") {
          url = "/profile/views";
        } else if (type === "incoming_call") {
          url =
            `/?incomingCall=true` +
            `&callUrl=${encodeURIComponent(data.callUrl)}` +
            `&callerId=${data.callerId}` +
            `&callerName=${encodeURIComponent(data.callerName || "")}` +
            `&room=${data.room || ""}` +
            `&callType=${data.callType || ""}`;
        }

        // 1️⃣ Try to focus an existing window
        for (const client of clientList) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            await client.focus();

            // Send message to the client to navigate/perform action
            if (type === "new_message" || type === "message") {
              client.postMessage({
                type: "OPEN_CHAT",
                payload: {
                  roomId: data.roomId,
                  messageId: data.messageId,
                  senderId: data.sender || data.senderId,
                },
              });
            } else if (type === "incoming_call") {
              client.postMessage({
                type: "INCOMING_CALL",
                payload: {
                  callUrl: data.callUrl,
                  callerId: data.callerId,
                  callerName: data.callerName,
                  room: data.room,
                  callType: data.callType,
                },
              });
            } else if (type === "match") {
              client.postMessage({
                type: "NAVIGATE",
                payload: { url: `/matches/${data.matchId}` },
              });
            } else {
              client.postMessage({
                type: "NAVIGATE",
                payload: { url },
              });
            }

            return;
          }
        }

        // 2️⃣ No existing window found - open new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});

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
