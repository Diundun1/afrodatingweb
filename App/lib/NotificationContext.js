// import React, { createContext, useContext, useState, useEffect } from "react";
// import { Platform } from "react-native";

// const NotificationContext = createContext();

// export const useNotification = () => {
//   const context = useContext(NotificationContext);
//   if (!context) {
//     throw new Error(
//       "useNotification must be used within a NotificationProvider"
//     );
//   }
//   return context;
// };

// export const NotificationProvider = ({ children }) => {
//   const [notifications, setNotifications] = useState([]);
//   const [permission, setPermission] = useState("default");

//   // Request notification permission
//   const requestPermission = async () => {
//     if (Platform.OS === "web" && "Notification" in window) {
//       try {
//         const permission = await Notification.requestPermission();
//         setPermission(permission);
//         return permission;
//       } catch (error) {
//         console.error("Error requesting notification permission:", error);
//         return "denied";
//       }
//     }
//     return "denied";
//   };

//   // Check current permission status
//   useEffect(() => {
//     if (Platform.OS === "web" && "Notification" in window) {
//       setPermission(Notification.permission);
//     }
//   }, []);

//   // Show local notification
//   const showNotification = (title, options = {}) => {
//     if (Platform.OS === "web" && permission === "granted") {
//       const notification = new Notification(title, {
//         icon: "/icon.png",
//         badge: "/icon.png",
//         ...options,
//       });

//       notification.onclick = () => {
//         window.focus();
//         notification.close();
//       };

//       return notification;
//     }

//     // For React Native, you can use push notifications here
//     console.log("Notification:", title, options);
//   };

//   // Add notification to list
//   const addNotification = (notification) => {
//     setNotifications((prev) => [notification, ...prev.slice(0, 49)]); // Keep last 50
//   };

//   // Clear all notifications
//   const clearNotifications = () => {
//     setNotifications([]);
//   };

//   // Mark notification as read
//   const markAsRead = (id) => {
//     setNotifications((prev) =>
//       prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
//     );
//   };

//   const value = {
//     notifications,
//     permission,
//     requestPermission,
//     showNotification,
//     addNotification,
//     clearNotifications,
//     markAsRead,
//   };

//   return (
//     <NotificationContext.Provider value={value}>
//       {children}
//     </NotificationContext.Provider>
//   );
// };

import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

const NotificationContext = createContext(null);

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState("default");

  const token =
    Platform.OS === "web" ? localStorage.getItem("accessToken") : null;

  /* -------------------- PERMISSION (WEB ONLY) -------------------- */
  useEffect(() => {
    if (Platform.OS === "web" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (Platform.OS !== "web") return "denied";
    const perm = await Notification.requestPermission();
    setPermission(perm);
    return perm;
  };

  /* -------------------- FETCH NOTIFICATIONS -------------------- */
  const fetchNotifications = async () => {
    if (!token) return;

    const res = await fetch(
      "https:backend-afrodate-8q6k.onrender.com/api/v1/notifications",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await res.json();
    setNotifications(data.notifications || []);
  };

  const fetchUnreadCount = async () => {
    if (!token) return;

    const res = await fetch(
      "https:backend-afrodate-8q6k.onrender.com/api/v1/notifications/unread-count",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const data = await res.json();
    setUnreadCount(data.count || 0);
  };

  /* -------------------- MARK READ -------------------- */
  const markAsRead = async (id) => {
    await fetch(
      "https:backend-afrodate-8q6k.onrender.com/api/v1/notifications/mark-read",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationIds: [id] }),
      },
    );

    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );

    fetchUnreadCount();
  };

  /* -------------------- LOCAL DISPLAY (WEB) -------------------- */
  const showLocalNotification = (title, options) => {
    if (Platform.OS !== "web") return;
    if (permission !== "granted") return;

    new Notification(title, {
      icon: "/icon.png",
      badge: "/icon.png",
      ...options,
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        requestPermission,
        showLocalNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
