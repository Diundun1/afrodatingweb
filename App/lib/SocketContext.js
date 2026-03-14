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

let _navRef = null;
export function setNavigationRef(ref) {
  _navRef = ref;
}
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

        // 🎯 3. SKIP CALL LINKS (handled by incomingCall socket event)
        const callLinkPattern = /https:\/\/test\.unigate\.com\.ng\/[^\s]+/;
        if (callLinkPattern.test(finalMessage)) {
          logger.info("Skipping call link in messageNotification (handled by incomingCall event)");
          return;
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
    []
  );

  const handleChatMessage = useCallback(
    async (messageData) => {
      console.log("messageData: ", messageData);
      try {
        const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

        // Extract sender ID
        let senderId = null;
        if (
          typeof messageData.sender_id === "object" &&
          messageData.sender_id
        ) {
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
        // Extract message content
        let messageContent =
          messageData.message || messageData.text || messageData.content;

        if (!messageContent) {
          logger.warn("No message content in message data", messageData);
          return;
        }

        const isCallLink = /https:\/\/test\.unigate\.com\.ng\/[^\s]+/.test(
          messageContent
        );
        if (isCallLink) {
          logger.info("Skipping call link message");
          console.log("call link");
          return;
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
    },
    []
  );

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
          socket.on("onAny", (event, ...args) => {
            console.log(`📡 ${event}`, args);
          });
        }

        socket.on("ringing", (data) => {
          logger.event("ringing", data);
          // Handled by subscribers (like VideoCallScreen)
        });

        socket.on("incomingCall", (data) => {
          logger.event("incomingCall", data);
          if (!data?.from) {
            logger.warn("incomingCall missing 'from'", data);
            return;
          }
          if (_navRef?.isReady?.()) {
            _navRef.navigate("IncomingCallScreen", {
              callerName: typeof data.from.name === "string" ? data.from.name : String(data.from.name || "Someone"),
              callerId: data.from.id,
              callUrl: data.callUrl,
              room: data.room,
              callType: data.callType || "video",
              isCaller: false,
            });
          }
        });

        socket.on("callAccepted", (data) => {
          logger.event("callAccepted", data);
          // Handled within VideoCallScreen or IncomingCallScreen
        });

        socket.on("callDeclined", (data) => {
          logger.event("callDeclined", data);
          // Navigate back if we were waiting for them to pick up
        });

        socket.on("callEnded", (data) => {
          logger.event("callEnded", data);
          // End the call UI
        });
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

  // ✅ SAFE REMOVE LISTENER
  const safeOff = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  // ✅ FIXED: Include isConnected in deps so consumers re-render on connection changes
  const contextValue = {
    socket: socketRef.current,
    socketRef,
    isConnected,
    onMessageReceived,
    emit,
    safeOff,
    getSocket,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}
