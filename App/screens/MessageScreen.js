import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Alert,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use Text as fallback for Nunito components
const NunitoText = Text;
const NunitoTitle = Text;

// Safe status bar
const SafeMyStatusBar = () => (
  <View style={{ height: Platform.OS === "ios" ? 44 : 0 }} />
);

// CORRECT SOCKET CONTEXT IMPORT
let useSocket;
try {
  useSocket = require("../lib/SocketContext").useSocket;
} catch (e) {
  console.warn("SocketContext not found, using fallback");
  useSocket = () => ({
    socketRef: { current: null },
    isConnected: false,
    onMessageReceived: () => () => {},
  });
}

// CORRECT CALL CONTEXT IMPORT
let useCall;
try {
  useCall = require("../lib/CallContext").useCall;
} catch (e) {
  console.warn("CallContext not found, using fallback");
  useCall = () => ({
    setInCall: () => {},
    setParticipant: () => {},
  });
}

// CORRECT NOTIFICATION IMPORT
// let sendMessageNotification;
// try {
// sendMessageNotification =
//   require("../lib/RegisterForPushNotificationsAsync").sendMessageNotification;
// } catch (e) {
//   console.warn("Notifications not available");
//   sendMessageNotification = async () =>
//     console.log("Notifications not available");
// }

// Helper function to check if time is within 2 minutes
const isTimeWithinTwoMinutes = (messageTimeStr, currentTimeStr) => {
  try {
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(" ");
      const [hours, minutes] = time.split(":").map(Number);
      let hour = hours;
      if (period === "PM" && hours !== 12) hour += 12;
      if (period === "AM" && hours === 12) hour = 0;
      return hour * 60 + minutes;
    };

    const messageMinutes = parseTime(messageTimeStr);
    const currentMinutes = parseTime(currentTimeStr);

    let diff = Math.abs(currentMinutes - messageMinutes);
    if (diff > 720) diff = 1440 - diff; // Handle cross-midnight

    return diff <= 2; // Within 2 minutes
  } catch (error) {
    console.error("Time parsing error:", error);
    return false;
  }
};

const MessageScreen = ({ route }) => {
  const navigation = useNavigation();
  const { otherUserId, roomIdxccd } = route.params || {};

  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);
  const { setInCall, setParticipant } = useCall();

  // State
  const [partnerData, setPartnerData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const [secinputMessage, setsecInputMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [callUrl, setCallUrl] = useState("");
  const [isProcessingCall, setIsProcessingCall] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // const { socketRef, onMessageReceived, isConnected } = useSocket();
  const spinAnim = useRef(new Animated.Value(0)).current;

  const {
    socket,
    socketRef,
    isConnected,
    socketReady,
    onMessageReceived,
    emit,
  } = useSocket();

  // Refs
  const messagesRef = useRef([]);
  const optimisticMessagesRef = useRef(new Set());
  const flatListRef = useRef(null);
  const lastTypingRef = useRef(0);

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load current user ID
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const id = await AsyncStorage.getItem("loggedInUserId");
        setUserId(id);
      } catch (error) {
        console.error("Error loading user ID:", error);
      }
    };
    loadUserId();
  }, []);

  // Socket connection and event listeners
  // Socket connection and event listeners
  useEffect(() => {
    if (!isConnected || !socketRef?.current || !userId || !roomIdxccd) return;

    try {
      socketRef.current.emit("joinRoom", { room: roomIdxccd, userId });
      console.log("Joined room:", roomIdxccd);
    } catch (e) {
      console.warn("joinRoom failed:", e);
    }

    const onUserTyping = (data) => setTypingUser(data.userName || "Partner");
    const onUserStoppedTyping = () => setTypingUser(null);

    socketRef.current.on("userTyping", onUserTyping);
    socketRef.current.on("userStoppedTyping", onUserStoppedTyping);

    // Handle incoming call invitations
    const onCallInvitation = (data) => {
      console.log("📞 Received call invitation:", data);

      if (!connectionError) {
        navigation.navigate("IncomingCallScreen", {
          callerName: data.callerName || "Unknown Caller",
          partnerId: data.callerId,
          callUrl: data.callUrl,
          room: data.room,
          callType: data.callType || "video",
          isCaller: false,
        });
      }
    };

    socketRef.current.on("callInvitation", onCallInvitation);

    // 🆕 ADD THESE NEW LISTENERS HERE
    const onMessageDelivered = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, status: "delivered" } : msg
        )
      );
    };

    const onMessageRead = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, isSeen: true } : msg
        )
      );
    };

    socketRef.current.on("messageDelivered", onMessageDelivered);
    socketRef.current.on("messageRead", onMessageRead);
    // 🆕 END OF NEW LISTENERS

    const cleanupMsg = onMessageReceived((data) => {
      console.log("chat_message received:", data);

      const isDuplicate =
        Array.from(optimisticMessagesRef.current).some(
          (optId) =>
            data.clientTimestamp === optId || data.message === inputMessage
        ) ||
        messages.some((msg) => msg.serverId === data.id || msg.id === data.id);

      if (!isDuplicate) {
        const newMessage = {
          id: data.id || `server_${Date.now()}`,
          message: data.message,
          isSender: data.senderId === userId,
          isSeen: data.isSeen || false,
          messageTime: formatMessageTime(data.createdAt),
          fromServer: true,
          status: "delivered",
          messageTime: formatMessageTime(),
        };
        setMessages((prev) => [newMessage, ...prev]);
      }
    });

    socketRef.current.emit("getOnlineStatus", true);

    return () => {
      cleanupMsg && cleanupMsg();
      socketRef.current?.off("userTyping", onUserTyping);
      socketRef.current?.off("userStoppedTyping", onUserStoppedTyping);
      socketRef.current?.off("callInvitation", onCallInvitation);
      socketRef.current?.off("messageDelivered", onMessageDelivered); // 🆕 Cleanup
      socketRef.current?.off("messageRead", onMessageRead); // 🆕 Cleanup
      socketRef.current?.emit("leaveRoom", { room: roomIdxccd, userId });
    };
  }, [isConnected, userId, roomIdxccd]);

  // Typing handler
  const handleTyping = (text) => {
    setInputMessage(text);

    // if (!socketRef?.current || !partnerData || !userId) return;
    if (!socketRef?.current || !partnerData || !userId) {
      return;
    }

    const now = Date.now();
    if (now - lastTypingRef.current > 900) {
      socketRef.current.emit("typing", {
        room: roomIdxccd,
        recipient: partnerData._id,
        userId,
      });
      lastTypingRef.current = now;
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stopTyping", {
        room: roomIdxccd,
        recipient: partnerData._id,
        userId,
      });
    }, 2000);
  };

  // Spinner animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Constants
  const defaultImage = require("../assets/images/users/1.png");

  // Helper functions
  const formatMessageTime = (timestamp) => {
    return new Date(timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Main chat fetching effect with call detection
  useEffect(() => {
    if (!roomIdxccd) {
      setLoading(false);
      return;
    }

    let intervalId;
    let isMounted = true;
    let lastProcessedMessageId = null;

    const fetchChatRoom = async () => {
      if (!isMounted) return;

      try {
        const [token, loggedInUserId] = await Promise.all([
          AsyncStorage.getItem("userToken"),
          AsyncStorage.getItem("loggedInUserId"),
        ]);

        if (!token || !loggedInUserId) {
          setConnectionError(true);
          return;
        }

        const parts = roomIdxccd.split("_");
        if (parts.length !== 3) {
          setConnectionError(true);
          return;
        }

        const dynamicOtherUserId =
          parts[1] === loggedInUserId ? parts[2] : parts[1];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(
          `https://backend-afrodate-8q6k.onrender.com/api/v1/messages/chat-room/${dynamicOtherUserId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);

        if (!data.success) {
          setConnectionError(true);
          return;
        }

        setConnectionError(false);
        setPartnerData(data.data.chatPartner);

        const messages = data.data.fullHistory?.messages || [];
        const formattedMessages = messages.map((msg) => ({
          id: msg._id,
          message: msg.message,
          isSender: msg.sender_id._id === loggedInUserId,
          isSeen: msg.isRead || false,
          messageTime: formatMessageTime(msg.sent_at || msg.createdAt),
          fromServer: true,
        }));

        setMessages((prev) => {
          const optimisticMessages = prev.filter((msg) => !msg.fromServer);
          const mergedMessages = [...formattedMessages, ...optimisticMessages];
          const uniqueMessages = mergedMessages.filter(
            (msg, index, self) =>
              index ===
              self.findIndex(
                (m) =>
                  m.id === msg.id ||
                  (m.message === msg.message && m.isSender === m.isSender)
              )
          );
          return uniqueMessages;
        });

        setLoading(false);

        // 🆕 NOTIFICATION CHECK - Trigger notification for new messages
        const latestMessage = messages[0];
        if (!latestMessage) return;

        // Skip if we've already processed this message
        if (latestMessage._id === lastProcessedMessageId) return;
        lastProcessedMessageId = latestMessage._id;

        // 🆕 SEND NOTIFICATION FOR NEW MESSAGES
        // if (latestMessage.sender_id._id !== loggedInUserId) {
        //   const isCallLink = latestMessage.message?.match(
        //     /https:\/\/test\.unigate\.com\.ng\/[^\s]+/
        //   );

        //   if (!isCallLink) {
        //     await sendMessageNotification(
        //       data.data.chatPartner.name || "Someone",
        //       latestMessage.message,
        //       latestMessage._id,
        //       roomIdxccd
        //     );
        //     console.log("📱 Notification sent for new message");
        //   }
        // }

        // 🎯 CALL NOTIFICATION CHECK
        const linkMatch = latestMessage.message.match(
          /https:\/\/test\.unigate\.com\.ng\/[^\s]+/
        );

        if (linkMatch) {
          const messageTime = new Date(
            latestMessage.createdAt || latestMessage.sent_at
          );
          const currentTime = new Date();
          const timeDifference = (currentTime - messageTime) / 1000 / 60;

          if (timeDifference > 2) return;

          const callUrl = linkMatch[0];
          const roomId = roomIdxccd;
          const loggedInUser = loggedInUserId;

          // Extract participants from roomId
          const parts = roomId.split("_");
          const user1Id = parts[1];
          const user2Id = parts[2];

          let recipientId;
          if (user1Id === loggedInUser) {
            recipientId = user2Id;
          } else if (user2Id === loggedInUser) {
            recipientId = user1Id;
          } else {
            return;
          }

          if (!connectionError) {
            if (recipientId && latestMessage.sender_id._id !== loggedInUser) {
              navigation.navigate("IncomingCallScreen", {
                callerName: data.data.chatPartner.name || "Unknown Caller",
                partnerId: latestMessage.sender_id._id,
                callUrl,
                room: roomId,
                callType: "video",
                isCaller: true,
              });

              await Promise.all([
                AsyncStorage.setItem("callUrl", callUrl),
                AsyncStorage.setItem("partnerId", latestMessage.sender_id._id),
                AsyncStorage.setItem("partnerName", data.data.chatPartner.name),
              ]);
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching chat room:", error.message);
          setConnectionError(true);
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchChatRoom();

    // Poll every 3 seconds for real-time updates
    intervalId = setInterval(fetchChatRoom, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [roomIdxccd, navigation]);

  useEffect(() => {
    console.log("🔍 Socket state changed:", {
      isConnected,
      socketReady,
      hasSocket: !!socket,
      hasSocketRef: !!socketRef?.current,
    });
  }, [isConnected, socketReady, socket]);

  const sendMessage = () => {
    console.log("🔍 sendMessage() called");

    console.log("🔍 Debug info:", {
      isConnected,
      hasSocket: !!socket,
      hasSocketRef: !!socketRef?.current,
      hasEmit: typeof emit === "function",
      userId,
      roomIdxccd,
      partnerData: !!partnerData,
      inputMessage,
    });

    if (!inputMessage.trim() || !partnerData || !userId) {
      Alert.alert(
        "Error",
        "Cannot send message. Please check your connection."
      );
      return;
    }

    const createdAt = Date.now();
    const clientTimestamp = Date.now();
    const messageText = inputMessage.trim();
    const optimisticId = `optimistic_${clientTimestamp}`;

    console.log("🆕 Creating new message object:", {
      optimisticId,
      messageText,
      createdAt,
      clientTimestamp,
    });

    // Clear input immediately
    setInputMessage("");
    Keyboard.dismiss();

    const payload = {
      room: roomIdxccd,
      recipient: partnerData._id,
      message: messageText,
      clientTimestamp,
    };

    const newMessage = {
      id: optimisticId,
      message: messageText,
      createdAt,
      isSender: true,
      isSeen: false,
      fromServer: false,
      clientTimestamp,
      status: "sending",
      messageTime: formatMessageTime(),
    };

    console.log("📲 New optimistic message:", newMessage);

    // Add to optimistic messages and display immediately
    optimisticMessagesRef.current.add(clientTimestamp);

    setMessages((prev) => {
      const updated = [...prev, newMessage];
      console.log("📝 Messages after adding optimistic:", updated);
      return updated;
    });

    console.log(
      "❗ Immediately after setMessages (React not updated yet):",
      messages
    );

    // If not connected, mark as failed immediately
    if (!isConnected) {
      console.log("❌ No connection. Marking as failed in 500ms...");

      setTimeout(() => {
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === optimisticId
              ? { ...msg, status: "failed", fromServer: false }
              : msg
          );
          console.log("❌ Updated messages (FAILED, offline):", updated);
          return updated;
        });

        optimisticMessagesRef.current.delete(clientTimestamp);
      }, 500);

      return;
    }

    try {
      const success = emit("sendMessage", payload);
      console.log("📡 Emit sendMessage result:", success);

      if (!success) {
        console.log("❌ emit() returned false. Marking failed...");
        setTimeout(() => {
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === optimisticId
                ? { ...msg, status: "failed", fromServer: false }
                : msg
            );
            console.log("❌ Updated messages (FAILED, emit error):", updated);
            return updated;
          });
        }, 500);
        return;
      }

      // Set timeout for message confirmation
      const confirmationTimeout = setTimeout(() => {
        console.log("⏳ Confirmation timeout hit! Marking failed...");

        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === optimisticId || msg.clientTimestamp === clientTimestamp
              ? {
                  ...msg,
                  status: "failed",
                  fromServer: false,
                }
              : msg
          );
          console.log(
            "❌ Updated messages (FAILED, no confirmation):",
            updated
          );
          return updated;
        });
      }, 10000);

      // Handle confirmation
      const handleMessageSent = (data) => {
        console.log("📩 Server confirmed message:", data);

        clearTimeout(confirmationTimeout);
        optimisticMessagesRef.current.delete(clientTimestamp);

        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === optimisticId || msg.clientTimestamp === clientTimestamp
              ? {
                  ...msg,
                  serverId: data.id,
                  fromServer: true,
                  status: "sent",
                }
              : msg
          );
          console.log("✅ Updated messages (CONFIRMED):", updated);
          return updated;
        });

        setConnectionError(false);
      };

      // Listen for confirmation
      if (socket) {
        socket.off("messageSent", handleMessageSent);
        socket.on("messageSent", handleMessageSent);
        console.log("👂 Listening for server messageSent event…");
      }

      // Stop typing
      emit("stopTyping", {
        room: roomIdxccd,
        recipient: partnerData._id,
        userId,
      });

      clearTimeout(typingTimeoutRef.current);
    } catch (error) {
      console.error("💥 Error sending message:", error);

      setTimeout(() => {
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === optimisticId
              ? { ...msg, status: "failed", fromServer: false }
              : msg
          );
          console.log("❌ Updated messages (FAILED, catch block):", updated);
          return updated;
        });
      }, 500);
    }
  };

  // The function that sends the message to the server
  const attemptSendMessage = ({ optimisticId, message, clientTimestamp }) => {
    const payload = {
      room: roomIdxccd,
      recipient: partnerData._id,
      message,
      clientTimestamp,
    };

    const success = emit("sendMessage", payload);

    if (!success) {
      // Failed to send → mark as pending
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticId ? { ...msg, status: "pending" } : msg
        )
      );
      return;
    }

    // Listen for confirm
    socket?.once("messageSent", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticId
            ? {
                ...msg,
                id: data.id,
                status: "sent", // delivered after server ACK
                localOnly: false,
              }
            : msg
        )
      );
    });
  };
  // const attemptSendMessage = ({ optimisticId, message, clientTimestamp }) => {
  //   const payload = {
  //     room: roomIdxccd,
  //     recipient: partnerData._id,
  //     message,
  //     clientTimestamp,
  //   };

  //   const success = emit("sendMessage", payload);

  //   if (!success) {
  //     setMessages((prev) =>
  //       prev.map((msg) =>
  //         msg.id === optimisticId ? { ...msg, status: "failed" } : msg
  //       )
  //     );
  //     return;
  //   }

  //   socket?.once("messageSent", (data) => {
  //     setMessages((prev) =>
  //       prev.map((msg) =>
  //         msg.id === optimisticId
  //           ? { ...msg, ...data, status: "delivered", localOnly: false }
  //           : msg
  //       )
  //     );
  //   });
  // };

  // Auto-resend pending messages when Internet returns
  useEffect(() => {
    if (!isConnected) return;

    // Find all pending messages and resend them
    const pendingMessages = messages.filter(
      (m) => m.status === "pending" && m.localOnly
    );

    pendingMessages.forEach((msg) => {
      attemptSendMessage({
        optimisticId: msg.id,
        message: msg.message,
        clientTimestamp: msg.clientTimestamp,
      });
    });
  }, [isConnected]);

  const getProfilePicUrl = (partnerData) => {
    if (!partnerData?.profile_pic?.length) {
      return null; // No profile pictures available
    }

    // Find the primary picture or use the first one
    const primaryPic =
      partnerData.profile_pic.find((pic) => pic.isPrimary) ||
      partnerData.profile_pic[0];
    return primaryPic?.url || null;
  };

  // Update video call function to use emit
  const onVideoCall = async () => {
    if (!partnerData) {
      Alert.alert("Error", "Cannot start call. Partner data not loaded.");
      return;
    }

    try {
      setIsProcessingCall(true);
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      const url = `https://test.unigate.com.ng/w/vc.php?nexroomid=${roomIdxccd}&partnerid=${partnerData._id}&callerid=${loggedInUserId}&partnerName=${partnerData.name}`;

      console.log("Fetching video call URL:", url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      const response = await res.json();
      console.log("Video call response:", response);

      if (response.success && response.final_url) {
        console.log("Final video call URL:", response.final_url);
        setCallUrl(response.final_url);

        // Store call data
        await Promise.all([
          AsyncStorage.setItem("callUrl", response.final_url),
          AsyncStorage.setItem("partnerId", partnerData._id),
          AsyncStorage.setItem("partnerName", partnerData.name),
        ]);

        // ✅ EMIT CALL INVITATION USING NEW METHOD
        const callPayload = {
          room: roomIdxccd,
          recipientId: partnerData._id,
          callerId: loggedInUserId,
          callerName: partnerData.name,
          callUrl: response.final_url,
          callType: "video",
          timestamp: Date.now(),
        };

        console.log("📞 Emitting video call invitation:", callPayload);
        emit("callInvitation", callPayload);

        // Send call link as message using emit
        const callMessage = `${response.final_url}`;
        const clientTimestamp = Date.now();
        const optimisticId = `call_link_${clientTimestamp}`;

        const payload = {
          room: roomIdxccd,
          recipient: partnerData._id,
          message: callMessage,
          clientTimestamp: clientTimestamp,
        };

        // Optimistic UI update
        const newMessage = {
          id: optimisticId,
          message: callMessage,
          isSender: true,
          isSeen: false,
          messageTime: formatMessageTime(),
          fromServer: false,
          clientTimestamp: clientTimestamp,
        };

        optimisticMessagesRef.current.add(clientTimestamp);
        setMessages((prev) => [...prev, newMessage]);

        // Emit message using new method
        const query = emit("sendMessage", payload);

        if (!query) {
          setConnectionError(true);
          return;
        }

        // Handle confirmation
        const handleMessageSent = (data) => {
          console.log("📤 Server confirmed call link sent:", data);
          optimisticMessagesRef.current.delete(clientTimestamp);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === optimisticId
                ? { ...msg, id: data.id || msg.id, fromServer: true }
                : msg
            )
          );
        };

        // Listen for confirmation
        if (socket) {
          socket.off("messageSent", handleMessageSent);
          socket.on("messageSent", handleMessageSent);
        }

        if (!connectionError) {
          navigation.navigate("VideoCallScreen", {
            callUrl: response.final_url,
            partnerId: partnerData._id,
            partnerName: partnerData.name,
            isCaller: true,
          });

          setInCall(true);
          setParticipant(partnerData.name);
        } else {
          return;
        }
        // Navigate to call screen
      } else {
        Alert.alert("Call Failed", "Unable to create video call room.");
      }
    } catch (e) {
      console.error("Video call error:", e);
      Alert.alert(
        "Call Failed",
        "Unable to initiate video call. Please try again."
      );
    } finally {
      setIsProcessingCall(false);
    }
  };
  // Voice Call function
  const onVoiceCall = async () => {
    if (!partnerData) {
      Alert.alert("Error", "Cannot start call. Partner data not loaded.");
      return;
    }

    try {
      setIsProcessingCall(true);
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      const url = `https://test.unigate.com.ng/w/vvc.php?nexroomid=${roomIdxccd}&partnerid=${partnerData._id}&callerid=${loggedInUserId}&partnerName=${partnerData.name}`;

      console.log("Fetching voice call URL:", url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      const response = await res.json();
      console.log("Voice call response:", response);

      if (response.success && response.final_url) {
        console.log("Final voice call URL:", response.final_url);
        setCallUrl(response.final_url);

        // Store call data
        await Promise.all([
          AsyncStorage.setItem("callUrl", response.final_url),
          AsyncStorage.setItem("partnerId", partnerData._id),
          AsyncStorage.setItem("partnerName", partnerData.name),
        ]);

        // ✅ EMIT CALL INVITATION TO RECIPIENT
        if (socketRef?.current) {
          const callPayload = {
            room: roomIdxccd,
            recipientId: partnerData._id,
            callerId: loggedInUserId,
            callerName: partnerData.name,
            callUrl: response.final_url,
            callType: "voice",
            timestamp: Date.now(),
          };

          console.log("📞 Emitting voice call invitation:", callPayload);
          socketRef.current.emit("callInvitation", callPayload);
        }

        // Send call link as message
        const callMessage = `${response.final_url}`;
        const clientTimestamp = Date.now();
        const optimisticId = `call_link_${clientTimestamp}`;

        const payload = {
          room: roomIdxccd,
          recipient: partnerData._id,
          message: callMessage,
          clientTimestamp: clientTimestamp,
        };

        // Optimistic UI update
        const newMessage = {
          id: optimisticId,
          message: callMessage,
          isSender: true,
          isSeen: false,
          messageTime: formatMessageTime(),
          fromServer: false,
          clientTimestamp: clientTimestamp,
        };

        optimisticMessagesRef.current.add(clientTimestamp);
        setMessages((prev) => [...prev, newMessage]);

        // Emit message
        const query = socketRef.current.emit("sendMessage", payload);
        if (!query) {
          setConnectionError(true);
          return;
        }
        // Handle confirmation
        const handleMessageSent = (data) => {
          console.log("📤 Server confirmed call link sent:", data);
          optimisticMessagesRef.current.delete(clientTimestamp);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === optimisticId
                ? { ...msg, id: data.id || msg.id, fromServer: true }
                : msg
            )
          );
        };

        socketRef.current.off("messageSent", handleMessageSent);
        socketRef.current.on("messageSent", handleMessageSent);

        if (!connectionError) {
          navigation.navigate("VideoCallScreen", {
            callUrl: response.final_url,
            partnerId: partnerData._id,
            partnerName: partnerData.name,
            isCaller: true,
          });

          setInCall(true);
          setParticipant(partnerData.name);
        } else {
          return;
        }
      } else {
        alert("Call Failed", "Unable to create voice call room.");
      }
    } catch (e) {
      console.error("Voice call error:", e);
      alert("Call Failed", "Unable to initiate voice call. Please try again.");
    } finally {
      setIsProcessingCall(false);
    }
  };

  const renderItem = ({ item }) => {
    const isCallRequest = item.message.includes("https://test.unigate.com.ng/");
    const profilePicUrl = getProfilePicUrl(partnerData);

    // Retry function for failed messages
    const retryMessage = () => {
      if (item.status === "failed") {
        // Remove failed message
        setMessages((prev) => prev.filter((msg) => msg.id !== item.id));

        // Resend with original message text
        setInputMessage(item.message);
        setTimeout(() => sendMessage(), 100);
      }
    };

    return (
      <View
        style={[
          styles.messageContainer,
          {
            alignItems: item.isSender ? "flex-end" : "flex-start",
            paddingHorizontal: 8,
          },
        ]}
      >
        <View style={styles.messageRow}>
          {!item.isSender && (
            <View style={styles.avatarContainer}>
              <Image
                source={profilePicUrl ? { uri: profilePicUrl } : defaultImage}
                style={styles.smallProfilePic}
              />
            </View>
          )}

          <View style={styles.messageContent}>
            {isCallRequest ? (
              <TouchableOpacity
                style={[
                  styles.callBubble,
                  {
                    backgroundColor: "#7B61FF",
                    alignSelf: item.isSender ? "flex-end" : "flex-start",
                  },
                ]}
                onPress={() => {
                  // Your existing call handling code
                }}
              >
                <Ionicons name="videocam" size={18} color="#fff" />
                <NunitoText style={styles.callText}>
                  {item.isSender ? "Call Started" : "Join Call"}
                </NunitoText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onLongPress={() => {
                  if (item.status === "failed") {
                    console.log();
                    Alert.alert(
                      "Message Failed",
                      "Would you like to retry sending this message?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Retry", onPress: retryMessage },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => {
                            setMessages((prev) =>
                              prev.filter((msg) => msg.id !== item.id)
                            );
                          },
                        },
                      ]
                    );
                  }
                }}
                disabled={item.status !== "failed"}
              >
                <View
                  style={[
                    styles.messageBubble,
                    item.isSender ? styles.senderBubble : styles.receiverBubble,
                    {
                      opacity: item.status === "sending" ? 0.7 : 1,
                      alignSelf: item.isSender ? "flex-end" : "flex-start",
                      borderWidth: item.status === "failed" ? 1 : 0,
                      borderColor:
                        item.status === "failed" ? "#EF4444" : "transparent",
                    },
                  ]}
                >
                  <NunitoText
                    style={
                      item.isSender ? styles.senderText : styles.receiverText
                    }
                  >
                    {item.message}
                  </NunitoText>
                </View>
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.messageMeta,
                {
                  justifyContent: item.isSender ? "flex-end" : "flex-start",
                  alignSelf: item.isSender ? "flex-end" : "flex-start",
                },
              ]}
            >
              <NunitoText
                style={[
                  styles.timeText,
                  item.isSender && styles.senderTimeText,
                ]}
              >
                {item.messageTime}
              </NunitoText>

              {item.isSender && (
                <>
                  {item.status === "sending" && (
                    <ActivityIndicator
                      size="small"
                      color="rgba(255, 255, 255, 0.6)"
                      style={styles.statusIcon}
                    />
                  )}

                  {item.status === "sent" && (
                    <MaterialIcons
                      name="done"
                      color="rgba(255, 255, 255, 0.8)"
                      size={14}
                      style={styles.statusIcon}
                    />
                  )}

                  {item.status === "delivered" && (
                    <MaterialIcons
                      name="done-all"
                      color="rgba(255, 255, 255, 0.8)"
                      size={14}
                      style={styles.statusIcon}
                    />
                  )}

                  {item.isSeen && (
                    <MaterialIcons
                      name="done-all"
                      color="#4ade80"
                      size={14}
                      style={styles.statusIcon}
                    />
                  )}

                  {item.status === "failed" && (
                    <Ionicons
                      name="alert-circle"
                      color="#EF4444"
                      size={14}
                      style={styles.statusIcon}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Show connection error
  /*
  if (connectionError) {
    return (
      <View style={styles.errorContainer}>
        <SafeMyStatusBar />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <NunitoTitle style={styles.errorTitle}>Connection Error</NunitoTitle>
        </View>
        <View style={styles.errorContent}>
          <Ionicons name="wifi-outline" size={64} color="#6B7280" />
          <NunitoTitle style={styles.errorText}>
            Unable to connect to server
          </NunitoTitle>
          <NunitoText style={styles.errorSubtext}>
            Please check your internet connection and try again
          </NunitoText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setConnectionError(false)}>
            <NunitoText style={styles.retryButtonText}>Retry</NunitoText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
    */

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.safeArea}>
        <SafeMyStatusBar />

        {/* Connection Status */}
        {/** {!isConnected && (
          <View style={styles.connectionBanner}>
            <Ionicons name="wifi-outline" size={16} color="#F59E0B" />
            <NunitoText style={styles.connectionText}>
              Connecting to server...
            </NunitoText>
          </View>
        )} */}

        {/* Processing Call Banner */}
        {isProcessingCall && (
          <View style={styles.processingBanner}>
            <ActivityIndicator size="small" color="#4ade80" />
            <View style={styles.processingTextContainer}>
              <NunitoText style={styles.processingTitle}>
                Setting up your call room...
              </NunitoText>
              <NunitoText style={styles.processingSubtitle}>
                Ensure your network is stable
              </NunitoText>
            </View>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <Image
            source={
              getProfilePicUrl(partnerData)
                ? { uri: getProfilePicUrl(partnerData) }
                : defaultImage
            }
            style={styles.userImage}
          />

          <View style={styles.userInfo}>
            {partnerData?.name ? (
              <>
                <NunitoTitle style={styles.userName}>
                  {partnerData.name}
                </NunitoTitle>
                {/**  <NunitoText style={styles.userStatus}>
                  {typingUser ? `${typingUser} is typing...` : "Online"}
                </NunitoText> */}
              </>
            ) : (
              <ActivityIndicator size="small" color="#7B61FF" />
            )}
          </View>

          <View style={styles.callButtons}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={onVideoCall}
              disabled={isProcessingCall}
            >
              <Ionicons name="videocam" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callButton}
              onPress={onVoiceCall}
              disabled={isProcessingCall}
            >
              <Ionicons name="call" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7B61FF" />
            <NunitoText style={styles.loadingText}>
              Loading messages...
            </NunitoText>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#9CA3AF" />
            <NunitoTitle style={styles.emptyText}>No messages yet</NunitoTitle>
            <NunitoText style={styles.emptySubtext}>
              Start a conversation with {partnerData?.name || "your match"}
            </NunitoText>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].sort((a, b) => a.createdAt - b.createdAt)}
            renderItem={renderItem}
            keyExtractor={(item) => item.id} // This stays the same - uses optimistic ID
            contentContainerStyle={styles.messagesContainer}
            inverted
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          />
        )}

        {/* Input Area */}
        <View
          style={{
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            paddingHorizontal: 16,
            paddingBottom: 16,
            paddingTop: 8,
          }}
        >
          {/* Connection Error Banner */}
          {connectionError && (
            <View
              style={{
                backgroundColor: "#EF4444",
                borderRadius: 8,
                marginBottom: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
                <NunitoText
                  style={{
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: "500",
                    flex: 1,
                    marginLeft: 8,
                  }}
                >
                  Poor internet connection
                </NunitoText>
                <TouchableOpacity
                  style={{ padding: 4 }}
                  onPress={() => setConnectionError(false)}
                >
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              backgroundColor: "#F9FAFB",
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1,
                fontSize: 16,
                color: "#1F2937",
                //  maxHeight: 100,
                paddingTop: 8,
                paddingBottom: 8,
                outlineWidth: 0,
                // opacity: connectionError ? 0.5 : 1,
              }}
              value={inputMessage}
              onChangeText={handleTyping}
              //  multiline
              //  maxHeight={100}
              editable={true}
            />

            <TouchableOpacity
              style={{
                backgroundColor:
                  !inputMessage.trim() || loading ? "#F3F4F6" : "#7B61FF",
                width: 36,
                height: 36,
                borderRadius: 18,
                justifyContent: "center",
                alignItems: "center",
                marginLeft: 8,
              }}
              onPress={sendMessage}
              // disabled={!inputMessage.trim() || loading}
            >
              <Ionicons
                name="send"
                size={20}
                color={!inputMessage.trim() || loading ? "#9CA3AF" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeArea: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  errorContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    color: "#1F2937",
    textAlign: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#1F2937",
    textAlign: "center",
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#7B61FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  connectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FCD34D",
  },
  connectionText: {
    fontSize: 12,
    color: "#92400E",
    marginLeft: 4,
    fontWeight: "500",
  },
  processingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: "#fcd34d",
  },
  processingTextContainer: {
    marginLeft: 12,
  },
  processingTitle: {
    color: "#111",
    fontWeight: "600",
    fontSize: 15,
  },
  processingSubtitle: {
    color: "#555",
    fontSize: 13,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    color: "#1F2937",
    marginBottom: 0,
  },
  userStatus: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: -1,
  },
  callButtons: {
    flexDirection: "row",
    gap: 8,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7B61FF",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#1F2937",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  // IMPROVED MESSAGE STYLES
  messagesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: "100%",
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  smallProfilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageContent: {
    maxWidth: "80%",
    flexShrink: 1,
  },
  // Improved message bubbles
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    // Shadow for better visual hierarchy
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // Sender bubble specific styles
  senderBubble: {
    backgroundColor: "#7B61FF",
    borderBottomRightRadius: 4, // Pointed edge for sender
  },
  // Receiver bubble specific styles
  receiverBubble: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4, // Pointed edge for receiver
  },
  senderText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "400",
  },
  receiverText: {
    color: "#1F2937",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "400",
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 8,
  },
  timeText: {
    fontSize: 11,
    color: "#6B7280",
  },
  senderTimeText: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  statusIcon: {
    marginLeft: 4,
  },
  // Call bubble styles
  callBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    // Enhanced shadow
    shadowColor: "#7B61FF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  callText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Input area styles
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 44,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 16,
    color: "#1F2937",
    maxHeight: 100,
    padding: 0,
    outlineWidth: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7B61FF",
    justifyContent: "center",
    alignItems: "center",
    // Shadow for button
    shadowColor: "#7B61FF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#F3F4F6",
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default MessageScreen;
