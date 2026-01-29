// NotificationManager.jsx
import { useEffect } from "react";
import {
  RegisterForPushNotificationsAsync,
  checkPushSubscriptionStatus,
} from "../lib/RegisterForPushNotificationsAsync";

export default function NotificationManager({ user, token }) {
  useEffect(() => {
    if (!user || !token) return;

    // Check current subscription status
    checkPushSubscriptionStatus().then((status) => {
      console.log("Push subscription status:", status);

      // Auto-subscribe if supported but not subscribed
      if (
        status.supported &&
        !status.subscribed &&
        status.permission !== "denied"
      ) {
        // Optionally show a prompt before subscribing
        // Or just subscribe automatically
        RegisterForPushNotificationsAsync();
      }
    });

    // Send auth token to service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: "SET_AUTH_TOKEN",
          token: token,
        });
      });
    }
  }, [user, token]);

  return null; // This is a logic-only component
}
