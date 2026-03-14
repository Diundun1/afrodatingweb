import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Vibration,
  PanResponder,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Icons from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// ✅ DEFENSIVE COMPONENT WRAPPERS
const Ionicons = Icons.Ionicons || (() => null);
const MaterialIcons = Icons.MaterialIcons || (() => null);
const MaterialCommunityIcons = Icons.MaterialCommunityIcons || (() => null);
const SafeLinearGradient = LinearGradient || View;

import { useCall } from "../lib/CallContext";
import { useSocket } from "../lib/SocketContext";

export default function VideoCallScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const iframeRef = useRef(null);

  const { 
    partnerName: initialPartnerName, 
    callUrl: initialCallUrl, 
    callType: initialCallType, 
    partnerPic: initialPartnerPic,
    room: initialRoom
  } = route.params || {};

  const [room, setRoom] = useState(initialRoom || "");

  const [callType, setCallType] = useState(initialCallType || "video");
  const [callUrl, setCallUrl] = useState(initialCallUrl || "");
  const [partnerName, setPartnerName] = useState(initialPartnerName || "");
  const [partnerPic, setPartnerPic] = useState(initialPartnerPic || "");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const isCaller = route.params?.isCaller || false;
  const [cameraType, setCameraType] = useState(() => {
    try {
      return Camera.Constants?.Type?.front || "front";
    } catch (e) {
      return "front";
    }
  });

  const controlsVisible = useRef(new Animated.Value(1)).current;
  const lastTouch = useRef(0);
  const controlsTimer = useRef(null);

  // Draggable Pan state
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        const { dx, dy } = gestureState;
        const currentX = pan.x._value;
        const currentY = pan.y._value;

        // Snap logic
        const snapX = currentX > 0 ? (width - 140) : 0; 
        const snapY = currentY > 0 ? (height - 300) : 0;

        Animated.spring(pan, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const callContext = useCall();
  const { setInCall, setParticipant } = callContext || {};
  const socketContext = useSocket();

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

  const toggleMute = async () => {
    const newState = !isMuted;
    setIsMuted(newState);
    sendCommandToIframe("mute", newState);
    
    // Emit mute status to partner
    const partnerId = await AsyncStorage.getItem("partnerId");
    const roomId = room || (route.params?.room);
    if (socketContext?.emit && partnerId) {
      // Server expects 'muteStatus' event; it relays back to partner as 'remoteMuteStatus'
      socketContext.emit("muteStatus", { to: partnerId, room: roomId, isMuted: newState });
    }
  };

  const toggleVideo = () => {
    if (callType === "voice") {
      // Prompt for upgrade
      Alert.alert(
        "Request Video",
        "Would you like to request a video call upgrade?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Request", 
            onPress: async () => {
              const partnerId = await AsyncStorage.getItem("partnerId");
              const roomId = room || (route.params?.room);
              if (socketContext?.emit && partnerId) {
                socketContext.emit("videoUpgradeRequest", { to: partnerId, room: roomId });
                Alert.alert("Request Sent", "Waiting for partner to accept...");
              }
            }
          }
        ]
      );
      return;
    }

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

  // Socket listeners for signaling states
  // No longer needed as we call it above

  useEffect(() => {
    if (!socketContext?.socketRef?.current) return;

    const onCallDeclined = (data) => {
      console.log("📲 [CALL] Recipient declined call");
      setIsBusy(true);
      setTimeout(() => handleCallEnded(), 2000);
    };

    const onCallEnded = (data) => {
      console.log("📲 [CALL] Call ended by remote");
      handleCallEnded();
    };

    const onCallAccepted = (data) => {
      console.log("📲 [CALL] Call accepted!");
      setIsRinging(false);
      setLoading(false);
    };

    const onRinging = (data) => {
      console.log("🔔 [CALL] Partner phone is ringing");
      if (isCaller) setIsRinging(true);
    };

    const onRemoteMuteStatus = (data) => {
      console.log("🔇 [REMOTEMUTE]", data);
      setIsRemoteMuted(data.isMuted);
    };

    const onVideoUpgradeRequest = (data) => {
      console.log("📹 [UPGRADE_REQ]", data);
      Vibration.vibrate([0, 100, 50, 100]); // Subtle double vibrate
      Alert.alert(
        "Video Call Request",
        `${data.from.name} wants to switch to video call.`,
        [
          { 
            text: "Decline", 
            style: "cancel",
            onPress: () => {
              socketContext.emit("videoUpgradeResponse", { 
                to: data.from.id, 
                room: data.room, 
                accepted: false 
              });
            }
          },
          { 
            text: "Accept", 
            onPress: async () => {
              setCallType("video");
              setIsVideoOn(true);
              socketContext.emit("videoUpgradeResponse", { 
                to: data.from.id, 
                room: data.room, 
                accepted: true
              });
            }
          }
        ]
      );
    };

    const onVideoUpgradeResponse = (data) => {
      console.log("📹 [UPGRADE_RES]", data);
      if (data.accepted) {
        setCallType("video");
        setIsVideoOn(true);
        Alert.alert("Success", "Partner accepted video call!");
      } else {
        Alert.alert("Declined", "Partner declined the video call upgrade.");
      }
    };

    const socket = socketContext?.socketRef?.current;
    if (!socket) return;

    socket.on('callDeclined', onCallDeclined);
    socket.on('callEnded', onCallEnded);
    socket.on('callAccepted', onCallAccepted);
    socket.on('ringing', onRinging);
    socket.on('remoteMuteStatus', onRemoteMuteStatus);
    socket.on('videoUpgradeRequest', onVideoUpgradeRequest);
    socket.on('videoUpgradeResponse', onVideoUpgradeResponse);

    return () => {
      // ✅ ATOMIC SAFETY CHECK: Always check if socket still exists before calling .off()
      const currentSocket = socketContext?.socketRef?.current;
      if (currentSocket) {
        currentSocket.off('callDeclined', onCallDeclined);
        currentSocket.off('callEnded', onCallEnded);
        currentSocket.off('callAccepted', onCallAccepted);
        currentSocket.off('ringing', onRinging);
        currentSocket.off('remoteMuteStatus', onRemoteMuteStatus);
        currentSocket.off('videoUpgradeRequest', onVideoUpgradeRequest);
        currentSocket.off('videoUpgradeResponse', onVideoUpgradeResponse);
      }
    };
  }, [socketContext]);

  const handleCallEnded = () => {
    if (!callEnded) {
      setCallEnded(true);
      setTimeout(() => endCall(), 1500);
    }
  };

  const endCall = async () => {
    try {
      await AsyncStorage.multiRemove(["callUrl", "partnerId", "partnerName", "roomId"]);
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
    if (controlsTimer.current) clearTimeout(controlsTimer.current);

    const toValue = controlsVisible._value === 0 ? 1 : 0;
    Animated.timing(controlsVisible, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (toValue === 1) {
      controlsTimer.current = setTimeout(() => {
        Animated.timing(controlsVisible, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 5000);
    }
  };

  const toggleSwap = () => {
    setIsSwapped(!isSwapped);
  };

  const toggleCamera = () => {
    const front = Camera.Constants?.Type?.front || "front";
    const back = Camera.Constants?.Type?.back || "back";
    setCameraType(cameraType === front ? back : front);
  };

  const renderLocalPreview = (style) => {
    if (hasPermission === false) return <View style={[style, {backgroundColor: '#333'}]}><Text style={{color: '#fff', textAlign: 'center'}}>No Camera</Text></View>;
    
    return (
      <Camera 
        style={style} 
        type={cameraType}
        ratio="16:9"
      />
    );
  };

  const renderRemotePreview = (style) => {
    if (Platform.OS === "web" && callUrl) {
      return (
        <View style={style}>
          {!iframeLoaded && (
            <View style={[StyleSheet.absoluteFill, styles.connectingOverlay]}>
              <Image source={partnerPic ? {uri: partnerPic} : require("../../assets/images/appIco.png")} style={styles.connectingAvatar} />
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.connectingText}>
                {isRinging ? "Ringing..." : "Establishing secure connection..."}
              </Text>
            </View>
          )}
          <iframe
            ref={iframeRef}
            src={callUrl}
            onLoad={() => setIframeLoaded(true)}
            style={StyleSheet.flatten([styles.iframe, { border: "none" }])}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            allowFullScreen
          />
        </View>
      );
    }
    
    // Improved Mobile/Native Fallback
    return (
      <View style={[style, styles.fallback]}>
        <SafeLinearGradient colors={["#1a1a1a", "#000"]} style={StyleSheet.absoluteFill} />
        <View style={styles.fallbackContent}>
          <View style={styles.avatarContainer}>
            <Image 
              source={partnerPic ? {uri: partnerPic} : require("../../assets/images/appIco.png")} 
              style={styles.connectingAvatarLarge} 
            />
            <ActivityIndicator size="large" color="#7B61FF" style={styles.loader} />
          </View>
          <Text style={styles.fallbackName}>{partnerName}</Text>
          <Text style={styles.fallbackStatus}>
            {loading ? (isRinging ? "Ringing..." : "Establishing connection...") : "In Conversation"}
          </Text>
          
          {callUrl && Platform.OS !== 'web' && (
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                // Logic to re-initialize or signal partner
                Alert.alert("Reconnecting", "Attempting to refresh the call stream...");
              }}
            >
              <Text style={styles.retryButtonText}>Refresh Connection</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container} onStartShouldSetResponder={() => { toggleControls(); return false; }}>
      {/* Main Full-Screen Video */}
      <View style={StyleSheet.absoluteFill}>
        {callType === "voice" ? (
          <View style={[styles.fullVideo, styles.voiceCallBackground]}>
            <SafeLinearGradient colors={["#1a1a1a", "#000"]} style={StyleSheet.absoluteFill} />
            <Image source={partnerPic ? {uri: partnerPic} : require("../../assets/images/appIco.png")} style={styles.voiceCallAvatar} />
            <Text style={styles.voiceCallStatus}>
              {loading ? (isRinging ? "Ringing..." : "Connecting...") : (isRemoteMuted ? "Partner Muted" : "Voice Call Ongoing")}
            </Text>
          </View>
        ) : (
          isSwapped ? renderLocalPreview(styles.fullVideo) : renderRemotePreview(styles.fullVideo)
        )}
        
        {/* Remote Mute Overlay (WhatsApp style) */}
        {isRemoteMuted && (
          <View style={styles.remoteMuteOverlay}>
            <View style={styles.remoteMuteBadge}>
              <Ionicons name="mic-off" size={24} color="#fff" />
              <Text style={styles.remoteMuteText}>{partnerName} is muted</Text>
            </View>
          </View>
        )}
      </View>

      {/* Mini-Preview Video (Draggable & Tappable to Swap) */}
      {callType === "video" && !isBusy && (
        <Animated.View 
          {...panResponder.panHandlers}
          style={[
            styles.miniPreviewContainer,
            {
              transform: pan.getTranslateTransform()
            }
          ]}
        >
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={toggleSwap}
            style={styles.miniPreviewShadow}
          >
            {isSwapped ? renderRemotePreview(styles.miniVideo) : renderLocalPreview(styles.miniVideo)}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Floating UI Overlays */}
      <Animated.View style={[styles.overlay, { opacity: controlsVisible }]}>
        {/* Header - Call Info */}
        <SafeAreaView style={styles.header}>
          <SafeLinearGradient colors={["rgba(0,0,0,0.6)", "transparent"]} style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={endCall} style={styles.miniBack}>
                <Ionicons name="chevron-down" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerNameText}>{partnerName}</Text>
                <View style={styles.timerRow}>
                  {isBusy ? (
                    <Text style={[styles.timerText, {color: '#FF3B30'}]}>Busy</Text>
                  ) : (
                    <>
                      <View style={styles.liveDot} />
                      <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
                      {isRemoteMuted && (
                        <View style={styles.muteIndicatorBadge}>
                          <Ionicons name="mic-off" size={12} color="#fff" />
                          <Text style={styles.muteIndicatorText}>Muted</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.securityIcon}>
                <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </SafeLinearGradient>
        </SafeAreaView>

        {/* Footer - Floating Controls */}
        <View style={styles.footer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={toggleMute} style={[styles.controlCircle, isMuted && styles.controlCircleActive]}>
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleCamera} style={styles.controlCircle}>
              <Ionicons name="camera-reverse" size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={endCall} style={styles.endCallCircle}>
              <MaterialIcons name="call-end" size={32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleVideo} style={[styles.controlCircle, (callType === 'voice' || !isVideoOn) && styles.controlCircleActive]}>
              <MaterialCommunityIcons name={callType === 'voice' ? 'video-plus' : (isVideoOn ? "video" : "video-off")} size={26} color="#fff" />
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
  fullVideo: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  miniPreviewContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 180,
    zIndex: 100,
  },
  miniPreviewShadow: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  miniVideo: {
    width: '100%',
    height: '100%',
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
  muteIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  muteIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  remoteMuteOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  remoteMuteBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  remoteMuteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  voiceCallBackground: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  voiceCallAvatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  voiceCallStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
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
  fallbackContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingAvatarLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(123, 97, 255, 0.5)',
  },
  loader: {
    position: 'absolute',
    width: 160,
    height: 160,
  },
  fallbackName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 40,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  connectingOverlay: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  connectingAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  connectingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
  },
});
