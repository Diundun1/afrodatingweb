import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import initializeSocket from "../socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const navigation = useNavigation();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const initializedRef = useRef(false);
  const navigationRef = useRef(null);
  const [pendingCall, setPendingCall] = useState(null);

  // Set up navigation ref
  useEffect(() => {
    navigationRef.current = navigation;
  }, [navigation]);

  const logger = {
    info: (msg, data) => console.log(`ℹ ${msg}`, data || ""),
    warn: (msg, data) => console.warn(`⚠ ${msg}`, data || ""),
    error: (msg, data) => console.error(`❌ ${msg}`, data || ""),
    success: (msg, data) => console.log(`✅ ${msg}`, data || ""),
    event: (name, data) => console.log(`📡 EVENT: ${name}`, data || ""),
  };

  // Handle pending calls
  useEffect(() => {
    if (pendingCall && navigationRef.current) {
      logger.info("Processing pending call", pendingCall);

      // Small delay to ensure navigation is ready
      setTimeout(() => {
        try {
          navigationRef.current.navigate("incomingCall", {
            screen: "incomingCallScreen",
            params: {
              callerName: pendingCall.callerName,
              partnerId: pendingCall.partnerId,
              callUrl: pendingCall.callUrl,
              room: pendingCall.roomId,
              callType: "video",
              isCaller: false,
            },
          });
          logger.success("Navigated to incoming call screen");
        } catch (error) {
          logger.error("Navigation failed", error);
        }
        setPendingCall(null);
      }, 100);
    }
  }, [pendingCall]);

  const handleIncomingCall = async (messageData) => {
    try {
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      logger.info("Checking incoming message for call", messageData);

      // Extract sender information
      let senderId = null;
      let senderName = "Unknown Caller";

      if (messageData.sender_id && typeof messageData.sender_id === "object") {
        senderId = messageData.sender_id._id || messageData.sender_id.id;
        senderName = messageData.sender_id.name || senderName;
      } else if (messageData.sender && messageData.sender.id) {
        senderId = messageData.sender.id;
        senderName = messageData.sender.name || senderName;
      } else if (messageData.sender_id) {
        senderId = messageData.sender_id;
      }

      // Don't process our own calls
      if (senderId === loggedInUserId) {
        logger.info("Ignoring own call message");
        return;
      }

      // Extract message content
      const messageContent = messageData.message || messageData.content || "";
      logger.info("Message content", messageContent);

      // Check for call URL
      const callUrlMatch = messageContent.match(
        /https:\/\/test\.unigate\.com\.ng\/[^\s]+/,
      );

      if (!callUrlMatch) {
        logger.info("No call URL found in message");
        return;
      }

      const callUrl = callUrlMatch[0];
      const roomId =
        messageData.room_id || messageData.chat_room_id || messageData.room;

      logger.info("CALL DETECTED - Setting up incoming call", {
        senderName,
        senderId,
        callUrl,
        roomId,
        loggedInUserId,
      });

      // Store call data
      await Promise.all([
        AsyncStorage.setItem("callUrl", callUrl),
        AsyncStorage.setItem("partnerId", senderId),
        AsyncStorage.setItem("partnerName", senderName),
        AsyncStorage.setItem("callRoomId", roomId),
      ]);

      // Set pending call to trigger navigation
      setPendingCall({
        callerName: senderName,
        partnerId: senderId,
        callUrl: callUrl,
        roomId: roomId,
      });
    } catch (error) {
      logger.error("Failed to handle incoming call", error);
    }
  };

  const handleMessageNotification = async (notificationData) => {
    try {
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      logger.info("Processing messageNotification:", notificationData);

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

      // Check if this is a call message

      const messageContent = "You received a message";
      logger.info("Checking notification for call URL", messageContent);

      const isCallLink = messageContent.match(
        /https:\/\/test\.unigate\.com\.ng\/[^\s]+/,
      );

      if (isCallLink) {
        logger.info("Call detected in messageNotification");
        await handleIncomingCall(notificationData);
        return;
      }

      // ... rest of your regular notification handling
    } catch (error) {
      logger.error("Failed to process message notification", error);
    }
  };

  const handleChatMessage = async (messageData) => {
    try {
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      logger.info("Processing chat_message:", messageData);

      let senderId = null;
      if (messageData.sender_id && typeof messageData.sender_id === "object") {
        senderId = messageData.sender_id._id || messageData.sender_id.id;
      } else if (messageData.sender_id) {
        senderId = messageData.sender_id;
      } else if (messageData.sender && messageData.sender.id) {
        senderId = messageData.sender.id;
      }

      if (senderId === loggedInUserId) {
        logger.info("Ignoring own message");
        return;
      }

      const messageContent =
        messageData.message || messageData.content || "New message";
      logger.info("Checking chat message for call URL", messageContent);

      // Check if this is a call message
      const isCallLink = messageContent.match(
        /https:\/\/test\.unigate\.com\.ng\/[^\s]+/,
      );
      if (isCallLink) {
        logger.info("Call detected in chat_message");
        await handleIncomingCall(messageData);
        return;
      }

      // ... rest of your regular message handling
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
          logger.error("Missing token or userId — cannot connect socket.");
          return;
        }

        logger.info("Initializing socket connection...");

        const socket = initializeSocket(
          "https:backend-afrodate-8q6k.onrender.com/messaging",
          token,
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

        // Message event handlers
        socket.on("messageNotification", (notificationData) => {
          logger.info("📩 messageNotification event received");
          handleMessageNotification(notificationData);
        });

        socket.on("chat_message", (messageData) => {
          logger.info("📩 chat_message event received");
          handleChatMessage(messageData);
        });

        socket.on("new_message", (messageData) => {
          logger.info("📩 new_message event received");
          handleChatMessage(messageData);
        });

        // Debug all events
        socket.onAny((eventName, ...args) => {
          logger.event(eventName, args);
        });

        socket.io.on("reconnect", () => {
          logger.success("Reconnected to server");
          socket.emit("joinUserRoom", { userId });
        });

        socket.on("connect", () => {
          socket.emit("joinUserRoom", { userId });
          logger.info("Joined user room", { userId });
        });
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

  const value = {
    socketRef,
    isConnected,
    onMessageReceived: (handler) => {
      if (!socketRef.current) return;
      const handleMessage = (data) => {
        logger.info("Custom message handler", data);
        handler(data);
      };
      socketRef.current.on("chat_message", handleMessage);
      return () => socketRef.current.off("chat_message", handleMessage);
    },
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
