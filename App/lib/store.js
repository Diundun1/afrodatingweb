import { create } from "zustand";

// Zustand store for app state
const appStore = create((set, get) => ({
  // Socket state
  socket: null,
  setSocket: (socket) => set({ socket }),

  // ✅ Connection status
  isConnected: false,
  setIsConnected: (status) => set({ isConnected: status }),

  // Current chat room
  currentRoom: null,
  setCurrentRoom: (roomId) => set({ currentRoom: roomId }),

  // Chat messages state - initialize with empty array or existing messages
  chatMessages: [],

  // Add a single message to the list
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  // Set all chat messages (used when receiving chat history)
  setChatMessages: (updaterFn) =>
    set((state) => ({
      chatMessages: updaterFn(state.chatMessages),
    })),

  // Clear messages for a specific room or all messages
  clearChatMessages: () => set({ chatMessages: [] }),

  // Join a chat room
  joinChatRoom: (roomId) => {
    const socket = get().socket?.current;
    if (socket) {
      socket.emit("joinRoom", roomId);
      set({ currentRoom: roomId });
      console.log(`Joining room: ${roomId}`);
    } else {
      console.error("Socket not available. Cannot join room.");
    }
  },

  // Send a message to current room
  sendChatMessage: (message, receiverId) => {
    const socket = get().socket?.current;
    if (socket) {
      socket.emit("send_message", {
        message,
        receiverId,
      });

      const newMessage = {
        id: new Date().getTime().toString(),
        message: message,
        isSender: true,
        isSeen: false,
      };

      get().addChatMessage(newMessage);
      console.log(`Message sent: ${message}`);
      return true;
    } else {
      console.error("Socket not available. Cannot send message.");
      return false;
    }
  },

  // Fetch chat history
  fetchChatHistory: (contactId, limit = 20, page = 1) => {
    const socket = get().socket?.current;
    if (socket) {
      socket.emit("get_chat_history", {
        contactId,
        limit,
        page,
      });
      console.log(`Fetching chat history for contact: ${contactId}`);
      return true;
    } else {
      console.error("Socket not available. Cannot fetch chat history.");
      return false;
    }
  },
}));

export default appStore;
