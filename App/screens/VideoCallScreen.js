import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Alert,
} from "react-native";
import { MaterialIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import initializeSocket from "../lib/socket";

const { width, height } = Dimensions.get("window");

// Improved fallback for useCall hook
let useCall = () => ({
  setInCall: () => console.log("setInCall fallback"),
  setParticipant: () => console.log("setParticipant fallback"),
});

try {
  const callContext = require("../lib/CallContext");
  if (callContext && callContext.useCall) {
    useCall = callContext.useCall;
  }
} catch (e) {
  console.warn("CallContext not found, using fallback");
}

export default function VideoCallScreen() {
  const navigation = useNavigation();
  const iframeRef = useRef(null);

  const [callUrl, setCallUrl] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [callType, setCallType] = useState("video"); // "video" | "voice"
  const [upgradeRequested, setUpgradeRequested] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Use the hook safely - this will now use the fallback if context is not available
  const callContext = useCall();
  const { setInCall, setParticipant } = callContext || {
    setInCall: () => { },
    setParticipant: () => { },
  };

  // Socket ref for signalling call-end to the other party
  const socketRef = useRef(null);
  const partnerIdRef = useRef(null);
  // State to track if we've already tried to emit acceptance
  const acceptanceEmitted = useRef(false);

  // Stable ref to always have the latest endCall — avoids stale closure in socket listeners
  const endCallRef = useRef(null);
  useEffect(() => {
    endCallRef.current = endCall;
  });

  useEffect(() => {
    const loadCallData = async () => {
      try {
        setLoading(true);
        // Load all data in parallel for speed
        const [
          storedCallUrl,
          storedPartnerName,
          storedPartnerId,
          storedCallType,
          storedRoom,
          isCallerStr
        ] = await Promise.all([
          AsyncStorage.getItem("callUrl"),
          AsyncStorage.getItem("partnerName"),
          AsyncStorage.getItem("partnerId"),
          AsyncStorage.getItem("callType"),
          AsyncStorage.getItem("callRoom"),
          AsyncStorage.getItem("isCaller")
        ]);

        if (storedCallUrl) {
          setCallUrl(storedCallUrl);
          setPartnerName(storedPartnerName || "Partner");
          setCallType(storedCallType || "video");

          partnerIdRef.current = storedPartnerId || null;
          roomRef.current = storedRoom || null;
          const isCaller = isCallerStr === "true";

          if (setInCall) setInCall(true);
          if (setParticipant) setParticipant(storedPartnerName || "Partner");

          // Start socket setup AFTER we have the data
          setupSocket(isCaller, storedCallUrl);

          await requestPermissions();
        } else {
          console.log("No call URL found");
          navigation.goBack();
        }
      } catch (err) {
        console.error("Error loading call data:", err);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadCallData();

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
    };
  }, []);

  const setupSocket = async (isCaller, currentCallUrl) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const socket = initializeSocket(
        "https://backend-afrodate-8q6k.onrender.com/messaging",
        token
      );
      socketRef.current = socket;

      // Helper for signaling acceptance
      const emitCallAccepted = () => {
        if (!isCaller && partnerIdRef.current && !acceptanceEmitted.current) {
          socket.emit("callAccepted", {
            room: roomRef.current,
            recipientId: partnerIdRef.current,
            callUrl: currentCallUrl,
          });
          acceptanceEmitted.current = true;
          console.log("✅ Emitted callAccepted to caller");
        }
      };

      socket.on("connect", () => {
        console.log("📡 Socket connected in VideoCallScreen");
        emitCallAccepted();
      });

      // Immediate check if already connected
      if (socket.connected) {
        emitCallAccepted();
      }

      // Other party ended the call
      socket.on("callEnded", () => {
        console.log("📞 Other party ended the call — closing room via ref");
        endCallRef.current?.();
      });

      // Other party requesting voice→video upgrade
      socket.on("callUpgradeRequest", ({ upgradeType }) => {
        Alert.alert(
          "Switch to Video?",
          `${partnerName || "Your partner"} wants to switch to video call.`,
          [
            {
              text: "Accept",
              onPress: () => {
                setCallType("video");
                setUpgradeRequested(false);
                if (socketRef.current?.connected && partnerIdRef.current) {
                  socketRef.current.emit("callUpgradeAccepted", {
                    room: roomRef.current,
                    recipientId: partnerIdRef.current,
                    upgradeType,
                  });
                }
              },
            },
            { text: "Decline", style: "cancel" },
          ]
        );
      });

      // Our upgrade request was accepted by the other party
      socket.on("callUpgradeAccepted", () => {
        setCallType("video");
        setUpgradeRequested(false);
        console.log("✅ Video upgrade accepted");
      });
    } catch (err) {
      console.error("VideoCallScreen socket setup failed", err);
    }
  };

  // Direct permission request - navigates back if rejected
  const requestPermissions = async () => {
    try {
      console.log("🎥 Requesting camera and microphone permissions...");

      const cameraPerm = await Camera.requestCameraPermissionsAsync();
      const micPerm = await Camera.requestMicrophonePermissionsAsync();

      if (cameraPerm.status === "granted" && micPerm.status === "granted") {
        setHasPermission(true);
        console.log("✅ All permissions granted");
      } else {
        setHasPermission(false);
        console.log("❌ Permissions denied - navigating back");

        Alert.alert(
          "Permissions Required",
          "Camera and microphone permissions are required for video calls.",
          [{ text: "OK", onPress: () => endCall() }]
        );
      }
    } catch (error) {
      console.log("❌ Permission error:", error);
      setHasPermission(false);
      endCall();
    }
  };

  // Send commands to iframe for mute/video toggle
  const sendCommandToIframe = (command, value) => {
    if (
      Platform.OS === "web" &&
      iframeRef.current &&
      iframeRef.current.contentWindow
    ) {
      const message = JSON.stringify({
        type: "CONTROL_COMMAND",
        command: command,
        value: value,
      });
      iframeRef.current.contentWindow.postMessage(message, "*");
      console.log(`📤 Sent ${command} command: ${value}`);
    }
  };

  // Toggle mute functionality
  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    sendCommandToIframe("mute", newMuteState);

    // Show visual feedback
    Alert.alert(
      newMuteState ? "Microphone Muted" : "Microphone Unmuted",
      newMuteState ? "Your microphone is now off" : "Your microphone is now on",
      [{ text: "OK" }],
      { duration: 1000 }
    );
  };

  // Toggle video functionality
  const toggleVideo = () => {
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    sendCommandToIframe("video", newVideoState);

    // Show visual feedback
    Alert.alert(
      newVideoState ? "Camera On" : "Camera Off",
      newVideoState
        ? "Your camera is now visible"
        : "Your camera is now hidden",
      [{ text: "OK" }],
      { duration: 1000 }
    );
  };

  // Enhanced message listener for iframe
  useEffect(() => {
    const handleMessage = (event) => {
      console.log("📨 Message from iframe:", event.data);

      try {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data);

          if (data.type === "CALL_ENDED" || data.event === "call_end") {
            handleCallEnded();
          }
          // Handle iframe responses to our commands
          else if (data.type === "COMMAND_RESPONSE") {
            console.log(
              `✅ Iframe responded to ${data.command}: ${data.success}`
            );
          }
          // Handle iframe loaded
          else if (data.type === "IFRAME_LOADED") {
            handleIframeLoad();
          }
        }
      } catch (err) {
        // Handle non-JSON messages
        if (event.data === "call_ended" || event.data === "CALL_ENDED") {
          handleCallEnded();
        } else if (event.data === "iframe_loaded") {
          handleIframeLoad();
        }
      }
    };

    if (Platform.OS === "web") {
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, []);

  // Send initial status to iframe when it loads
  const handleIframeLoad = () => {
    console.log("✅ Iframe loaded");
    setIframeLoaded(true);

    if (
      Platform.OS === "web" &&
      iframeRef.current &&
      iframeRef.current.contentWindow
    ) {
      // Send initial state
      setTimeout(() => {
        const message = JSON.stringify({
          type: "INITIAL_STATE",
          muted: isMuted,
          videoOn: isVideoOn,
          hasPermission: hasPermission,
        });
        iframeRef.current.contentWindow.postMessage(message, "*");
      }, 500);
    }
  };

  const handleCallEnded = () => {
    if (!callEnded) {
      console.log("📞 Call ended by iframe");
      setCallEnded(true);
      setTimeout(() => endCall(), 2000);
    }
  };

  // HARDENED endCall: Guarantees delivery of callEnded signal
  const endCall = async () => {
    try {
      console.log("📞 Initiating endCall...");
      const socket = socketRef.current;
      const partnerId = partnerIdRef.current;
      const room = roomRef.current;

      // Ensure signal is sent, even if briefly disconnected
      if (socket && partnerId) {
        const emitEnd = () => {
          socket.emit("callEnded", { room, recipientId: partnerId });
          console.log("📤 callEnded signal emitted to", partnerId);
        };

        if (socket.connected) {
          emitEnd();
        } else {
          console.log("⚠️ Socket disconnected during endCall, queueing signal...");
          socket.once("connect", emitEnd);
          // 3 second timeout: if we don't reconnect by then, just proceed
          setTimeout(() => socket.off("connect", emitEnd), 3000);
        }
      }

      // Cleanup local state and storage
      await AsyncStorage.multiRemove([
        "callUrl",
        "partnerId",
        "partnerName",
        "callRoom",
        "isCaller",
        "callType"
      ]);
    } catch (e) {
      console.error("Error in endCall process:", e);
    }

    if (setInCall) setInCall(false);
    if (setParticipant) setParticipant("");

    // Final UI navigation
    navigation.goBack();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  const renderIframe = () => {
    if (Platform.OS !== "web") {
      return (
        <View style={styles.mobileFallback}>
          <Ionicons name="videocam-outline" size={60} color="#666" />
          <Text style={styles.fallbackTitle}>Video Call</Text>
          <Text style={styles.fallbackText}>
            Video calls are optimized for web browsers
          </Text>
          <Text style={styles.fallbackSubtext}>
            Please use a web browser for the best video call experience
          </Text>
        </View>
      );
    }

    if (!callUrl) {
      return (
        <View style={styles.mobileFallback}>
          <Ionicons name="warning" size={60} color="#ff6b6b" />
          <Text style={styles.fallbackTitle}>No Call URL</Text>
          <Text style={styles.fallbackText}>
            Unable to load video call. Please try again.
          </Text>
        </View>
      );
    }

    return (
      <iframe
        ref={iframeRef}
        src={callUrl}
        style={styles.iframe}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        allowFullScreen
        onLoad={handleIframeLoad}
        onError={(e) => {
          console.log("❌ Iframe loading error:", e);
          Alert.alert(
            "Connection Error",
            "Unable to load video call. Please check your connection."
          );
        }}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Ionicons name="videocam" size={60} color="#4169E1" />
        <Text style={styles.loadingText}>Setting up your call...</Text>
      </SafeAreaView>
    );
  }

  // Show loading while checking permissions
  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Ionicons name="videocam" size={60} color="#4169E1" />
        <Text style={styles.loadingText}>Requesting permissions...</Text>
      </SafeAreaView>
    );
  }

  // Don't render call interface if permissions denied
  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Ionicons name="videocam-off" size={60} color="#ff6b6b" />
        <Text style={styles.loadingText}>Permissions denied</Text>
        <Text style={styles.fallbackText}>Redirecting back...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Main iframe */}
      {renderIframe()}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={endCall}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.callInfo}>
            <Text
              style={styles.partnerName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {partnerName}
            </Text>
            <Text style={styles.duration}>
              {callEnded ? "Call Ended" : formatTime(callDuration)}
            </Text>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>

          {/* Switch to Video — only on voice calls */}
          {callType === "voice" && !upgradeRequested && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                setUpgradeRequested(true);
                if (socketRef.current?.connected && partnerIdRef.current) {
                  socketRef.current.emit("callUpgradeRequest", {
                    room: roomRef.current,
                    recipientId: partnerIdRef.current,
                    upgradeType: "video",
                  });
                }
              }}
            >
              <View style={styles.controlBtnCircle}>
                <Ionicons name="videocam" size={22} color="#fff" />
              </View>
              <Text style={styles.controlButtonText}>Switch to Video</Text>
            </TouchableOpacity>
          )}

          {upgradeRequested && (
            <View style={styles.pendingBadge}>
              <Ionicons name="videocam" size={14} color="#4ecdc4" />
              <Text style={styles.pendingText}>Waiting…</Text>
            </View>
          )}

          {/* End Call Button */}
          <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
            <MaterialIcons name="call-end" size={28} color="#fff" />
            <Text style={styles.endCallButtonText}>End</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Call ended overlay */}
      {callEnded && (
        <View style={styles.callEndedOverlay}>
          <Ionicons name="call" size={60} color="#fff" />
          <Text style={styles.callEndedText}>Call Ended</Text>
          <Text style={styles.callEndedSubtext}>
            Returning to main screen...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 20,
    fontWeight: "500",
  },
  iframe: {
    flex: 1,
    width: "100%",
    height: "100%",
    border: "none",
    backgroundColor: "#000",
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButton: {
    marginRight: 15,
  },
  callInfo: {
    flex: 1,
  },
  partnerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    maxWidth: "50%",
  },
  duration: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
  },
  // Bottom Controls Styles
  bottomControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 25,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 10,
  },
  controlButtonInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  controlButtonActive: {
    backgroundColor: "rgba(239, 68, 68, 0.8)",
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  endCallButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#EF4444",
    padding: 10,
  },
  endCallButtonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  mobileFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  fallbackTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  fallbackText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  fallbackSubtext: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    textAlign: "center",
  },
  callEndedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  callEndedText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 20,
  },
  callEndedSubtext: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
  },
  controlBtnCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(78,205,196,0.15)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.35)",
    marginBottom: 8,
  },
  pendingText: {
    color: "#4ecdc4",
    fontSize: 13,
    fontWeight: "500",
  },
});
