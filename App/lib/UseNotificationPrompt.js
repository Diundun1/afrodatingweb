import { useEffect, useState } from "react";

export const useNotificationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!("PushManager" in window)) return;

    const permission = Notification.permission;

    if (permission === "default") {
      setShowPrompt(true);
    }
  }, []);

  return { showPrompt, setShowPrompt };
};
