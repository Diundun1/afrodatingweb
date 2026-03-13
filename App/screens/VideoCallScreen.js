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
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

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
  const route = useRoute();
  const iframeRef = useRef(null);

  const { partnerName: initialPartnerName, callUrl: initialCallUrl } = route.params || {};

  const [callUrl, setCallUrl] = useState(initialCallUrl || "");
  const [partnerName, setPartnerName] = useState(initialPartnerName || "");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const controlsVisible = useRef(new Animated.Value(1)).current;
  const lastTouch = useRef(0);

  const callContext = useCall();
  const { setInCall, setParticipant } = callContext || {};

  useEffect(() => {
    const loadCallData = async () => {
      try {
        setLoading(true);
        let finalUrl = initialCallUrl;
        let finalName = initialPartnerName;

        if (!finalUrl) {
          finalUrl = await AsyncStorage.getItem("callUrl");
          finalName = await AsyncStorage.getItem("partnerName") || "Partner";
        }

        if (finalUrl) {
          setCallUrl(finalUrl);
          setPartnerName(finalName);
          if (setInCall) setInCall(true);
          if (setParticipant) setParticipant(finalName);
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

  const requestPermissions = async () => {
    try {
      const cameraPerm = await Camera.requestCameraPermissionsAsync();
      const micPerm = await Camera.requestMicrophonePermissionsAsync();

      if (cameraPerm.status === "granted" && micPerm.status === "granted") {
        setHasPermission(true);
      } else {
        setHasPermission(false);
        Alert.alert(
          "Permissions Required",
          "Camera and microphone permissions are required for video calls.",
          [{ text: "OK", onPress: () => endCall() }]
        );
      }
    } catch (error) {
      setHasPermission(false);
      endCall();
    }
  };

  const sendCommandToIframe = (command, value) => {
    if (Platform.OS === "web" && iframeRef.current?.contentWindow) {
      const message = JSON.stringify({ type: "CONTROL_COMMAND", command, value });
      iframeRef.current.contentWindow.postMessage(message, "*");
    }
  };

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    sendCommandToIframe("mute", newState);
  };

  const toggleVideo = () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    sendCommandToIframe("video", newState);
  };

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.type === "CALL_ENDED" || data.event === "call_end") handleCallEnded();
        if (data.type === "IFRAME_LOADED") setIframeLoaded(true);
      } catch (err) {}
    };

    if (Platform.OS === "web") {
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, []);

  const handleCallEnded = () => {
    if (!callEnded) {
      setCallEnded(true);
      setTimeout(() => endCall(), 1500);
    }
  };

  const endCall = async () => {
    try {
      await AsyncStorage.multiRemove(["callUrl", "partnerId", "partnerName"]);
    } catch (e) {}
    if (setInCall) setInCall(false);
    navigation.goBack();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleControls = () => {
    const toValue = controlsVisible._value === 0 ? 1 : 0;
    Animated.timing(controlsVisible, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container} onStartShouldSetResponder={() => { toggleControls(); return false; }}>
      {/* Background/Video Layer */}
      {Platform.OS === "web" && callUrl ? (
        <iframe
          ref={iframeRef}
          src={callUrl}
          style={styles.iframe}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          allowFullScreen
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles._loadingText}>Connecting...</Text>
        </View>
      )}

      {/* Floating UI Overlays */}
      <Animated.View style={[styles.overlay, { opacity: controlsVisible }]}>
        {/* Header - Call Info */}
        <SafeAreaView style={styles.header}>
          <LinearGradient colors={["rgba(0,0,0,0.6)", "transparent"]} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={endCall} style={styles.miniBack}>
                <Ionicons name="chevron-down" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerNameText}>{partnerName}</Text>
                <View style={styles.timerRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.securityIcon}>
                <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </SafeAreaView>

        {/* Footer - Floating Controls */}
        <View style={styles.footer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={toggleMute} style={[styles.controlCircle, isMuted && styles.controlCircleActive]}>
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={endCall} style={styles.endCallCircle}>
              <MaterialIcons name="call-end" size={32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleVideo} style={[styles.controlCircle, !isVideoOn && styles.controlCircleActive]}>
              <MaterialCommunityIcons name={isVideoOn ? "video" : "video-off"} size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Call Ended Modal */}
      {callEnded && (
        <View style={styles.endedOverlay}>
          <View style={styles.endedBox}>
            <MaterialIcons name="call-end" size={48} color="#EF4444" />
            <Text style={styles.endedText}>Call Ended</Text>
          </View>
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
  iframe: {
    flex: 1,
    width: "100%",
    height: "100%",
    border: "none",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  header: {
    width: "100%",
  },
  headerGradient: {
    paddingBottom: 40,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  miniBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  partnerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  partnerNameText: {
    color: "#fff",
    fontSize: 20,
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
    backgroundColor: "#FF3B30",
    marginRight: 6,
  },
  timerText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  securityIcon: {
    padding: 8,
  },
  footer: {
    width: "100%",
    paddingBottom: 50,
    alignItems: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 30, 0.75)",
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  controlCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
  },
  controlCircleActive: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  endCallCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  _loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  endedBox: {
    backgroundColor: "#1a1a1a",
    padding: 30,
    borderRadius: 25,
    alignItems: "center",
    width: "70%",
  },
  endedText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 15,
  },
});
