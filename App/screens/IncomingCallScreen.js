import React, { useEffect, useRef, useState } from "react";
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
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSocket } from "../lib/SocketContext";
import { startRingtone, stopRingtone } from "../../ringtone";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export default function IncomingCallScreen({ route }) {
  const navigation = useNavigation();
  const socketContext = useSocket();
  const {
    callerName = "Unknown",
    callerId,
    callUrl,
    room,
    callType = "video",
    profilePic,
  } = route.params || {};

  const [answered, setAnswered] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringPulse1 = useRef(new Animated.Value(0.4)).current;
  const ringPulse2 = useRef(new Animated.Value(0.3)).current;

  const avatarSource = profilePic
    ? { uri: profilePic }
    : require("../../assets/images/appIco.png");

  // ─── Entry animations ─────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─── Avatar pulse ─────────────────────────────────────────
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // ─── Ring pulse animations ────────────────────────────────
  useEffect(() => {
    const ring1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse1, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse1, {
          toValue: 0.4,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    const ring2 = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(ringPulse2, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse2, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    ring1.start();
    ring2.start();
    return () => {
      ring1.stop();
      ring2.stop();
    };
  }, []);

  // ─── Ringtone + vibration ─────────────────────────────────
  useEffect(() => {
    startRingtone();
    if (Platform.OS !== "web") {
      Vibration.vibrate([1000, 1000], true);
    }
    return () => {
      stopRingtone();
      Vibration.cancel();
    };
  }, []);

  // ─── Emit ringing signal to caller ────────────────────────
  useEffect(() => {
    if (socketContext?.emit && callerId && room) {
      socketContext.emit("ringing", { to: callerId, room });
    }
  }, []);

  // ─── Listen for caller cancelling / timeout ───────────────
  useEffect(() => {
    const socket = socketContext?.socketRef?.current;
    if (!socket) return;

    const onCallCancelled = () => {
      stopRingtone();
      Vibration.cancel();
      if (navigation.canGoBack()) navigation.goBack();
    };

    socket.on("callEnded", onCallCancelled);
    socket.on("callTimeout", onCallCancelled);

    return () => {
      socket.off("callEnded", onCallCancelled);
      socket.off("callTimeout", onCallCancelled);
    };
  }, [socketContext, navigation]);

  // ─── Cleanup helper ───────────────────────────────────────
  const cleanup = () => {
    stopRingtone();
    Vibration.cancel();
  };

  // ─── Accept call ──────────────────────────────────────────
  const handleAccept = async () => {
    if (answered) return;
    setAnswered(true);
    cleanup();

    try {
      await Promise.all([
        AsyncStorage.setItem("callUrl", callUrl || ""),
        AsyncStorage.setItem("partnerId", callerId || ""),
        AsyncStorage.setItem("partnerName", callerName || ""),
        AsyncStorage.setItem("roomId", room || ""),
      ]);
    } catch (e) {}

    if (socketContext?.emit && callerId) {
      socketContext.emit("acceptCall", { to: callerId, room });
    }

    navigation.replace("VideoCallScreen", {
      callUrl,
      partnerId: callerId,
      partnerName: callerName,
      partnerPic: profilePic,
      isCaller: false,
      room,
      callType: callType || "video",
    });
  };

  // ─── Decline call ─────────────────────────────────────────
  const handleDecline = () => {
    if (answered) return;
    setAnswered(true);
    cleanup();

    if (socketContext?.emit && callerId) {
      socketContext.emit("declineCall", { to: callerId, room });
    }

    if (navigation.canGoBack()) navigation.goBack();
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a0a2e", "#16213e", "#0f0f1a"]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Call type badge */}
        <View style={styles.typeBadge}>
          <Ionicons
            name={callType === "voice" ? "call" : "videocam"}
            size={14}
            color="rgba(255,255,255,0.9)"
          />
          <Text style={styles.typeBadgeText}>
            {callType === "voice" ? "Voice Call" : "Video Call"}
          </Text>
        </View>

        {/* Avatar with pulse rings */}
        <View style={styles.avatarSection}>
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRingOuter,
              { opacity: ringPulse2, transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRingInner,
              { opacity: ringPulse1, transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Image source={avatarSource} style={styles.avatar} />
          </Animated.View>
        </View>

        {/* Caller info */}
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callLabel}>
          Incoming {callType === "voice" ? "voice" : "video"} call
        </Text>

        {/* Action buttons */}
        <Animated.View
          style={[
            styles.actionsRow,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.declineBtn]}
              onPress={handleDecline}
              activeOpacity={0.8}
              disabled={answered}
            >
              <MaterialIcons name="call-end" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Decline</Text>
          </View>

          <View style={styles.actionCol}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={handleAccept}
              activeOpacity={0.8}
              disabled={answered}
            >
              <Ionicons
                name={callType === "voice" ? "call" : "videocam"}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 48,
    gap: 6,
  },
  typeBadgeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  avatarSection: {
    width: 170,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  pulseRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
  },
  pulseRingOuter: {
    width: 170,
    height: 170,
    borderColor: "rgba(108,92,231,0.3)",
  },
  pulseRingInner: {
    width: 150,
    height: 150,
    borderColor: "rgba(108,92,231,0.5)",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(108,92,231,0.6)",
  },
  callerName: {
    fontSize: 30,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  callLabel: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 80,
    letterSpacing: 0.3,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 64,
  },
  actionCol: {
    alignItems: "center",
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  declineBtn: {
    backgroundColor: "#FF4757",
  },
  acceptBtn: {
    backgroundColor: "#2ED573",
  },
  actionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 10,
  },
});
