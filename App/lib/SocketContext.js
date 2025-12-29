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
import { AppState } from "react-native";
const SocketContext = createContext(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
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

  // ✅ ADD THIS: Get the actual socket instance
  const getSocket = () => {
    return socketRef.current;
  };

  // const handleMessageNotification = async (notificationData) => {
  //   try {
  //     const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

  //     console.log("Processing messageNotification:", notificationData);

  //     const roomId = notificationData.room;
  //     const sender = notificationData.sender;

  //     if (!sender) {
  //       logger.warn("No sender data in notification");
  //       return;
  //     }

  //     if (sender.id === loggedInUserId) {
  //       logger.info("Skipping notification for own message");
  //       return;
  //     }

  //     const senderName = "You received a message";
  //     const messageContent = sender.name + " sent you a message";

  //     logger.info("Sending message notification", { senderName, roomId });

  //     await sendMessageNotification(
  //       senderName,
  //       messageContent,
  //       `msg-${Date.now()}`,
  //       roomId
  //     );

  //     logger.success("Message notification sent successfully");
  //   } catch (error) {
  //     logger.error("Failed to process message notification", error);
  //   }
  // };

  const extractLastMessage = (chat) => {
    if (!chat || !chat.lastMessage) return null;

    const lm = chat.lastMessage;

    if (typeof lm === "string") return lm;
    if (typeof lm === "object") return lm.message || null;

    return null;
  };

  const fetchLastMessageForRoom = async (roomId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return null;

      const response = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/messages/chat-users",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return null;

      const result = await response.json();
      const chats = result?.data || [];

      const chat = chats.find(
        (c) =>
          c.room === roomId || c.chat_room_id === roomId || c.roomId === roomId
      );

      const message = extractLastMessage(chat);

      console.log("FOUND LAST MESSAGE:", message);

      return message;
    } catch (err) {
      console.error("Failed to fetch last message", err);
      return null;
    }
  };

  // const handleMessageNotification = async (notificationData) => {
  //   try {
  //     console.log("Notification received:", notificationData);

  //     const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");
  //     console.log("Logged in user id:", loggedInUserId);

  //     const { room, sender } = notificationData;

  //     if (!sender) return;
  //     if (sender.id === loggedInUserId) return;

  //     // Skip if app is visible
  //     // if (
  //     //   typeof document !== "undefined" &&
  //     //   document.visibilityState === "visible"
  //     // ) {
  //     //   console.log("App is visible — skipping notification");
  //     //   return;
  //     // }

  //     // ✅ FALLBACK MESSAGE (important)
  //     const senderName = sender.name || "Someone";
  //     const message = "Sent you a new message";
  //     const messageId = `msg-${Date.now()}`;

  //     await sendMessageNotification(senderName, message, messageId, room);

  //     console.log("Notification sent from messageNotification");
  //   } catch (error) {
  //     console.error("Failed to process message notification", error);
  //   }
  // };

  const handleMessageNotification = async (notificationData) => {
    try {
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");
      const { room, sender } = notificationData;

      if (!sender) return;
      if (sender.id === loggedInUserId) return;

      const senderName = sender.name || "Someone";

      const lastMessage =
        (await fetchLastMessageForRoom(room)) || "Sent you a new message";

      await sendMessageNotification(
        senderName,
        lastMessage,
        `msg-${Date.now()}`,
        room
      );
    } catch (error) {
      console.error("Failed to process message notification", error);
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

  if (typeof window !== "undefined") {
    window.testNotification = () => {
      console.log("Simulating test notification...");
      handleMessageNotification({
        room: "test_room_123",
        sender: {
          id: "test_user_123",
          name: "Test User",
          profilePic: "",
        },
        timestamp: new Date().toISOString(),
        type: "message",
        message: "Hello from test!",
        messageId: `msg-${Date.now()}`,
      });
    };
  }

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

        const socket = initializeSocket(
          "https://backend-afrodate-8q6k.onrender.com/messaging",
          token
        );

        socketRef.current = socket;

        socket.on("connect", () => {
          if (!isMounted) return;
          setIsConnected(true);
          logger.success("Socket connected", { id: socket.id });

          // ✅ Join user room after connection
          socket.emit("joinUserRoom", { userId });
          logger.info("Joined user room", { userId });
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

        // ✅ ADD THESE EVENT HANDLERS FOR MESSAGE CONFIRMATION
        socket.on("messageSent", (data) => {
          logger.success("Message sent confirmation", data);
        });

        socket.on("messageDelivered", (data) => {
          logger.success("Message delivered", data);
        });

        // Debug all events
        socket.onAny((eventName, ...args) => {
          console.log(`📡 Socket event: ${eventName}`, args);
        });

        socket.io.on("reconnect", () => {
          logger.success("Reconnected to server");
          // Rejoin rooms after reconnection
          socket.emit("joinUserRoom", { userId });
        });

        // Test function for debugging
        // if (typeof window !== "undefined") {
        //   window.testNotification = () => {
        //     handleMessageNotification({
        //       room: "test_room_123",
        //       sender: {
        //         id: "test_user_123",
        //         name: "Test User",
        //         profilePic: "",
        //       },
        //       timestamp: new Date().toISOString(),
        //       type: "message",
        //     });
        //   };

        //   // ✅ ADD: Test socket function
        //   window.testSocket = () => {
        //     if (socket.connected) {
        //       socket.emit("test", { message: "Test from client" });
        //     }
        //   };
        // }
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
    if (!socketRef.current) return () => {};
    const handleMessage = (data) => {
      logger.event("chat_message received", data);
      handler(data);
    };
    socketRef.current.on("chat_message", handleMessage);
    return () => socketRef.current.off("chat_message", handleMessage);
  };

  // ✅ ADD: Function to emit messages
  const emit = (event, data, callback) => {
    if (!socketRef.current || !socketRef.current.connected) {
      logger.error(`Cannot emit ${event} - socket not connected`);
      return false;
    }

    logger.event(`Emitting ${event}`, data);
    socketRef.current.emit(event, data, callback);
    return true;
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current, // ✅ ADD: Direct socket access
        socketRef,
        isConnected,
        onMessageReceived,
        emit, // ✅ ADD: Helper function for emitting
        getSocket, // ✅ ADD: Function to get socket instance
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
