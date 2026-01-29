const isPushNotificationSupported = () => {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// FIXED: Use service worker for notifications
const showNotificationViaServiceWorker = async (title, options = {}) => {
  try {
    if (!isPushNotificationSupported()) {
      console.log("Service worker not supported for notifications");
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });

    console.log("Notification sent via service worker:", title);
    return true;
  } catch (error) {
    console.error("Failed to show notification via service worker:", error);
    return false;
  }
};

// const RegisterForPushNotificationsAsync = async () => {
//   try {
//     if (!isPushNotificationSupported()) {
//       console.log("Push notifications are not supported in this browser");
//       return null;
//     }

//     if (
//       window.location.protocol !== "https:" &&
//       window.location.hostname !== "localhost"
//     ) {
//       console.log("Push notifications require HTTPS (except on localhost)");
//       return null;
//     }

//     const registration = await navigator.serviceWorker.register(
//       "/service-worker.js",
//       {
//         scope: "/",
//       },
//     );
//     console.log("Service Worker registered successfully");

//     let permission = await Notification.requestPermission();

//     if (permission !== "granted") {
//       console.log("Push notification permissions not granted.");
//       return null;
//     }
//     // BD_U_CgT4_b7dizczCDCi8Kzh2ZOPcuSc_KYEm4XcaHksTy2IwioMit5v6ylcUdvKsL5RXqAQYf_CNaUYQ5HyWQ;
//     const VAPID_PUBLIC_KEY =
//       "BOqyxnaIO_gNGX9I1XC0hrKDJg8oIfsEAcFlylps0cgb_DBzbwWR9LKwtvU7r3Kmpf3IQVk55BQQNcoMF1JrEPQ";

//     const subscription = await registration.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
//     });

//     if (!subscription) {
//       console.log("Failed to get push subscription.");
//       return null;
//     }

//     console.log("Push Subscription:", subscription);

//     if (typeof localStorage !== "undefined") {
//       await localStorage.setItem(
//         "webPushSubscription",
//         JSON.stringify(subscription),
//       );

//       const userId = localStorage.getItem("loggedInUserId");
//       if (userId) {
//         await sendSubscriptionToBackend(subscription, userId);
//       }
//     }

//     return subscription;
//   } catch (error) {
//     console.error("Error getting push notification subscription:", error);
//     return null;
//   }
// };

// const sendSubscriptionToBackend = async (subscription, userId) => {
//   try {
//     const response = await fetch(
//       "https://backend-afrodate-8q6k.onrender.com/api/push/subscribe",
//       // "https://backend-afrodate-8q6k.onrender.com/api/v1/push/subscribe",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           user_id: userId,
//           subscription: subscription,
//           device: "web",
//           platform: navigator.platform,
//           userAgent: navigator.userAgent,
//         }),
//       },
//     );

//     const result = await response.text();
//     console.log("sendSubBackend response:", result);
//   } catch (err) {
//     console.error("Error sending subscription to backend:", err);
//   }
// };

// Register service worker first

const RegisterForPushNotificationsAsync = async () => {
  try {
    // 1. Basic Support Check
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return null;
    }

    // 2. HTTPS/Localhost Check
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      console.warn("Push notifications require HTTPS");
      return null;
    }

    // 3. Register and WAIT for activation
    const registration =
      await navigator.serviceWorker.register("/service-worker.js");
    await navigator.serviceWorker.ready; // Ensures the worker is live

    // 4. Request Permission
    let permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const VAPID_PUBLIC_KEY =
      "BOqyxnaIO_gNGX9I1XC0hrKDJg8oIfsEAcFlylps0cgb_DBzbwWR9LKwtvU7r3Kmpf3IQVk55BQQNcoMF1JrEPQ";

    // 5. Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // 6. Convert to JSON before sending to your Service
    const subJSON = subscription.toJSON();

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("webPushSubscription", JSON.stringify(subJSON));
      const userId = localStorage.getItem("loggedInUserId");

      if (userId) {
        // This connects to your PushNotificationService.subscribe backend method
        await sendSubscriptionToBackend(subJSON, userId);
      }
    }

    return subJSON;
  } catch (error) {
    console.error("Subscription Error:", error);
    return null;
  }
};

const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration =
      await navigator.serviceWorker.register("/service-worker.js");
    console.log("Service worker registered:", registration);
    return registration;
  } catch (err) {
    console.error("❌ Service worker registration failed:", err);
    return null;
  }
};

const sendSubscriptionToBackend = async (subscription) => {
  if (!subscription) return;
  console.log("there is subscription");
  try {
    const registration = await navigator.serviceWorker.ready; // Wait for ready
    if (!registration) throw new Error("Service worker not ready");

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      console.log("🔁 Already subscribed");
    }

    const token = localStorage.getItem("userToken");
    console.log("JWT token:", token);

    const response = await fetch(
      "https://backend-afrodate-8q6k.onrender.com/api/v1/push/subscribe",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription }),
      },
    );

    const result = await response.json();
    console.log("✅ Backend response:", result);
  } catch (err) {
    console.error("❌ Error sending subscription to backend:", err);
  }
};

// Main init function
export const initPush = async (userId) => {
  const registration = await registerServiceWorker();
  if (!registration) return;

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("❌ Push notifications permission denied");
    return;
  }

  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      "BOqyxnaIO_gNGX9I1XC0hrKDJg8oIfsEAcFlylps0cgb_DBzbwWR9LKwtvU7r3Kmpf3IQVk55BQQNcoMF1JrEPQ",
    ),
  });

  console.log("🔔 Subscription object:", subscription);
  await sendSubscriptionToBackend(subscription, userId);
};

const checkPushSubscriptionStatus = async () => {
  if (!isPushNotificationSupported()) {
    return { supported: false };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return {
    supported: true,
    subscribed: !!subscription,
    permission: Notification.permission,
    subscription: subscription,
  };
};

// const unsubscribeFromPushNotifications = async () => {
//   if (!isPushNotificationSupported()) {
//     return false;
//   }

//   try {
//     const registration = await navigator.serviceWorker.ready;
//     const subscription = await registration.pushManager.getSubscription();

//     if (subscription) {
//       await subscription.unsubscribe();
//       if (typeof localStorage !== "undefined") {
//         await localStorage.removeItem("webPushSubscription");
//       }
//       console.log("Successfully unsubscribed from push notifications");
//       return true;
//     }
//     return false;
//   } catch (error) {
//     console.error("Error unsubscribing from push notifications:", error);
//     return false;
//   }
// };

// FIXED: Use service worker instead of direct Notification constructor

async function unsubscribeFromPushNotifications() {
  console.log("unsubscribeFromPushNotifications triggerd");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return;
  const token = localStorage.getItem("userToken");

  // 1️⃣ Unsubscribe from browser
  await subscription.unsubscribe();

  console.log("unsubscribeFromPushNotifications triggerd");

  // 2️⃣ Tell backend
  await fetch("/api/v1/push/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
    }),
  });
}

const sendMessageNotification = async (
  senderName,
  message,
  messageId,
  roomId,
) => {
  try {
    if (!isPushNotificationSupported()) {
      console.log("Notifications not supported in this environment");
      return;
    }

    const isCallLink = message?.match(
      /https:\/\/test\.unigate\.com\.ng\/[^\s]+/,
    );
    if (isCallLink) {
      return;
    }

    if (Notification.permission !== "granted") {
      console.log("Notification permission not granted");
      return;
    }

    const truncatedMessage =
      message.length > 100 ? message.substring(0, 100) + "..." : message;

    // FIXED: Use service worker instead of new Notification()
    await showNotificationViaServiceWorker(`💬 ${senderName}`, {
      body: truncatedMessage,
      tag: `message_${messageId}`,
      data: {
        type: "new_message",
        senderName,
        messageId,
        roomId,
        fullMessage: message,
      },
    });

    console.log("Message notification sent from:", senderName);
  } catch (error) {
    console.error("Failed to send message notification:", error);
  }
};

// FIXED: Use service worker for local notifications
const sendLocalNotification = async (title, body, data = {}) => {
  try {
    if (
      !isPushNotificationSupported() ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    await showNotificationViaServiceWorker(title, {
      body: body,
      tag: data.type || "general",
      data: data,
    });

    console.log("Local notification sent:", title);
  } catch (error) {
    console.error("Failed to send local notification:", error);
  }
};

// FIXED: Use service worker for call notifications
// const sendCallNotification = async (callerName, callUrl, callerId) => {
//   try {
//     if (
//       !isPushNotificationSupported() ||
//       Notification.permission !== "granted"
//     ) {
//       return;
//     }

//     await showNotificationViaServiceWorker(
//       `📞 Incoming Call from ${callerName}`,
//       {
//         body: "Tap to answer the video call",
//         tag: "incoming_call",
//         requireInteraction: true,
//         data: {
//           callUrl,
//           callerId,
//           type: "incoming_call",
//         },
//       }
//     );

//     console.log("Call notification sent for:", callerName);
//   } catch (error) {
//     console.error("Failed to send call notification:", error);
//   }
// };
const sendCallNotification = async ({
  callerName,
  callUrl,
  callerId,
  room,
  callType = "video", // "video" | "voice"
}) => {
  try {
    if (!isPushNotificationSupported()) {
      console.warn("Push notifications not supported");
      return;
    }

    if (Notification.permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    await showNotificationViaServiceWorker(`📞 Incoming ${callType} call`, {
      body: `${callerName || "Someone"} is calling you`,
      tag: `incoming_call_${room}`, // ✅ UNIQUE PER CALL
      requireInteraction: true, // ✅ keeps ringing
      renotify: true,
      data: {
        type: "incoming_call",

        // ✅ REQUIRED FOR NAVIGATION
        callUrl,
        callerId,
        callerName,
        room,
        callType,
      },
    });

    console.log("📞 Call notification sent:", {
      callerName,
      callerId,
      room,
      callType,
    });
  } catch (error) {
    console.error("❌ Failed to send call notification:", error);
  }
};

const testNotification = async () => {
  console.log("Testing notification system...");
  console.log("Notification support:", typeof Notification !== "undefined");
  console.log(
    "Service Worker support:",
    typeof navigator !== "undefined" && "serviceWorker" in navigator,
  );
  console.log(
    "Notification permission:",
    typeof Notification !== "undefined" ? Notification.permission : "N/A",
  );

  await sendMessageNotification(
    "Test User",
    "This is a test notification",
    "test-" + Date.now(),
    "test_room",
  );
};

export default RegisterForPushNotificationsAsync;
export {
  checkPushSubscriptionStatus,
  unsubscribeFromPushNotifications,
  isPushNotificationSupported,
  sendMessageNotification,
  sendLocalNotification,
  sendCallNotification,
  testNotification,
  showNotificationViaServiceWorker,
};
