import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import initializeSocket from "./socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { sendMessageNotification } from "../components/RegisterForPushNotificationsAsync";

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const navigation = useNavigation();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const initializedRef = useRef(false);

  const logger = {
    info: (msg, data) => console.log(`ℹ ${msg}`, data || ""),
    warn: (msg, data) => console.warn(`⚠ ${msg}`, data || ""),
    error: (msg, data) => console.error(`❌ ${msg}`, data || ""),
    success: (msg, data) => console.log(`✅ ${msg}`, data || ""),
    event: (name, data) => console.log(`📡 EVENT: ${name}`, data || ""),
  };

  const handleMessageNotification = async (notificationData) => {
    try {
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      console.log("Processing messageNotification:", notificationData);

      const roomId = notificationData.room;
      const sender = notificationData.sender;

      if (!sender) {
        logger.warn("No sender data in notification");
        return;
      }

      if (sender.id === loggedInUserId) {
        logger.info("Skipping notification for own message");
        return;
      }

      const senderName = sender.name || "Someone";
      const messageContent = "sent you a message";

      logger.info("Sending message notification", { senderName, roomId });

      await sendMessageNotification(
        senderName,
        messageContent,
        `msg-${Date.now()}`,
        roomId
      );

      logger.success("Message notification sent successfully");
    } catch (error) {
      logger.error("Failed to process message notification", error);
    }
  };

  const handleChatMessage = async (messageData) => {
    try {
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      let senderId = null;
      if (messageData.sender_id && typeof messageData.sender_id === "object") {
        senderId = messageData.sender_id._id || messageData.sender_id.id;
      } else if (messageData.sender_id) {
        senderId = messageData.sender_id;
      } else if (messageData.sender && messageData.sender.id) {
        senderId = messageData.sender.id;
      }

      if (senderId === loggedInUserId) {
        return;
      }

      const messageContent =
        messageData.message || messageData.content || "New message";
      const isCallLink = messageContent.match(
        /https:\/\/test\.unigate\.com\.ng\/[^\s]+/
      );
      if (isCallLink) {
        return;
      }

      let senderName = "Someone";
      if (messageData.sender_id && typeof messageData.sender_id === "object") {
        senderName = messageData.sender_id.name || senderName;
      } else if (messageData.sender) {
        senderName = messageData.sender.name || senderName;
      } else if (messageData.sender_name) {
        senderName = messageData.sender_name;
      }

      const roomId =
        messageData.room_id || messageData.chat_room_id || messageData.room;
      const messageId =
        messageData._id || messageData.id || `msg-${Date.now()}`;

      logger.info("Sending chat message notification", {
        senderName,
        messageContent,
        roomId,
      });

      await sendMessageNotification(
        senderName,
        messageContent,
        messageId,
        roomId
      );
    } catch (error) {
      logger.error("Failed to process chat message", error);
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const userId = await AsyncStorage.getItem("loggedInUserId");

        if (!token || !userId) {
          logger.error("Missing token or userId — xcannot connect socket.");
          //  navigation.replace("(tabs)");
          return;
        }

        const socket = initializeSocket(
          "https://closematch-backend-seix.onrender.com/messaging",
          token
        );

        socketRef.current = socket;

        socket.on("connect", () => {
          if (!isMounted) return;
          setIsConnected(true);
          logger.success("Socket connected", { id: socket.id });
        });

        socket.on("disconnect", (reason) => {
          if (!isMounted) return;
          setIsConnected(false);
          logger.warn("Socket disconnected", { reason });
        });

        socket.on("connect_error", (err) => {
          logger.error("Connection error", err.message);
        });

        socket.on("messageNotification", (notificationData) => {
          console.log("messageNotification event received:", notificationData);
          handleMessageNotification(notificationData);
        });

        socket.on("chat_message", (messageData) => {
          console.log("chat_message event received:", messageData);
          handleChatMessage(messageData);
        });

        socket.on("new_message", (messageData) => {
          console.log("new_message event received:", messageData);
          handleChatMessage(messageData);
        });

        socket.onAny((eventName, ...args) => {
          console.log(`Socket event: ${eventName}`, args);
        });

        socket.io.on("reconnect", () => {
          logger.success("Reconnected to server");
          socket.emit("joinUserRoom", { userId });
        });

        socket.on("connect", () => {
          socket.emit("joinUserRoom", { userId });
          logger.info("Joined user room", { userId });
        });

        if (typeof window !== "undefined") {
          window.testNotification = () => {
            handleMessageNotification({
              room: "test_room_123",
              sender: {
                id: "test_user_123",
                name: "Test User",
                profilePic: "",
              },
              timestamp: new Date().toISOString(),
              type: "message",
            });
          };
        }
      } catch (err) {
        logger.error("Socket init failed", err);
      }
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const onMessageReceived = (handler) => {
    if (!socketRef.current) return;
    const handleMessage = (data) => {
      logger.message("in", data);
      handler(data);
    };
    socketRef.current.on("chat_message", handleMessage);
    return () => socketRef.current.off("chat_message", handleMessage);
  };

  return (
    <SocketContext.Provider
      value={{ socketRef, isConnected, onMessageReceived }}>
      {children}
    </SocketContext.Provider>
  );
}
