import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NunitoTitle } from "../components/NunitoComponents";
import BottomButtons from "../components/BottomButtons";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "expo-router";
import { useSocket } from "../../../lib/SocketContext";

const { width, height } = Dimensions.get("window");

// Dummy data
const dummyData = {
  recentMatches: [
    {
      id: 1,
      name: "Ariana",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      isOnline: true,
      unread: 2,
    },
    {
      id: 2,
      name: "Jenny",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      isOnline: false,
      unread: 0,
    },
    {
      id: 3,
      name: "Janne",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      isOnline: true,
      unread: 1,
    },
    {
      id: 4,
      name: "Nalli",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      isOnline: false,
      unread: 0,
    },
    {
      id: 5,
      name: "Ken",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      isOnline: true,
      unread: 0,
    },
  ],
  todayMessages: [
    {
      id: 1,
      name: "Ariana",
      message: "Nice to meet you, darling",
      time: "7:09 pm",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      unread: 1,
      isOnline: true,
    },
    {
      id: 2,
      name: "Janne",
      message: "Hey bro, do you want to...",
      time: "8:35 pm",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      unread: 0,
      isOnline: true,
    },
  ],
  yesterdayMessages: [
    {
      id: 1,
      name: "Ken",
      message: "I agree with your opinion",
      time: "10:00 pm",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      unread: 0,
      isOnline: false,
    },
    {
      id: 2,
      name: "Nalli",
      message: "Your voice is so attractive!",
      time: "8:00 pm",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      unread: 0,
      isOnline: false,
    },
    {
      id: 3,
      name: "Jenny",
      message: "Yesterday I went to...",
      time: "8:00 pm",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      unread: 0,
      isOnline: false,
    },
    {
      id: 4,
      name: "Jan",
      message: "Revisoire",
      time: "8:00 pm",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      unread: 3,
      isOnline: false,
    },
  ],
};

export default function ChatScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socketRef, isConnected } = useSocket(); // <-- use the hook here!
  const navigation = useNavigation();
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [showLogoutDialog, setshowDeleteDialog] = useState(false);

  const fetchChats = async () => {
    if (!socketRef?.current) return;

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No token found");

      const response = await axios.get(
        `https://closematch-backend-seix.onrender.com/api/v1/messages/chat-users`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { data } = response.data;
      console.log("Full API response:", response.data);

      const formattedChats = Array.isArray(data) ? data : [data];

      const mapped = formattedChats.map((chat, index) => ({
        id: chat.match?._id || chat.chatUser._id || `${index}`, // Unique identifier
        name: chat.chatUser.name,
        lastMessage: chat.lastMessage?.message || "No messages yet",
        image: require("../../../assets/images/users/user10.png"),
        lastMessageTime: chat.lastMessage
          ? new Date(chat.lastMessage.sent_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "N/A",

        unreadMessageCount: chat.chatMetadata?.unreadCount || 0,
        roomId: chat.room,
      }));

      setChats(mapped);
      //  roomIdXCC = mapped.room;

      //  // console.log("Mapped Chats:", data);
      const roomIds = mapped.map((chat) => chat.roomId);

      //  //  // console.log("recox:", roomIds[1]);
    } catch (error) {
      console.error("Failed to fetch chats:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    //  registerForPushNotificationsAsync();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchChats();
    }, [socketRef?.current])
  );

  const startChatWithUser = async (roomId) => {
    if (!roomId)
      throw new Error(
        "Room ID is missing, function cannot proceed without this!!!"
      );

    try {
      const parts = roomId.split("_");
      const extractedOtherUserId = parts[2]; // Assuming initialRoomId format: chatroom_<user1>_<user2>

      // console.log("Exernal API call: ", response);

      if (!extractedOtherUserId) {
        throw new Error("Other user ID is absent, function will fail!!!");
      } else {
        navigation.navigate("message/messageScreen", {
          otherUserId: extractedOtherUserId,
          roomIdxccd: roomId,
        });
      }

      socketRef.current.emit("joinRoom", roomId);
    } catch (error) {
      console.error("Error starting chat:", error.message);
    }
  };

  const deleteChatWithUser = async (roomId) => {
    Vibration.vibrate();

    if (!roomId) {
      console.log("room id not found");
      return;
    }

    const parts = roomId.split("_");
    const PartOne = parts[1];
    const PartTwo = parts[2];

    const loggedInUserId = await AsyncStorage.getItem("loggedInUserId");

    let extractedOtherUserId; // declare it here so it’s accessible everywhere

    if (PartOne === loggedInUserId) {
      extractedOtherUserId = PartTwo;
    } else {
      extractedOtherUserId = PartOne;
    }

    console.log("This is part one:", PartOne);
    console.log("This is part two:", PartTwo);
    console.log("Extracted Other User ID:", extractedOtherUserId);

    try {
      const token = await AsyncStorage.getItem("userToken");

      const response = await fetch(
        `https://closematch-backend-seix.onrender.com/api/v1/messages/conversations/${extractedOtherUserId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setshowDeleteDialog(false);
        fetchChats();
      }

      console.log("Delete response:", data);
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const RecentMatchItem = ({ user }) => (
    <TouchableOpacity style={styles.recentMatchItem}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
      </View>
      <NunitoTitle style={styles.recentMatchName} numberOfLines={1}>
        {user.name}
      </NunitoTitle>
    </TouchableOpacity>
  );

  const MessageItem = ({ message, isLast = false }) => (
    <TouchableOpacity
      style={[styles.messageItem, isLast && styles.lastMessageItem]}
      onPress={() => navigation.navigate("ChatDetail", { user: message })}>
      <View style={styles.messageLeft}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: message.avatar }}
            style={styles.messageAvatar}
          />
        </View>
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <NunitoTitle style={styles.messageName}>{message.name}</NunitoTitle>
            <NunitoTitle style={styles.messageTime}>{message.time}</NunitoTitle>
          </View>
          <NunitoTitle style={styles.messageText} numberOfLines={1}>
            {message.message}
          </NunitoTitle>
        </View>
      </View>
      {message.unread > 0 && (
        <View style={styles.messageUnreadBadge}>
          <NunitoTitle style={styles.messageUnreadCount}>
            {message.unread}
          </NunitoTitle>
        </View>
      )}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title, showBorder = true }) => (
    <View
      style={[styles.sectionHeader, showBorder && styles.sectionHeaderBorder]}>
      <NunitoTitle style={styles.sectionTitle}>{title}</NunitoTitle>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButton}></View>
        <NunitoTitle style={styles.headerTitle}>Chat</NunitoTitle>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="search" size={24} color="#7B61FF" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}

        {/* Recent Matches */}
        <View style={styles.section}>
          <SectionHeader title="Recent match" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.recentMatchesScroll}
            contentContainerStyle={styles.recentMatchesContent}>
            {dummyData.recentMatches.map((user) => (
              <RecentMatchItem key={user.id} user={user} />
            ))}
          </ScrollView>
        </View>

        {/* Today Messages */}
        <View style={styles.section}>
          <SectionHeader title="Today Message" />
          <View style={styles.messagesList}>
            {dummyData.todayMessages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </View>
        </View>

        {/* Yesterday Messages */}
        <View style={styles.section}>
          <SectionHeader title="Yesterday" showBorder={false} />
          <View style={styles.messagesList}>
            {dummyData.yesterdayMessages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                isLast={index === dummyData.yesterdayMessages.length - 1}
              />
            ))}
          </View>
        </View>
      </Animated.ScrollView>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 0,
  },
  sectionHeaderBorder: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  recentMatchesScroll: {
    marginHorizontal: -20,
    // backgroundColor: "red",
    paddingTop: 5,
  },
  recentMatchesContent: {
    paddingHorizontal: 20,
  },
  recentMatchItem: {
    alignItems: "center",
    marginRight: 20,
    width: 70,
    height: 85,
    // backgroundColor: "blue",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  messageAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  unreadCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  recentMatchName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#161616",
    textAlign: "center",
  },
  messagesList: {
    paddingHorizontal: 0,
  },
  messageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  lastMessageItem: {
    borderBottomWidth: 0,
  },
  messageLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  messageContent: {
    flex: 1,
    marginLeft: 12,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: -10,
  },
  messageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  messageTime: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  messageText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  messageUnreadBadge: {
    backgroundColor: "#7B61FF",
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  messageUnreadCount: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  newMessageButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7B61FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7B61FF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
