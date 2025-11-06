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

// Safe component imports with fallbacks
const SafeMyStatusBar = () => (
  <View style={{ height: Platform.OS === "ios" ? 44 : 0 }} />
);

// Safe hook imports
let useSocket, useCall;
try {
  useSocket = require("../lib/SocketContext").useSocket;
} catch (e) {
  useSocket = () => ({
    socketRef: { current: null },
    isConnected: false,
    onMessageReceived: () => () => {},
  });
}

try {
  useCall = require("../lib/CallContext").useCall;
} catch (e) {
  useCall = () => ({
    setInCall: () => {},
    setParticipant: () => {},
  });
}

// Safe function imports
let sendMessageNotification;
try {
  sendMessageNotification =
    require("../components/RegisterForPushNotificationsAsync").sendMessageNotification;
} catch (e) {
  sendMessageNotification = async () =>
    console.log("Notifications not available");
}

// Safe component imports
let NunitoText, NunitoTitle;
try {
  const NunitoComponents = require("../components/NunitoComponents");
  NunitoText = NunitoComponents.NunitoText || Text;
  NunitoTitle = NunitoComponents.NunitoTitle || Text;
} catch (e) {
  NunitoText = Text;
  NunitoTitle = Text;
}

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
  const [userId, setUserId] = useState(null);
  const [callUrl, setCallUrl] = useState("");
  const [isProcessingCall, setIsProcessingCall] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const { socketRef, onMessageReceived, isConnected } = useSocket();
  const spinAnim = useRef(new Animated.Value(0)).current;

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

    const cleanupMsg = onMessageReceived((data) => {
      const isDuplicate = Array.from(optimisticMessagesRef.current).some(
        (optId) =>
          data.clientTimestamp === optId || data.message === inputMessage
      );

      if (!isDuplicate) {
        const newMessage = {
          id: data.id || `server_${Date.now()}`,
          message: data.message,
          isSender: data.senderId === userId,
          isSeen: data.isSeen || false,
          messageTime: formatMessageTime(data.createdAt),
          fromServer: true,
        };
        setMessages((prev) => [newMessage, ...prev]);
      }
    });

    socketRef.current.emit("getOnlineStatus", true);

    return () => {
      cleanupMsg && cleanupMsg();
      socketRef.current?.off("userTyping", onUserTyping);
      socketRef.current?.off("userStoppedTyping", onUserStoppedTyping);
      socketRef.current?.emit("leaveRoom", { room: roomIdxccd, userId });
    };
  }, [isConnected, userId, roomIdxccd]);

  // Typing handler
  const handleTyping = (text) => {
    setInputMessage(text);

    if (!socketRef?.current || !partnerData || !userId) return;

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

  // Main chat fetching effect
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

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(
          `https://closematch-backend-seix.onrender.com/api/v1/messages/chat-room/${dynamicOtherUserId}`,
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

    // Reduce polling to every 5 seconds to reduce network load
    intervalId = setInterval(fetchChatRoom, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [roomIdxccd]);

  // Send message function
  const sendMessage = () => {
    if (
      !inputMessage.trim() ||
      !socketRef?.current ||
      !partnerData ||
      !userId
    ) {
      Alert.alert(
        "Error",
        "Cannot send message. Please check your connection."
      );
      return;
    }

    if (!socketRef.current.connected) {
      Alert.alert(
        "Connection Error",
        "Socket not connected — message not sent."
      );
      return;
    }

    const clientTimestamp = Date.now();
    const optimisticId = `optimistic_${clientTimestamp}`;

    const payload = {
      room: roomIdxccd,
      recipient: partnerData._id,
      message: inputMessage.trim(),
      clientTimestamp: clientTimestamp,
    };

    const newMessage = {
      id: optimisticId,
      message: inputMessage.trim(),
      isSender: true,
      isSeen: false,
      messageTime: formatMessageTime(),
      fromServer: false,
      clientTimestamp: clientTimestamp,
    };

    optimisticMessagesRef.current.add(clientTimestamp);
    setMessages((prev) => [newMessage, ...prev]);
    setInputMessage("");

    try {
      socketRef.current.emit("sendMessage", payload);

      const handleMessageSent = (data) => {
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

      socketRef.current.emit("stopTyping", {
        room: roomIdxccd,
        recipient: partnerData._id,
        userId,
      });

      clearTimeout(typingTimeoutRef.current);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  // Call functions
  const onVideoCall = async () => {
    if (!partnerData) {
      Alert.alert("Error", "Cannot start call. Partner data not loaded.");
      return;
    }

    try {
      setIsProcessingCall(true);
      const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

      Alert.alert("Info", "Call feature would be implemented here");
    } catch (e) {
      console.error("Call error:", e);
      Alert.alert("Error", "Failed to start call. Please try again.");
    } finally {
      setIsProcessingCall(false);
    }
  };

  const onVoiceCall = async () => {
    Alert.alert("Info", "Voice call feature would be implemented here");
  };

  // Render individual message item
  const renderItem = ({ item }) => {
    const isCallRequest = item.message.includes("https://test.unigate.com.ng/");

    return (
      <View
        style={[
          styles.messageContainer,
          { alignItems: item.isSender ? "flex-end" : "flex-start" },
        ]}>
        <View style={styles.messageRow}>
          {!item.isSender && (
            <View style={styles.avatarContainer}>
              <Image source={defaultImage} style={styles.smallProfilePic} />
            </View>
          )}

          <View style={styles.messageContent}>
            {isCallRequest ? (
              <TouchableOpacity
                style={[
                  styles.callBubble,
                  {
                    backgroundColor: item.isSender ? "#7B61FF" : "#7B61FF",
                  },
                ]}
                onPress={() => {
                  Alert.alert(
                    "Call",
                    "Call functionality would be implemented here"
                  );
                }}>
                <Ionicons name="videocam" size={16} color="#fff" />
                <NunitoText style={styles.callText}>
                  {item.isSender ? "Call Started" : "Join Call"}
                </NunitoText>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: item.isSender ? "#7B61FF" : "#F3F4F6",
                    opacity: item.fromServer === false ? 0.7 : 1,
                  },
                ]}>
                <NunitoText
                  style={
                    item.isSender ? styles.senderText : styles.receiverText
                  }>
                  {item.message}
                  {item.fromServer === false && " ⏳"}
                </NunitoText>
              </View>
            )}

            <View style={styles.messageMeta}>
              <NunitoText style={styles.timeText}>
                {item.messageTime}
              </NunitoText>
              {item.isSender && (
                <MaterialIcons
                  name={item.isSeen ? "done-all" : "done"}
                  color={item.fromServer === false ? "#9CA3AF" : "#7B61FF"}
                  size={16}
                  style={styles.statusIcon}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Show connection error
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <View style={styles.safeArea}>
        <SafeMyStatusBar />

        {/* Connection Status */}
        {!isConnected && (
          <View style={styles.connectionBanner}>
            <Ionicons name="wifi-outline" size={16} color="#F59E0B" />
            <NunitoText style={styles.connectionText}>
              Connecting to server...
            </NunitoText>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <Image source={defaultImage} style={styles.userImage} />

          <View style={styles.userInfo}>
            {partnerData?.name ? (
              <>
                <NunitoTitle style={styles.userName}>
                  {partnerData.name}
                </NunitoTitle>
                <NunitoText style={styles.userStatus}>
                  {typingUser ? `${partnerData.name} is typing...` : "Online"}
                </NunitoText>
              </>
            ) : (
              <ActivityIndicator size="small" color="#7B61FF" />
            )}
          </View>

          <View style={styles.callButtons}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={onVideoCall}
              disabled={isProcessingCall}>
              <Ionicons name="videocam" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callButton}
              onPress={onVoiceCall}
              disabled={isProcessingCall}>
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
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            inverted
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
              value={inputMessage}
              onChangeText={handleTyping}
              multiline
              maxHeight={100}
              editable={!loading}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputMessage.trim() || loading}>
            <Ionicons
              name="send"
              size={20}
              color={inputMessage.trim() ? "#fff" : "#9CA3AF"}
            />
          </TouchableOpacity>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
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
    marginTop: -5,
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
  },
  avatarContainer: {
    marginRight: 8,
  },
  smallProfilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageContent: {
    maxWidth: "70%",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  senderText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  receiverText: {
    color: "#1F2937",
    fontSize: 14,
    lineHeight: 20,
  },
  messageMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#6B7280",
  },
  statusIcon: {
    marginLeft: 4,
  },
  callBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  callText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
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
  },
  textInput: {
    fontSize: 16,
    color: "#1F2937",
    maxHeight: 100,
    padding: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7B61FF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },
});

export default MessageScreen;
