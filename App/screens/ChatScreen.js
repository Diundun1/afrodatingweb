import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Animated,
  Dimensions,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NunitoTitle } from "../components/NunitoComponents";
import BottomButtons from "../components/BottomButtons";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSocket } from "../lib/SocketContext";

const { width, height } = Dimensions.get("window");

// API service functions
const chatService = {
  fetchChats: async (token) => {
    const response = await fetch(
      `https:backend-afrodate-8q6k.onrender.com/api/v1/messages/chat-users`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  },

  deleteChat: async (token, otherUserId) => {
    const response = await fetch(
      `https:backend-afrodate-8q6k.onrender.com/api/v1/messages/conversations/${otherUserId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete chat: ${response.status}`);
    }

    return await response.json();
  },
};

export default function ChatScreen() {
  // State management
  const [state, setState] = useState({
    searchQuery: "",
    activeTab: "All",
    chats: [],
    loading: true,
    refreshing: false,
    selectedRoomId: "",
    showLogoutDialog: false,
    error: null,
  });

  // Refs
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Hooks with error handling
  const socketContext = useSocket();
  const navigation = useNavigation();

  // Safe socket access
  const socketRef = socketContext?.socketRef || { current: null };
  const isConnected = socketContext?.isConnected || false;

  // Update state helper
  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Data formatting helper
  const formatChatData = (data) => {
    const formattedChats = Array.isArray(data) ? data : [data];

    return formattedChats.map((chat, index) => {
      const lm = chat.lastMessage; // could be object or string
      console.log("formattedChats: ", formattedChats);
      // const lastMessageText =
      //   typeof lm === "object" ? lm.message : lm || "No messages yet";
      const lastMessageText =
        typeof lm === "object" && lm !== null
          ? (lm?.message ?? "No messages yet")
          : (lm ?? "No messages yet");

      // const lastMessageTime =
      //   typeof lm === "object" && lm.sent_at
      //     ? new Date(lm.sent_at).toLocaleTimeString([], {
      //         hour: "2-digit",
      //         minute: "2-digit",
      //       })
      //     : "N/A";
      const lastMessageTime =
        lm && typeof lm === "object" && lm.sent_at
          ? new Date(lm.sent_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A";

      // ✔ FIXED PROFILE PIC
      const profilePic =
        chat.chatUser?.profile_pic?.[0]?.url ||
        chat.match?.profile_pic?.[0]?.url ||
        null;

      return {
        id: chat.match?._id || chat.chatUser?._id || `${index}`,
        name: chat.chatUser?.name || "Unknown User",
        lastMessage: lastMessageText,
        lastMessageTime,
        unreadMessageCount: chat.chatMetadata?.unreadCount || 0,
        roomId: chat.room,

        // ✔ if null, we'll handle fallback in the component
        profile_pic: profilePic,
      };
    });
  };

  // Extract other user ID from room ID
  const extractOtherUserId = async (roomId) => {
    if (!roomId) throw new Error("Room ID is required");

    const parts = roomId.split("_");
    const PartOne = parts[1];
    const PartTwo = parts[2];
    const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

    return PartOne === loggedInUserId ? PartTwo : PartOne;
  };

  // Fetch chats with proper error handling
  const fetchChats = async (showRefreshing = false) => {
    try {
      updateState(
        showRefreshing ? { refreshing: true } : { loading: true, error: null },
      );

      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");

      const data = await chatService.fetchChats(token);
      const formattedChats = formatChatData(data);

      updateState({
        chats: formattedChats,
        loading: false,
        refreshing: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to fetch chats:", error.message);
      updateState({
        error: error.message,
        loading: false,
        refreshing: false,
      });

      Alert.alert("Error", "Failed to load chats. Please try again.");
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchChats(true);
  }, []);

  // Start chat with user
  const startChatWithUser = async (roomId) => {
    if (!roomId) {
      Alert.alert("Error", "Cannot start chat: Room ID missing");
      return;
    }

    try {
      const otherUserId = await extractOtherUserId(roomId);

      if (!otherUserId) {
        throw new Error("Could not identify user to chat with");
      }

      // Join socket room if socket is available
      if (socketRef.current) {
        socketRef.current.emit("joinRoom", roomId);
      }

      // Navigate to chat screen
      navigation.navigate("MessageScreen", {
        otherUserId,
        roomIdxccd: roomId,
      });
    } catch (error) {
      console.error("Error starting chat:", error.message);
      Alert.alert("Error", "Failed to start chat. Please try again.");
    }
  };

  // Delete chat with confirmation
  const deleteChatWithUser = async (roomId) => {
    if (!roomId) {
      Alert.alert("Error", "Cannot delete chat: Room ID missing");
      return;
    }

    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              const otherUserId = await extractOtherUserId(roomId);

              await chatService.deleteChat(token, otherUserId);

              updateState({ showLogoutDialog: false });
              fetchChats();

              Alert.alert("Success", "Chat deleted successfully");
            } catch (error) {
              console.error("Error deleting chat:", error);
              Alert.alert("Error", "Failed to delete chat. Please try again.");
            }
          },
        },
      ],
    );
  };

  // Filter chats based on search query
  const filteredChats = state.chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(state.searchQuery.toLowerCase()),
  );

  // Effects
  useEffect(() => {
    console.log("filteredChats: ", filteredChats);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, []),
  );

  const ChatListItem = ({ chat, onPress, onDelete }) => (
    <TouchableOpacity
      style={styles.chatListItem}
      onPress={() => onPress(chat.roomId)}
      onLongPress={() => onDelete(chat.roomId)}
    >
      <View style={styles.chatLeft}>
        <Image
          source={
            chat.profile_pic
              ? { uri: chat.profile_pic }
              : require("../assets/images/users/1.png")
          }
          style={styles.chatAvatar}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <NunitoTitle style={styles.chatName}>{chat.name}</NunitoTitle>
            <NunitoTitle style={styles.chatTime}>
              {chat.lastMessageTime}
            </NunitoTitle>
          </View>

          {/* Updated last message section */}
          <NunitoTitle
            numberOfLines={1}
            style={[
              chat.unreadMessageCount > 0
                ? styles.unreadMessage
                : styles.readMessage,
              { width: "100%", justifyContent: "center" },
            ]}
          >
            {chat.lastMessage.includes("https://test.unigate.com.ng") ? (
              <Text style={styles.callSessionText}>
                <Ionicons
                  name="videocam"
                  size={16}
                  color="#fff"
                  style={{ marginTop: 10, lineHeight: 20 }}
                />{" "}
                Call Session
              </Text>
            ) : (
              chat.lastMessage
            )}
          </NunitoTitle>
        </View>
      </View>
      {/**     {chat.unreadMessageCount > 0 && (
        <View style={styles.unreadBadge}>
          <NunitoTitle style={styles.unreadCount}>
            {chat.unreadMessageCount}
          </NunitoTitle>
        </View>
      )} */}
    </TouchableOpacity>
  );

  const SearchBar = () => (
    <View style={styles.searchContainer}>
      <Ionicons
        name="search"
        size={20}
        color="#9CA3AF"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Search messages..."
        value={state.searchQuery}
        onChangeText={(text) => updateState({ searchQuery: text })}
        clearButtonMode="while-editing"
      />
    </View>
  );

  const LoadingState = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#7B61FF" />
      <NunitoTitle style={styles.loadingText}>Loading chats...</NunitoTitle>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="warning-outline" size={50} color="#EF4444" />
      <NunitoTitle style={styles.errorText}>
        {state.error || "Failed to load chats"}
      </NunitoTitle>
      <TouchableOpacity style={styles.retryButton} onPress={fetchChats}>
        <NunitoTitle style={styles.retryButtonText}>Try Again</NunitoTitle>
      </TouchableOpacity>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="chatbubble-outline" size={50} color="#9CA3AF" />
      <NunitoTitle style={styles.emptyText}>No messages yet</NunitoTitle>
      <NunitoTitle style={styles.emptySubtext}>
        Start a conversation with your matches!
      </NunitoTitle>
    </View>
  );

  const SocketWarning = () => (
    <View style={styles.socketWarning}>
      <Ionicons name="wifi-outline" size={16} color="#F59E0B" />
      <NunitoTitle style={styles.socketWarningText}>
        Real-time updates unavailable
      </NunitoTitle>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButton}></View>
        <NunitoTitle style={styles.headerTitle}>Chat</NunitoTitle>
        <View style={styles.headerButton}></View>
      </View>

      {/* Socket Connection Warning */}
      {/**      {!isConnected && <SocketWarning />}
       */}
      {/* Search Bar */}
      {/**      <SearchBar />
       */}
      {/* Stats */}
      <View style={styles.statsContainer}>
        <NunitoTitle style={styles.statsTitle}>Messages</NunitoTitle>
        <NunitoTitle style={styles.statsSubtitle}>
          You have {state.chats.filter((c) => c.unreadMessageCount > 0).length}{" "}
          new message(s)
        </NunitoTitle>
      </View>

      {/* Content */}
      {state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState />
      ) : (
        <Animated.ScrollView
          ref={scrollViewRef}
          style={[styles.scrollView, { opacity: fadeAnim }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={onRefresh}
              colors={["#7B61FF"]}
              tintColor="#7B61FF"
            />
          }
        >
          {filteredChats.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.chatsList}>
              {filteredChats.map((chat, index) => {
                return (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    onPress={startChatWithUser}
                    onDelete={deleteChatWithUser}
                    isLast={index === filteredChats.length - 1}
                  />
                );
              })}
            </View>
          )}
        </Animated.ScrollView>
      )}

      <BottomButtons />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerButton: {
    padding: 8,
  },
  socketWarning: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    padding: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  socketWarningText: {
    fontSize: 12,
    color: "#92400E",
    marginLeft: 4,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  statsContainer: {
    margin: 16,
    marginBottom: 0,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  statsSubtitle: {
    color: "#6B7280",
    marginTop: -15,
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: "#6B7280",
  },
  errorText: {
    marginTop: 16,
    color: "#EF4444",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 16,
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    marginTop: 8,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#7B61FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  chatsList: {
    paddingBottom: 20,
    marginTop: 0,
  },
  chatListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  chatLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatContent: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    // backgroundColor: "red",
    marginBottom: -15,
    width: "100%",
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  chatTime: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  chatLastMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  unreadBadge: {
    backgroundColor: "#7B61FF",
    borderRadius: 12,

    justifyContent: "center",
    alignItems: "center",
  },
  unreadCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: -5,
    padding: 3,
  },

  // Message text styles
  unreadMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 20,
  },
  readMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  // Call session style
  callSessionText: {
    fontStyle: "italic",
    fontWeight: "800",
    backgroundColor: "#7B61FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    color: "#fff",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    alignContent: "center",
  },
});
