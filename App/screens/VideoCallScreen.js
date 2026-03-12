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
import { useSocket } from "../lib/SocketContext";
import { BlurView } from "expo-blur";

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

  // useSocket hook for centralized connection
  const { socket, endCall: sendEndSignal } = useSocket();

  useEffect(() => {
    const loadCallData = async () => {
      try {
        setLoading(true);
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

          await requestPermissions();
        } else {
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
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Handle incoming call-end
    const onCallEnded = () => {
      console.log("📞 Remote party ended call");
      setCallEnded(true);
      setTimeout(() => endCall(), 2000);
    };

    // Handle upgrade requests
    const onUpgradeRequest = ({ upgradeType }) => {
      Alert.alert(
        "Switch to Video?",
        `${partnerName || "Your partner"} wants to switch to video.`,
        [
          {
            text: "Accept",
            onPress: () => {
              setCallType("video");
              socket.emit("callUpgradeAccepted", {
                room: roomRef.current,
                recipientId: partnerIdRef.current,
                upgradeType,
              });
            },
          },
          { text: "Decline", style: "cancel" },
        ]
      );
    };

    const onUpgradeAccepted = () => {
      setCallType("video");
      setUpgradeRequested(false);
    };

    socket.on("callEnded", onCallEnded);
    socket.on("callUpgradeRequest", onUpgradeRequest);
    socket.on("callUpgradeAccepted", onUpgradeAccepted);

    return () => {
      socket.off("callEnded", onCallEnded);
      socket.off("callUpgradeRequest", onUpgradeRequest);
      socket.off("callUpgradeAccepted", onUpgradeAccepted);
    };
  }, [socket]);


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
    setIsConnecting(false); // ⚡ Hide connecting overlay when iframe starts rendering

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

      // ⚡ SIGNALING: Notify other party via centralized context helper
      sendEndSignal({
        room: roomRef.current,
        recipientId: partnerIdRef.current
      });

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
    <View style={styles.container}>
      {/* Background with Blur for Voice Calls */}
      {callType === 'voice' && (
        <>
          <Image
            source={require("../../assets/images/appIco.png")}
            style={StyleSheet.absoluteFillObject}
            blurRadius={25}
          />
          {Platform.OS === 'ios' && (
            <BlurView intensity={60} style={StyleSheet.absoluteFillObject} tint="dark" />
          )}
        </>
      )}

      {/* Main Call Content (Iframe or Voice UI) */}
      <View style={styles.contentArea}>
        {callType === 'video' ? (
          renderIframe()
        ) : (
          <View style={styles.voiceCallContainer}>
            <Animated.View style={[styles.voiceAvatarRing, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.voiceAvatarInner}>
                <Image source={require("../../assets/images/appIco.png")} style={styles.partnerAvatarLarge} />
              </View>
            </Animated.View>
            <Text style={styles.partnerNameLarge}>{partnerName}</Text>
            <Text style={styles.callTypeLabel}>Voice Calling...</Text>
          </View>
        )}
      </View>

      {/* CONNECTING OVERLAY */}
      {isConnecting && callType === 'video' && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#4ecdc4" />
          <Text style={styles.overlayText}>Connecting...</Text>
        </View>
      )}

      {/* Modern Control Overlay */}
      <View style={styles.overlayControls}>
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.exitButton} onPress={endCall}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.statusBadge}>
            <Text style={styles.timerText}>{callEnded ? "Call Ended" : formatTime(callDuration)}</Text>
          </View>
        </View>

        <View style={styles.bottomActions}>
          {/* Mute toggle */}
          <TouchableOpacity style={[styles.roundAction, isMuted && styles.activeAction]} onPress={toggleMute}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color="#fff" />
          </TouchableOpacity>

          {/* End Call (WhatsApp Style Red) */}
          <TouchableOpacity style={styles.endCallAction} onPress={endCall}>
            <MaterialIcons name="call-end" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Video Toggle / Camera Flip */}
          {callType === 'video' ? (
            <TouchableOpacity style={[styles.roundAction, !isVideoOn && styles.activeAction]} onPress={toggleVideo}>
              <Ionicons name={isVideoOn ? "videocam" : "videocam-off"} size={26} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.roundAction} onPress={() => {
              setUpgradeRequested(true);
              socket?.emit("callUpgradeRequest", {
                room: roomRef.current,
                recipientId: partnerIdRef.current,
                upgradeType: "video",
              });
            }}>
              <Ionicons name="videocam" size={26} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Upgrade Pending State */}
      {upgradeRequested && (
        <View style={styles.upgradeToast}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.upgradeToastText}>Requesting video...</Text>
        </View>
      )}

      {/* Call ended full overlay */}
      {callEnded && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
          <Ionicons name="call" size={60} color="#FF3B30" />
          <Text style={styles.endedTitle}>Call Ended</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  contentArea: {
    flex: 1,
  },
  iframe: {
    flex: 1,
    width: "100%",
    height: "100%",
    border: "none",
  },
  voiceCallContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceAvatarRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceAvatarInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  partnerAvatarLarge: {
    width: "100%",
    height: "100%",
  },
  partnerNameLarge: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 30,
  },
  callTypeLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 18,
    marginTop: 8,
  },
  overlayControls: {
    ...StyleSheet.absoluteFillObject,
    padding: 25,
    justifyContent: "space-between",
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
  },
  exitButton: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
  },
  statusBadge: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  timerText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  bottomActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
    marginBottom: 30,
  },
  roundAction: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeAction: {
    backgroundColor: "#FF3B30",
  },
  endCallAction: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  upgradeToast: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 10,
  },
  upgradeToastText: {
    color: '#fff',
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  overlayText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 15,
    fontWeight: "600",
  },
  endedTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 20,
  },
});
