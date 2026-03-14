import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Vibration,
  Animated,
  Easing,
  Dimensions,
  Platform,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Icons from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import { startRingtone, stopRingtone } from "../../ringtone";
import { useSocket } from "../lib/SocketContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

// ✅ DEFENSIVE COMPONENT WRAPPERS
const Ionicons = Icons.Ionicons || (() => null);
const MaterialCommunityIcons = Icons.MaterialCommunityIcons || (() => null);
const SafeLinearGradient = LinearGradient || View;

export default function IncomingCallScreen({ route }) {
  const navigation = useNavigation();
  const socketContext = useSocket();
  const { callerName, callUrl, callerId, room, callType, profilePic } = route.params || {};
  
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const soundRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Default avatar if none provided
  const avatarSource = profilePic ? { uri: profilePic } : require("../../assets/images/appIco.png");

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        setIsAudioReady(true);
      } catch (error) {
        console.error("Error setting up audio:", error);
      }
    };

    setupAudio();
    startCallAnimations();

    return () => {
      Vibration.cancel();
      stopRingtone();
    };
  }, []);

  useEffect(() => {
    if (isAudioReady) {
      playRingtone();
    }
  }, [isAudioReady]);

  const startCallAnimations = () => {
    Vibration.vibrate([1000, 1000, 1000], true);

    // Pulse animation for avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Fade in and slide up
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const playRingtone = async () => {
    try {
      await stopRingtone();
      
      // Notify caller that we are ringing
      if (socketContext?.emit && callerId) {
        socketContext.emit("ringing", { to: callerId, room: room });
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: "https://unigate.com.ng/ringtones/ringtone.mp3" },
        { isLooping: true, volume: 1.0, shouldPlay: true }
      );
      soundRef.current = sound;
    } catch (err) {
      console.error("Error playing ringtone:", err);
      // Fallback to vibration only if audio fails
      Vibration.vibrate([500, 500], true);
    }
  };

  const handleAccept = async () => {
    if (isJoining) return;
    setIsJoining(true);
    
    Vibration.cancel();
    stopRingtone();
    
    // Store data for persistence
    await Promise.all([
      AsyncStorage.setItem("callUrl", callUrl || ""),
      AsyncStorage.setItem("partnerId", callerId || ""),
      AsyncStorage.setItem("partnerName", callerName || ""),
      AsyncStorage.setItem("roomId", room || ""),
    ]);

    // ✅ EMIT ACCEPT CALL TO BACKEND
    if (socketContext?.emit && callerId) {
      socketContext.emit("acceptCall", { to: callerId, room: room });
    }

    navigation.replace("VideoCallScreen", {
      callUrl,
      partnerId: callerId,
      partnerName: callerName,
      partnerPic: profilePic,
      isCaller: false,
      room: room,
      callType: callType || "video",
    });
  };

  const handleDecline = async () => {
    Vibration.cancel();
    stopRingtone();
    
    if (socketContext?.emit && callerId) {
      socketContext.emit("declineCall", { to: callerId, room: room });
    }
    
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Background Image with Overlay */}
      <ImageBackground 
        source={avatarSource} 
        style={StyleSheet.absoluteFill}
        blurRadius={Platform.OS === 'ios' ? 20 : 10}
      >
        <SafeLinearGradient
          colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <Animated.View style={[styles.content, { opacity: opacityAnim }]}>
        {/* Top Section - Caller Info */}
        <View style={styles.topSection}>
          <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.avatarBorder}>
              <Image source={avatarSource} style={styles.avatar} />
            </View>
            <View style={styles.pulseRing} />
          </Animated.View>
          
          <Text style={styles.callerName}>{callerName || "Someone Special"}</Text>
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons name="video" size={16} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.incomingText}>INCOMING VIDEO CALL</Text>
          </View>
        </View>

        {/* Bottom Section - Actions */}
        <Animated.View style={[styles.bottomSection, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.actionContainer}>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={handleDecline}
                style={[styles.actionButton, styles.declineButton]}
              >
                <Ionicons name="close" size={36} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.buttonLabel}>Decline</Text>
            </View>

            <View style={styles.buttonWrapper}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={handleAccept}
                style={[styles.actionButton, styles.acceptButton]}
              >
                {isJoining ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <Ionicons name="call" size={32} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={styles.buttonLabel}>{isJoining ? "Joining..." : "Accept"}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.messageAction}>
            <Ionicons name="chatbubble-outline" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.messageText}>Reply with message</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 80,
    alignItems: "center",
  },
  topSection: {
    alignItems: "center",
    marginTop: 40,
  },
  avatarWrapper: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  avatarBorder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.3)",
    padding: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 2,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 66,
  },
  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 1,
  },
  callerName: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  incomingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  buttonWrapper: {
    alignItems: "center",
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  declineButton: {
    backgroundColor: "#FF3B30",
  },
  acceptButton: {
    backgroundColor: "#34C759",
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  messageAction: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  messageText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    marginLeft: 8,
  },
});
