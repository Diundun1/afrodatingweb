import React, { useEffect, useRef } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { startRingtone, stopRingtone } from "../../ringtone";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export default function IncomingCallScreen({ route }) {
  const navigation = useNavigation();

  const { callerName, callUrl, callerId, room, callType } = route.params || {};

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const ringtoneStarted = useRef(false);

  // Start animations + ringtone as soon as the screen mounts
  useEffect(() => {
    startCallAnimations();
    attemptPlayRingtone();

    return () => {
      Vibration.cancel();
      stopRingtone();
      ringtoneStarted.current = false;
    };
  }, []);

  const startCallAnimations = () => {
    // Simulate phone vibration on incoming call
    Vibration.vibrate([500, 1000, 500, 1000], true);

    // Pulse animation for avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Slide up animation for buttons
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Browsers block autoplay without a prior user gesture.
  // This function tries to play immediately; if blocked it sets up a
  // one-time interaction listener that unlocks and plays on first tap/key.
  const attemptPlayRingtone = () => {
    if (ringtoneStarted.current) return;

    const tryPlay = () => {
      if (ringtoneStarted.current) return;
      try {
        startRingtone();
        ringtoneStarted.current = true;
        console.log("✅ Ringtone started");
        // Remove autoplay-unlock listeners once playing
        if (Platform.OS === "web") {
          document.removeEventListener("click", tryPlay);
          document.removeEventListener("touchstart", tryPlay);
          document.removeEventListener("keydown", tryPlay);
        }
      } catch (err) {
        console.error("Ringtone play failed:", err);
      }
    };

    // Attempt immediate play
    tryPlay();

    // Fallback: unlock on first user interaction (browser autoplay policy)
    if (!ringtoneStarted.current && Platform.OS === "web") {
      document.addEventListener("click", tryPlay, { once: true });
      document.addEventListener("touchstart", tryPlay, { once: true });
      document.addEventListener("keydown", tryPlay, { once: true });
    }
  };

  // const stopRingtone = async () => {
  //   try {
  //     if (soundRef.current) {
  //       console.log("Stopping ringtone...");
  //       await soundRef.current.stopAsync();
  //       await soundRef.current.unloadAsync();
  //       soundRef.current = null;
  //       console.log("Ringtone stopped");
  //     }
  //   } catch (err) {
  //     console.error("Error stopping ringtone:", err);
  //   }
  // };

  // Socket ref for signaling decline and listening for cancel
  const socketRef = useRef(null);

  useEffect(() => {
    let socket = null;
    const setupSocket = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        socket = initializeSocket("https://backend-afrodate-8q6k.onrender.com/messaging", token);
        socketRef.current = socket;

        // Listen for caller hanging up while ringing
        const handleRemoteCancel = () => {
          console.log("📞 Caller cancelled/ended call — stopping ringtone");
          stopRingtone();
          Vibration.cancel();
          navigation.goBack();
        };

        socket.on("callEnded", handleRemoteCancel);
        socket.on("callCancelled", handleRemoteCancel);
      }
    };
    setupSocket();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);


  const handleAccept = async () => {
    console.log("Accepting call...");
    Vibration.cancel();
    stopRingtone();

    // ⚡ IMMEDIATE SIGNALING: Notify caller right away so their UI transitions instantly
    if (socketRef.current && callerId) {
      socketRef.current.emit("callAccepted", {
        room: room,
        recipientId: callerId,
        callUrl: callUrl,
      });
      console.log("📤 Emitted callAccepted to caller (pre-navigation transition)");
    }

    // Persist room and caller-flag so VideoCallScreen knows its role
    await Promise.all([
      room ? AsyncStorage.setItem("callRoom", room) : Promise.resolve(),
      AsyncStorage.setItem("isCaller", "false"),
      AsyncStorage.setItem("callUrl", callUrl || ""),
      AsyncStorage.setItem("partnerId", callerId || ""),
      AsyncStorage.setItem("partnerName", callerName || "Partner"),
    ]);

    navigation.replace("VideoCallScreen", {
      callUrl,
      partnerId: callerId,
      isCaller: false,
    });
  };

  const handleDecline = async () => {
    console.log("Declining call...");
    Vibration.cancel();
    stopRingtone();

    // Notify caller that call was declined
    if (socketRef.current && callerId) {
      socketRef.current.emit("callDeclined", {
        room: room,
        recipientId: callerId,
      });
      console.log("📤 Emitted callDeclined to", callerId);
    }

    navigation.goBack();
  };


  return (
    <LinearGradient
      colors={["#1a1a2e", "#16213e", "#0f3460"]}
      style={styles.container}
    >
      {/* Background decorative elements */}
      <View style={styles.backgroundCircles}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <View style={styles.content}>
        {/* Caller Info Section */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              style={styles.avatarGradient}
            >
              <Image
                source={require("../../assets/images/appIco.png")}
                style={styles.avatar}
              />
            </LinearGradient>

            {/* Animated rings */}
            <View style={styles.ring} />
            <View style={[styles.ring, styles.ring2]} />
          </Animated.View>

          <Text style={styles.nameText}>{callerName || "Unknown Caller"}</Text>
          <Text style={styles.subtitle}>Incoming {callType === 'voice' ? 'Voice' : 'Video'} Call</Text>

          {/* Call status with animation */}
          <View style={styles.callStatus}>
            <View style={styles.pulseDot} />
            <Text style={styles.callStatusText}>Ringing...</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.buttonsContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={handleDecline}
          >
            <LinearGradient
              colors={["#ff6b6b", "#ee5a52"]}
              style={[styles.button, styles.decline]}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.buttonLabel}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonWrapper} onPress={handleAccept}>
            <LinearGradient
              colors={["#4ecdc4", "#44a08d"]}
              style={[styles.button, styles.accept]}
            >
              <Ionicons name="call" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.buttonLabel}>Accept</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundCircles: {
    position: "absolute",
    width: width,
    height: height,
  },
  circle: {
    position: "absolute",
    borderRadius: 500,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    bottom: 200,
    right: 50,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 80,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
  },
  avatarContainer: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    position: "relative",
  },
  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    tintColor: "#fff",
  },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "rgba(102, 126, 234, 0.3)",
    zIndex: -1,
  },
  ring2: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderColor: "rgba(102, 126, 234, 0.1)",
  },
  nameText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 18,
    marginBottom: 20,
    fontWeight: "500",
  },
  callStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ecdc4",
    marginRight: 8,
  },
  callStatusText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  debugText: {
    color: "#888",
    fontSize: 12,
    marginTop: 10,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 60,
    paddingHorizontal: 40,
  },
  buttonWrapper: {
    alignItems: "center",
    marginBottom: 100,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  decline: {
    shadowColor: "#ff6b6b",
  },
  accept: {
    shadowColor: "#4ecdc4",
  },
  buttonLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
});
