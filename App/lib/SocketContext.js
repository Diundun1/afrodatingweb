import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import initializeSocket from "./socket";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendMessageNotification,
  sendCallNotification,
} from "../lib/RegisterForPushNotificationsAsync";
import { AppState } from "react-native";
import { useCall } from "./CallContext";
import { useNavigation } from "@react-navigation/native";
const SocketContext = createContext(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

export function SocketProvider({ children }) {
  const { setInCall, setParticipant } = useCall();
  const navigationRef = useRef();
  const navigation = useNavigation();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const initializedRef = useRef(false);
  const listenerCleanupRef = useRef([]);

  const logger = {
    info: (msg, data) => console.log(`ℹ ${msg}`, data || ""),
    warn: (msg, data) => console.warn(`⚠ ${msg}`, data || ""),
    error: (msg, data) => console.error(`❌ ${msg}`, data || ""),
    success: (msg, data) => console.log(`✅ ${msg}`, data || ""),
    event: (name, data) => console.log(`📡 EVENT: ${name}`, data || ""),
  };

  // ✅ FIXED: Memoized to prevent recreating on every render
  const getSocket = useCallback(() => {
    return socketRef.current;
  }, []);

  const handleMessageNotification = useCallback(
    async (notificationData) => {
      try {
        const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");
        const { room, sender, message: socketMessage } = notificationData;

        if (!sender || !room) return;
        if (sender.id === loggedInUserId) return;

        const senderName = sender.name || "Someone";
        let finalMessage = socketMessage?.trim();
        let messageTimestamp = null;

        // 🔄 1. API FALLBACK (If socket message is missing)
        if (!finalMessage) {
          const token = await AsyncStorage.getItem("userToken");
          if (token) {
            try {
              const response = await fetch(
                "https://backend-afrodate-8q6k.onrender.com/api/v1/messages/chat-users",
                {
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                const result = await response.json();
                console.log("final message result::: ", result); // Log you requested

                const chats = result?.data || [];
                const chat = chats.find((c) =>
                  [c.room, c.chat_room_id, c.roomId].includes(room)
                );

                const lm = chat?.lastMessage;
                finalMessage = typeof lm === "string" ? lm : lm?.message;
                messageTimestamp = lm?.createdAt || lm?.sent_at;
              }
            } catch (e) {
              console.warn("Fallback fetch failed", e);
            }
          }
        }

        // 🛟 2. GUARANTEE CONTENT
        if (!finalMessage) finalMessage = "Sent you a message";

        // 🎯 3. CALL NOTIFICATION LOGIC
        const callLinkPattern = /https:\/\/test\.unigate\.com\.ng\/[^\s]+/;
        const linkMatch = finalMessage.match(callLinkPattern);

        if (linkMatch) {
          const callUrl = linkMatch[0];

          // Time check: Only show call screen if sent within last 2 mins
          const messageTime = messageTimestamp
            ? new Date(messageTimestamp)
            : new Date();
          const timeDiffInMins = (new Date() - messageTime) / 1000 / 60;

          if (timeDiffInMins <= 2) {
            // Log the call detection
            console.log(
              "📞 Call Link Detected! Navigating to IncomingCallScreen..."
            );

            // Store call data for persistence
            await Promise.all([
              AsyncStorage.setItem("callUrl", callUrl),
              AsyncStorage.setItem("partnerId", sender.id),
              AsyncStorage.setItem("partnerName", senderName),
            ]);

            // Navigate to the Call UI
            navigation.navigate("IncomingCallScreen", {
              callerName: senderName,
              partnerId: sender.id,
              callUrl,
              room: room,
              callType: "video",
              isCaller: false,
            });

            // Optional: Also fire a high-priority push notification for the call
            await sendMessageNotification(
              "Incoming Call",
              `Incoming call from ${senderName}`,
              `call-${Date.now()}`,
              room
            );
            return; // Stop here so we don't send a double notification
          }
        }

        // ✉️ 4. REGULAR MESSAGE NOTIFICATION
        await sendMessageNotification(
          senderName,
          finalMessage,
          `msg-${Date.now()}`,
          room
        );
      } catch (error) {
        console.error("Failed to process message notification", error);
      }
    },
    [navigation]
  );

  const handleChatMessage = useCallback(async (messageData) => {
    console.log("messageData: ", messageData);
    try {
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      // Extract sender ID
      let senderId = null;
      if (typeof messageData.sender_id === "object" && messageData.sender_id) {
        senderId = messageData.sender_id._id || messageData.sender_id.id;
      } else if (messageData.sender_id) {
        senderId = messageData.sender_id;
      } else if (messageData.sender?.id) {
        senderId = messageData.sender.id;
      }

      // Skip own messages
      if (senderId === loggedInUserId) {
        logger.info("Skipping own message");
        return;
      }

      // Skip call links
      const isCallLink = /https:\/\/test\.unigate\.com\.ng\/[^\s]+/.test();
      if (isCallLink) {
        logger.info("Skipping call link message");
        console.log("call link");
      }

      // Extract sender name
      let senderName = "Someone";
      if (
        typeof messageData.sender_id === "object" &&
        messageData.sender_id?.name
      ) {
        senderName = messageData.sender_id.name;
      } else if (messageData.sender?.name) {
        senderName = messageData.sender.name;
      } else if (messageData.sender_name) {
        senderName = messageData.sender_name;
      }

      // Extract room and message IDs
      const roomId =
        messageData.room_id || messageData.chat_room_id || messageData.room;
      const messageId =
        messageData._id || messageData.id || `msg-${Date.now()}`;

      if (!roomId) {
        logger.warn("No room ID in message data");
        return;
      }

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
  }, []);

  // ✅ Socket initialization effect
  // useEffect(() => {
  //   if (initializedRef.current) return;
  //   initializedRef.current = true;

  //   let isMounted = true;

  //   const connectSocket = async () => {
  //     try {
  //       const token = await AsyncStorage.getItem("userToken");
  //       const userId = await AsyncStorage.getItem("loggedInUserId");

  //       if (!token || !userId) {
  //         logger.error("Missing token or userId — cannot connect socket.");
  //         return;
  //       }

  //       const socket = initializeSocket(
  //         "https://backend-afrodate-8q6k.onrender.com/messaging",
  //         token
  //       );

  //       socketRef.current = socket;

  //       // ✅ Connection handlers
  //       socket.on("connect", () => {
  //         if (!isMounted) return;
  //         setIsConnected(true);
  //         logger.success("Socket connected", { id: socket.id });

  //         // Join user room
  //         socket.emit("joinUserRoom", { userId });
  //         logger.info("Joined user room", { userId });
  //       });

  //       socket.on("disconnect", (reason) => {
  //         if (!isMounted) return;
  //         setIsConnected(false);
  //         logger.warn("Socket disconnected", { reason });
  //       });

  //       socket.on("connect_error", (err) => {
  //         logger.error("Connection error", err.message);
  //       });

  //       // ✅ CONSOLIDATED: Single message notification handler
  //       socket.on("messageNotification", handleMessageNotification);

  //       useEffect(() => {
  //         if (!socketRef.current) return;

  //         const onCallInvitation = (data) => {
  //           console.log("📞 Incoming call (SocketContext):", data);

  //           // 1️⃣ Update call state
  //           setInCall(true);
  //           setParticipant(data.callerName);

  //           // 2️⃣ Navigate globally
  //           navigation.navigate("IncomingCallScreen", {
  //             callerName: data.callerName || "Unknown Caller",
  //             partnerId: data.callerId,
  //             callUrl: data.callUrl,
  //             room: data.room,
  //             callType: data.callType || "video",
  //             isCaller: false,
  //           });

  //           // 3️⃣ Trigger system notification (PWA)
  //           sendCallNotification(data.callerName, data.callUrl, data.callerId);
  //         };

  //         socketRef.current.on("callInvitation", onCallInvitation);

  //         return () => {
  //           socketRef.current.off("callInvitation", onCallInvitation);
  //         };
  //       }, []);

  //       // ✅ Chat message handlers (keep if backend sends different events)
  //       socket.on("chat_message", handleChatMessage);
  //       socket.on("new_message", handleChatMessage);
  //       // 🔔 Incoming call event
  //       // socket.on("incoming_call", handleIncomingCall);

  //       // socket.on("callInvitation", (data) => {
  //       //   sendCallNotification({
  //       //     callerName: data.callerName,
  //       //     callerId: data.callerId,
  //       //     callUrl: data.callUrl,
  //       //     room: data.room,
  //       //     callType: data.callType, // "video" or "voice"
  //       //   });
  //       // });

  //       // Message status confirmations
  //       socket.on("messageSent", (data) => {
  //         logger.success("Message sent confirmation", data);
  //       });

  //       socket.on("messageDelivered", (data) => {
  //         logger.success("Message delivered", data);
  //       });

  //       // Debug all events in development
  //       if (__DEV__) {
  //         socket.onAny((eventName, ...args) => {
  //           console.log(`📡 Socket event: ${eventName}`, args);
  //         });
  //       }

  //       // Handle reconnection
  //       socket.io.on("reconnect", () => {
  //         logger.success("Reconnected to server");
  //         socket.emit("joinUserRoom", { userId });
  //       });

  //       // ✅ Debug helper (development only)
  //       if (__DEV__ && typeof window !== "undefined") {
  //         window.testNotification = () => {
  //           logger.info("Simulating test notification...");
  //           handleMessageNotification({
  //             room: "test_room_123",
  //             sender: {
  //               id: "test_user_456", // Different from logged in user
  //               name: "Test User",
  //             },
  //             message: "Hello from test!",
  //             timestamp: new Date().toISOString(),
  //           });
  //         };
  //       }
  //     } catch (err) {
  //       logger.error("Socket init failed", err);
  //     }
  //   };

  //   connectSocket();

  //   // ✅ Cleanup
  //   return () => {
  //     isMounted = false;
  //     if (socketRef.current) {
  //       socketRef.current.removeAllListeners();
  //       socketRef.current.disconnect();
  //       socketRef.current = null;
  //     }
  //     // Clean up any registered listeners
  //     listenerCleanupRef.current.forEach((cleanup) => cleanup());
  //     listenerCleanupRef.current = [];
  //   };
  // }, [handleMessageNotification, handleChatMessage]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const userId = await AsyncStorage.getItem("loggedInUserId");

        if (!token || !userId) return;

        const socket = initializeSocket(
          "https://backend-afrodate-8q6k.onrender.com/messaging",
          token
        );

        socketRef.current = socket;

        socket.on("connect", () => {
          if (!isMounted) return;
          setIsConnected(true);
          socket.emit("joinUserRoom", { userId });
        });

        socket.on("disconnect", () => {
          if (!isMounted) return;
          setIsConnected(false);
        });

        // 📩 MESSAGE NOTIFICATION
        socket.on("messageNotification", handleMessageNotification);

        // 🧪 DEV DEBUG
        if (__DEV__) {
          socket.onAny((event, ...args) => {
            console.log(`📡 ${event}`, args);
          });
        }
      } catch (err) {
        console.error("Socket init failed", err);
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
  }, [handleMessageNotification]);

  // ✅ FIXED: Proper cleanup handling
  const onMessageReceived = useCallback((handler) => {
    if (!socketRef.current) {
      logger.warn("Cannot register message listener - socket not initialized");
      return () => {};
    }

    const handleMessage = (data) => {
      logger.event("chat_message received", data);
      handler(data);
    };

    socketRef.current.on("chat_message", handleMessage);

    const cleanup = () => {
      if (socketRef.current) {
        socketRef.current.off("chat_message", handleMessage);
      }
    };

    listenerCleanupRef.current.push(cleanup);

    return cleanup;
  }, []);

  // ✅ Helper function to emit events
  const emit = useCallback((event, data, callback) => {
    if (!socketRef.current || !socketRef.current.connected) {
      logger.error(`Cannot emit ${event} - socket not connected`);
      return false;
    }

    logger.event(`Emitting ${event}`, data);

    if (callback) {
      socketRef.current.emit(event, data, callback);
    } else {
      socketRef.current.emit(event, data);
    }

    return true;
  }, []);

  // ✅ FIXED: Include isConnected in deps so consumers re-render on connection changes
  const contextValue = {
    socket: socketRef.current,
    socketRef,
    isConnected,
    onMessageReceived,
    emit,
    getSocket,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}
