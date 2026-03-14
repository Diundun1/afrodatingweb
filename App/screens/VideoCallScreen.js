import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Image,
  Alert,
  Vibration,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { startRingtone, stopRingtone } from "../../ringtone";
import { useCall } from "../lib/CallContext";
import { useSocket } from "../lib/SocketContext";

const { width, height } = Dimensions.get("window");

// ─── Call status state machine ──────────────────────────────
const STATUS = {
  CALLING: "calling",
  RINGING: "ringing",
  CONNECTED: "connected",
  ENDED: "ended",
};

export default function VideoCallScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const socketContext = useSocket();
  const callContext = useCall();
  const { setInCall, setParticipant } = callContext || {};

  // ─── Route params ───────────────────────────────────────
  const {
    callUrl: paramCallUrl,
    partnerId: paramPartnerId,
    partnerName: paramPartnerName,
    partnerPic: paramPartnerPic,
    isCaller = false,
    callType: paramCallType = "video",
    room: paramRoom,
  } = route.params || {};

  // ─── State ──────────────────────────────────────────────
  const [callUrl, setCallUrl] = useState(paramCallUrl || "");
  const [partnerId, setPartnerId] = useState(paramPartnerId || "");
  const [partnerName, setPartnerName] = useState(paramPartnerName || "");
  const [partnerPic, setPartnerPic] = useState(paramPartnerPic || null);
  const [room, setRoom] = useState(paramRoom || "");
  const [callType, setCallType] = useState(paramCallType);
  const [callStatus, setCallStatus] = useState(
    isCaller ? STATUS.CALLING : STATUS.CONNECTED
  );
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(paramCallType === "video");
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);

  // ─── Refs ───────────────────────────────────────────────
  const hasEmittedEndRef = useRef(false);
  const iframeRef = useRef(null);
  const controlsAnim = useRef(new Animated.Value(1)).current;
  const controlsTimer = useRef(null);

  const avatarSource = partnerPic
    ? { uri: partnerPic }
    : require("../../assets/images/appIco.png");

  // ─── Load fallback data from AsyncStorage ─────────────
  useEffect(() => {
    const load = async () => {
      try {
        if (!callUrl) setCallUrl((await AsyncStorage.getItem("callUrl")) || "");
        if (!partnerId) setPartnerId((await AsyncStorage.getItem("partnerId")) || "");
        if (!partnerName) setPartnerName((await AsyncStorage.getItem("partnerName")) || "Partner");
        if (!room) setRoom((await AsyncStorage.getItem("roomId")) || "");
      } catch (e) {}
    };
    load();

    if (setInCall) setInCall(true);
    if (setParticipant) setParticipant(paramPartnerName || "Partner");

    return () => {
      stopRingtone();
      if (setInCall) setInCall(false);
    };
  }, []);

  // ─── Camera + mic permissions ───────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const cam = await Camera.requestCameraPermissionsAsync();
        const mic = await Camera.requestMicrophonePermissionsAsync();
        setHasPermission(
          cam.status === "granted" && mic.status === "granted"
        );
      } catch (e) {
        setHasPermission(false);
      }
    })();
  }, []);

  // ─── Ringback tone for caller ─────────────────────────
  useEffect(() => {
    if (isCaller) startRingtone();
    return () => stopRingtone();
  }, []);

  // ─── Call timer (only when connected) ─────────────────
  useEffect(() => {
    if (callStatus !== STATUS.CONNECTED) return;
    const timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  // ─── Socket event listeners ───────────────────────────
  useEffect(() => {
    const socket = socketContext?.socketRef?.current;
    if (!socket) return;

    const onCallAccepted = () => {
      console.log("📲 Call accepted");
      stopRingtone();
      setCallStatus(STATUS.CONNECTED);
    };

    const onCallDeclined = () => {
      console.log("📲 Call declined");
      stopRingtone();
      setCallStatus(STATUS.ENDED);
      setTimeout(() => doEndCall(), 2000);
    };

    const onCallEnded = () => {
      console.log("📲 Call ended by remote");
      hasEmittedEndRef.current = true;
      stopRingtone();
      setCallStatus(STATUS.ENDED);
      setTimeout(() => doEndCall(), 1500);
    };

    const onCallTimeout = () => {
      console.log("⏱ Call timed out");
      stopRingtone();
      setCallStatus(STATUS.ENDED);
      setTimeout(() => doEndCall(), 2000);
    };

    const onRinging = () => {
      if (isCaller) setCallStatus(STATUS.RINGING);
    };

    const onRemoteMuteStatus = (data) => {
      setIsRemoteMuted(!!data?.isMuted);
    };

    const onVideoUpgradeRequest = (data) => {
      Vibration.vibrate([0, 100, 50, 100]);
      Alert.alert(
        "Video Call Request",
        `${data?.from?.name || "Partner"} wants to switch to video.`,
        [
          {
            text: "Decline",
            style: "cancel",
            onPress: () => {
              socketContext.emit("videoUpgradeResponse", {
                to: data?.from?.id,
                room: data?.room,
                accepted: false,
              });
            },
          },
          {
            text: "Accept",
            onPress: () => {
              setCallType("video");
              setIsVideoOn(true);
              socketContext.emit("videoUpgradeResponse", {
                to: data?.from?.id,
                room: data?.room,
                accepted: true,
              });
            },
          },
        ]
      );
    };

    const onVideoUpgradeResponse = (data) => {
      if (data?.accepted) {
        setCallType("video");
        setIsVideoOn(true);
        Alert.alert("Upgraded", "Switched to video call.");
      } else {
        Alert.alert("Declined", "Partner declined the video request.");
      }
    };

    socket.on("callAccepted", onCallAccepted);
    socket.on("callDeclined", onCallDeclined);
    socket.on("callEnded", onCallEnded);
    socket.on("callTimeout", onCallTimeout);
    socket.on("ringing", onRinging);
    socket.on("remoteMuteStatus", onRemoteMuteStatus);
    socket.on("videoUpgradeRequest", onVideoUpgradeRequest);
    socket.on("videoUpgradeResponse", onVideoUpgradeResponse);

    return () => {
      const off = socketContext?.safeOff
        ? (e, h) => socketContext.safeOff(e, h)
        : (e, h) => socket.off(e, h);
      off("callAccepted", onCallAccepted);
      off("callDeclined", onCallDeclined);
      off("callEnded", onCallEnded);
      off("callTimeout", onCallTimeout);
      off("ringing", onRinging);
      off("remoteMuteStatus", onRemoteMuteStatus);
      off("videoUpgradeRequest", onVideoUpgradeRequest);
      off("videoUpgradeResponse", onVideoUpgradeResponse);
    };
  }, [socketContext]);

  // ─── Iframe message listener (web) ────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.type === "CALL_ENDED" || data?.event === "call_end") {
          hasEmittedEndRef.current = true;
          stopRingtone();
          setCallStatus(STATUS.ENDED);
          setTimeout(() => doEndCall(), 1500);
        }
        if (data?.type === "IFRAME_LOADED") setIframeLoaded(true);
      } catch (_) {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ─── End call: emit → cleanup → navigate back ────────
  const doEndCall = async () => {
    try {
      stopRingtone();
      if (!hasEmittedEndRef.current) {
        hasEmittedEndRef.current = true;
        const pid = partnerId || (await AsyncStorage.getItem("partnerId"));
        const rid = room || paramRoom;
        if (socketContext?.emit && pid && rid) {
          socketContext.emit("endCall", { to: pid, room: rid });
        }
      }
      await AsyncStorage.multiRemove([
        "callUrl",
        "partnerId",
        "partnerName",
        "roomId",
      ]);
    } catch (e) {}
    if (setInCall) setInCall(false);
    if (navigation.canGoBack()) navigation.goBack();
  };

  // ─── Iframe control helper ────────────────────────────
  const sendToIframe = (type, payload) => {
    if (Platform.OS === "web" && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ type, ...payload }),
        "*"
      );
    }
  };

  // ─── Toggle mute ─────────────────────────────────────
  const toggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    sendToIframe("CONTROL_COMMAND", { command: "mute", value: next });
    const pid = partnerId || (await AsyncStorage.getItem("partnerId"));
    const rid = room || paramRoom;
    if (socketContext?.emit && pid) {
      socketContext.emit("muteStatus", { to: pid, room: rid, isMuted: next });
    }
  };

  // ─── Toggle video / request upgrade ──────────────────
  const toggleVideo = () => {
    if (callType === "voice") {
      Alert.alert("Video Upgrade", "Request to switch to video?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            const pid =
              partnerId || (await AsyncStorage.getItem("partnerId"));
            const rid = room || paramRoom;
            if (socketContext?.emit && pid) {
              socketContext.emit("videoUpgradeRequest", {
                to: pid,
                room: rid,
              });
            }
          },
        },
      ]);
      return;
    }
    const next = !isVideoOn;
    setIsVideoOn(next);
    sendToIframe("CONTROL_COMMAND", { command: "video", value: next });
  };

  // ─── Format duration ─────────────────────────────────
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── Auto-hide controls on tap ────────────────────────
  const showControls = () => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    Animated.timing(controlsAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    controlsTimer.current = setTimeout(() => {
      Animated.timing(controlsAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 5000);
  };

  // ═══════════════════════════════════════════════════════
  //  RENDER: Calling / Ringing (caller waiting for answer)
  // ═══════════════════════════════════════════════════════
  if (callStatus === STATUS.CALLING || callStatus === STATUS.RINGING) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#1a0a2e", "#16213e", "#0f0f1a"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerContent}>
          <Text style={styles.callingLabel}>
            {callStatus === STATUS.RINGING ? "Ringing..." : "Calling..."}
          </Text>

          <Image source={avatarSource} style={styles.callingAvatar} />

          <Text style={styles.callingName}>{partnerName}</Text>
          <Text style={styles.callingType}>
            {callType === "voice" ? "Voice Call" : "Video Call"}
          </Text>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={doEndCall}
            activeOpacity={0.8}
          >
            <MaterialIcons name="call-end" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  RENDER: Ended overlay
  // ═══════════════════════════════════════════════════════
  const renderEndedOverlay = () => (
    <View style={styles.endedOverlay}>
      <View style={styles.endedCard}>
        <MaterialIcons name="call-end" size={44} color="#FF4757" />
        <Text style={styles.endedText}>Call Ended</Text>
        {callDuration > 0 && (
          <Text style={styles.endedDuration}>{formatTime(callDuration)}</Text>
        )}
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════
  //  RENDER: Controls bar
  // ═══════════════════════════════════════════════════════
  const renderControls = () => (
    <View style={styles.controlsBar}>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={toggleMute}
        >
          <Ionicons
            name={isMuted ? "mic-off" : "mic"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlBtn,
            (callType === "voice" || !isVideoOn) && styles.controlBtnActive,
          ]}
          onPress={toggleVideo}
        >
          <Ionicons
            name={
              callType === "voice"
                ? "videocam"
                : isVideoOn
                ? "videocam"
                : "videocam-off"
            }
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endBtn}
          onPress={doEndCall}
          activeOpacity={0.8}
        >
          <MaterialIcons name="call-end" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════
  //  RENDER: Voice call (connected)
  // ═══════════════════════════════════════════════════════
  if (callType === "voice") {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#1a0a2e", "#2d1b69", "#0f0f1a"]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.voiceLayout}>
          <View style={styles.voiceCenter}>
            <Image source={avatarSource} style={styles.voiceAvatar} />
            <Text style={styles.voiceName}>{partnerName}</Text>
            <Text style={styles.voiceTimer}>
              {formatTime(callDuration)}
            </Text>
            {isRemoteMuted && (
              <View style={styles.mutedBadge}>
                <Ionicons name="mic-off" size={14} color="#fff" />
                <Text style={styles.mutedBadgeText}>Muted</Text>
              </View>
            )}
          </View>
          {renderControls()}
        </SafeAreaView>
        {callStatus === STATUS.ENDED && renderEndedOverlay()}
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  RENDER: Video call (connected)
  // ═══════════════════════════════════════════════════════
  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => {
        showControls();
        return false;
      }}
    >
      {/* Remote video via iframe (web) or fallback */}
      {Platform.OS === "web" && callUrl ? (
        <View style={StyleSheet.absoluteFill}>
          {!iframeLoaded && (
            <View style={[StyleSheet.absoluteFill, styles.connectingOverlay]}>
              <Image source={avatarSource} style={styles.connectingAvatar} />
              <Text style={styles.connectingText}>Connecting...</Text>
            </View>
          )}
          <iframe
            ref={iframeRef}
            src={callUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            allowFullScreen
            onLoad={() => setIframeLoaded(true)}
          />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noWebFallback]}>
          <LinearGradient
            colors={["#1a0a2e", "#0f0f1a"]}
            style={StyleSheet.absoluteFill}
          />
          <Image source={avatarSource} style={styles.fallbackAvatar} />
          <Text style={styles.fallbackName}>{partnerName}</Text>
          <Text style={styles.fallbackStatus}>In Conversation</Text>
        </View>
      )}

      {/* Local camera preview */}
      {hasPermission && isVideoOn && callType === "video" && (
        <View style={styles.localPreview}>
          <Camera
            style={StyleSheet.absoluteFill}
            type={Camera.Constants?.Type?.front || "front"}
          />
        </View>
      )}

      {/* Remote muted indicator */}
      {isRemoteMuted && (
        <View style={styles.remoteMuteOverlay}>
          <View style={styles.mutedBadge}>
            <Ionicons name="mic-off" size={16} color="#fff" />
            <Text style={styles.mutedBadgeText}>{partnerName} is muted</Text>
          </View>
        </View>
      )}

      {/* Top bar with gradient */}
      <Animated.View
        style={[styles.headerOverlay, { opacity: controlsAnim }]}
      >
        <SafeAreaView>
          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "transparent"]}
            style={styles.headerGradient}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={doEndCall} style={styles.backBtn}>
                <Ionicons name="chevron-down" size={26} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>{partnerName}</Text>
                <View style={styles.timerRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.timerText}>
                    {formatTime(callDuration)}
                  </Text>
                </View>
              </View>
              <View style={{ width: 40 }} />
            </View>
          </LinearGradient>
        </SafeAreaView>
      </Animated.View>

      {/* Bottom controls */}
      <Animated.View
        style={[styles.bottomOverlay, { opacity: controlsAnim }]}
      >
        {renderControls()}
      </Animated.View>

      {/* Ended overlay */}
      {callStatus === STATUS.ENDED && renderEndedOverlay()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },

  // ─── Calling State ────────────────────────────────────
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  callingLabel: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 36,
  },
  callingAvatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "rgba(108,92,231,0.5)",
    marginBottom: 24,
  },
  callingName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  callingType: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 64,
  },
  cancelBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FF4757",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cancelLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 8,
  },

  // ─── Voice Call ───────────────────────────────────────
  voiceLayout: {
    flex: 1,
    justifyContent: "space-between",
  },
  voiceCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "rgba(108,92,231,0.4)",
    marginBottom: 24,
  },
  voiceName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  voiceTimer: {
    fontSize: 18,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    marginBottom: 12,
  },

  // ─── Video Call ───────────────────────────────────────
  localPreview: {
    position: "absolute",
    top: 100,
    right: 16,
    width: 110,
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    elevation: 10,
    zIndex: 10,
  },
  connectingOverlay: {
    backgroundColor: "#1a0a2e",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  connectingAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  connectingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontWeight: "500",
  },
  noWebFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  fallbackName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  fallbackStatus: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },

  // ─── Header Overlay ───────────────────────────────────
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerGradient: {
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2ED573",
    marginRight: 6,
  },
  timerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
  },

  // ─── Bottom Overlay ───────────────────────────────────
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },

  // ─── Controls ─────────────────────────────────────────
  controlsBar: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,30,30,0.75)",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 20,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  endBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF4757",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  // ─── Muted Badge ──────────────────────────────────────
  mutedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,71,87,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  mutedBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  remoteMuteOverlay: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
    zIndex: 15,
  },

  // ─── Ended Overlay ────────────────────────────────────
  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  endedCard: {
    backgroundColor: "#1a1a2e",
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    width: "65%",
  },
  endedText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 14,
  },
  endedDuration: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    marginTop: 6,
  },
});
