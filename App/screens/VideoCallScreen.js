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
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "../lib/SocketContext";
import { startCallingTone, stopCallingTone } from "../../ringtone";
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

export default function VideoCallScreen({ route }) {
  const navigation = useNavigation();
  const iframeRef = useRef(null);
  const { socketRef } = useSocket();

  const [callUrl, setCallUrl] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerId, setPartnerId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCaller, setIsCaller] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Use the hook safely - this will now use the fallback if context is not available
  const callContext = useCall();
  const { setInCall, setParticipant } = callContext || {
    setInCall: () => { },
    setParticipant: () => { },
  };

  useEffect(() => {
    const loadCallData = async () => {
      try {
        setLoading(true);
        const storedCallUrl = await AsyncStorage.getItem("callUrl");
        const storedPartnerName = await AsyncStorage.getItem("partnerName");

        if (storedCallUrl) {
          setCallUrl(storedCallUrl);
          setPartnerName(storedPartnerName || "Partner");
          setPartnerId(await AsyncStorage.getItem("partnerId"));

          // Safely call context methods
          if (setInCall) setInCall(true);
          if (setParticipant) setParticipant(storedPartnerName || "Partner");

          // Start outgoing calling tone if this user initiated the call
          const callerFlag = route?.params?.isCaller ?? false;
          setIsCaller(callerFlag);
          if (callerFlag && Platform.OS === "web") {
            startCallingTone();
          }

          // Request permissions immediately
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
  }, []);

  // Request camera/mic permissions — native only (web handles this via browser)
  const requestPermissions = async () => {
    if (Platform.OS === "web") {
      setHasPermission(true);
      return;
    }
    try {
      const { Camera } = await import("expo-camera");
      const cameraPerm = await Camera.requestCameraPermissionsAsync();
      const micPerm = await Camera.requestMicrophonePermissionsAsync();

      if (cameraPerm.status === "granted" && micPerm.status === "granted") {
        setHasPermission(true);
      } else {
        setHasPermission(false);
        Alert.alert(
          "Permissions Required",
          "Camera and microphone permissions are required for video calls.",
          [{ text: "OK", onPress: () => endCall() }],
        );
      }
    } catch (error) {
      console.log("❌ Permission error:", error);
      setHasPermission(false);
      endCall();
    }
  };

  const sendCommandToIframe = (command, value) => {
    const message = JSON.stringify({
      type: "CONTROL_COMMAND",
      command: command,
      value: value,
    });

    if (Platform.OS === "web" && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, "*");
      console.log(`📤 Sent web command ${command}: ${value}`);
    } else if (Platform.OS !== "web" && iframeRef.current) {
      iframeRef.current.injectJavaScript(`window.postMessage(${JSON.stringify(message)}, '*');`);
      console.log(`📤 Sent native command ${command}: ${value}`);
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

  // Listen for call_ended from the other user
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleRemoteCallEnded = () => {
      if (!callEnded) {
        console.log("📞 Remote user ended the call");
        stopCallingTone();
        setCallEnded(true);
        setTimeout(() => endCall(false), 2000);
      }
    };

    socket.on("call_ended", handleRemoteCallEnded);
    return () => socket.off("call_ended", handleRemoteCallEnded);
  }, [socketRef, callEnded]);

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
    console.log("✅ Call container loaded");
    setIframeLoaded(true);
    // Stop calling tone — the call has connected
    stopCallingTone();

    const message = JSON.stringify({
      type: "INITIAL_STATE",
      muted: isMuted,
      videoOn: isVideoOn,
      hasPermission: hasPermission,
    });

    if (Platform.OS === "web" && iframeRef.current && iframeRef.current.contentWindow) {
      setTimeout(() => {
        iframeRef.current.contentWindow.postMessage(message, "*");
      }, 500);
    } else if (Platform.OS !== "web" && iframeRef.current) {
      setTimeout(() => {
        iframeRef.current.injectJavaScript(`window.postMessage(${JSON.stringify(message)}, '*');`);
      }, 500);
    }
  };

  const handleCallEnded = () => {
    if (!callEnded) {
      console.log("📞 Call ended by iframe");
      setCallEnded(true);
      setTimeout(() => endCall(true), 2000);
    }
  };

  const endCall = async (notifyPartner = true) => {
    try {
      console.log("📞 Ending call...");
      stopCallingTone();

      // Read partnerId from state OR AsyncStorage as fallback
      const pid = partnerId || (await AsyncStorage.getItem("partnerId"));

      // Notify the other user so their screen ends too
      if (notifyPartner && pid && socketRef?.current?.connected) {
        socketRef.current.emit("call_ended", { recipientId: pid });
        console.log("📞 Emitted call_ended to", pid);
      }

      await AsyncStorage.multiRemove(["callUrl", "partnerId", "partnerName"]);
    } catch (e) {
      console.log("Error clearing storage", e);
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

    if (Platform.OS !== "web") {
      const injectedJavaScript = `
        window.addEventListener('message', function(event) {
          window.ReactNativeWebView.postMessage(typeof event.data === 'string' ? event.data : JSON.stringify(event.data));
        });
        const originalPostMessage = window.parent.postMessage;
        window.parent.postMessage = function(data, targetOrigin, transfer) {
          window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
          if (originalPostMessage) {
              originalPostMessage.apply(window.parent, [data, targetOrigin, transfer]);
          }
        };
        true;
      `;

      return (
        <WebView
          ref={iframeRef}
          source={{ uri: callUrl }}
          style={styles.iframe}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          injectedJavaScript={injectedJavaScript}
          onMessage={(event) => {
            const dataStr = event.nativeEvent.data;
            console.log("📨 Message from WebView:", dataStr);
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "CALL_ENDED" || data.event === "call_end") {
                handleCallEnded();
              } else if (data.type === "COMMAND_RESPONSE") {
                console.log(`✅ WebView responded to ${data.command}: ${data.success}`);
              } else if (data.type === "IFRAME_LOADED") {
                handleIframeLoad();
              }
            } catch (err) {
              if (dataStr === "call_ended" || dataStr === "CALL_ENDED") {
                handleCallEnded();
              } else if (dataStr === "iframe_loaded") {
                handleIframeLoad();
              }
            }
          }}
          onLoad={handleIframeLoad}
          onError={(e) => {
            console.log("❌ WebView loading error:", e.nativeEvent);
            Alert.alert(
              "Connection Error",
              "Unable to load video call. Please check your connection."
            );
          }}
        />
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
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0)"]}
          style={styles.topBar}
        >
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
        </LinearGradient>

        {/* Bottom Controls */}
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]}
          style={styles.bottomControls}
        >
          <TouchableOpacity
            style={[
              styles.controlButton,
              isMuted ? styles.controlButtonActive : styles.controlButtonInactive,
            ]}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color={isMuted ? "#000" : "#fff"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
            <MaterialIcons name="call-end" size={36} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              !isVideoOn ? styles.controlButtonActive : styles.controlButtonInactive,
            ]}
            onPress={toggleVideo}
          >
            <Ionicons name={isVideoOn ? "videocam" : "videocam-off"} size={26} color={!isVideoOn ? "#000" : "#fff"} />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Call ended overlay */}
      {callEnded && (
        <View style={styles.callEndedOverlay}>
          <Ionicons name="call" size={60} color="#fff" />
          <Text style={styles.callEndedText}>Call Ended</Text>
          {/* <Text style={styles.callEndedSubtext}>
            Returning to main screen...
          </Text> */}
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
    pointerEvents: "box-none",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 40,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
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
    paddingHorizontal: 30,
    paddingBottom: 50,
    paddingTop: 40,
    gap: 30,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  controlButtonInactive: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  controlButtonActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  endCallButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
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
});
