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
import { useSocket } from "../lib/SocketContext";
import { startRingtone, stopRingtone } from "../../ringtone";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

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
    startRingtone().catch(err => console.warn("Ringtone error:", err));
    ringtoneStarted.current = true;

    // ⚡ AUTO-ANSWER from notification
    if (route.params?.autoAnswer) {
      console.log("⚡ Auto-answering call as requested by notification");
      handleAccept();
    }

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

  const { socket, answerCall, declineCall } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for caller hanging up while ringing
    const handleRemoteCancel = () => {
      console.log("📞 Caller cancelled/ended call — stopping ringtone");
      stopRingtone();
      Vibration.cancel();
      navigation.goBack();
    };

    socket.on("callEnded", handleRemoteCancel);
    socket.on("callCancelled", handleRemoteCancel);

    return () => {
      socket.off("callEnded", handleRemoteCancel);
      socket.off("callCancelled", handleRemoteCancel);
    };
  }, [socket]);


  const handleAccept = async () => {
    console.log("Accepting call...");
    Vibration.cancel();
    stopRingtone();

    // ⚡ CENTRALIZED SIGNALING
    answerCall({ room, recipientId: callerId, callUrl });

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

    // ⚡ CENTRALIZED SIGNALING
    declineCall({ room, recipientId: callerId });

    navigation.goBack();
  };


  return (
    <View style={styles.container}>
      {/* Blurred Background with Potential Image */}
      <Image
        source={require("../../assets/images/appIco.png")}
        style={StyleSheet.absoluteFillObject}
        blurRadius={Platform.OS === 'ios' ? 0 : 20}
      />
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="dark" />
      )}
      <LinearGradient
        colors={["rgba(26,26,46,0.6)", "rgba(15,52,96,0.9)"]}
        style={StyleSheet.absoluteFillObject}
      />

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
            <View style={styles.avatarWrapper}>
              <Image
                source={require("../../assets/images/appIco.png")}
                style={styles.avatarMain}
              />
            </View>

            {/* Pulsing rings */}
            <View style={styles.ring} />
            <View style={[styles.ring, styles.ring2]} />
          </Animated.View>

          <Text style={styles.nameText}>{callerName || "Someone New"}</Text>
          <Text style={styles.subtitle}>Incoming {callType === 'voice' ? 'Voice' : 'Video'} Call</Text>

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
          <View style={styles.buttonCol}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDecline}
            >
              <Ionicons name="close-outline" size={38} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Decline</Text>
          </View>

          <View style={styles.buttonCol}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Ionicons name="call" size={34} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Accept</Text>
          </View>
        </Animated.View>
      </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 100,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  avatarContainer: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 3,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  avatarMain: {
    width: "100%",
    height: "100%",
    borderRadius: 67,
  },
  ring: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  ring2: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderColor: "rgba(255,255,255,0.1)",
  },
  nameText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 19,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  callStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ecdc4",
    marginRight: 8,
  },
  callStatusText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonsContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  buttonCol: {
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: "#FF3B30",
  },
  acceptButton: {
    backgroundColor: "#34C759",
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
