import React, { createContext, useContext, useState, useEffect } from "react";
import { Platform } from "react-native";

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState("default");

  // Request notification permission
  const requestPermission = async () => {
    if (Platform.OS === "web" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setPermission(permission);
        return permission;
      } catch (error) {
        console.error("Error requesting notification permission:", error);
        return "denied";
      }
    }
    return "denied";
  };

  // Check current permission status
  useEffect(() => {
    if (Platform.OS === "web" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Show local notification
  const showNotification = (title, options = {}) => {
    if (Platform.OS === "web" && permission === "granted") {
      const notification = new Notification(title, {
        icon: "/icon.png",
        badge: "/icon.png",
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    }

    // For React Native, you can use push notifications here
    console.log("Notification:", title, options);
  };

  // Add notification to list
  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep last 50
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const value = {
    notifications,
    permission,
    requestPermission,
    showNotification,
    addNotification,
    clearNotifications,
    markAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
