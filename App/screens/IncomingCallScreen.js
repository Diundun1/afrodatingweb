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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";

const { width, height } = Dimensions.get("window");

export default function IncomingCallScreen({ route }) {
  const navigation = useNavigation();

  const { callerName, callUrl, callerId, room, callType } = route.params || {};
  const [vibrating, setVibrating] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const soundRef = useRef(null);

  const pulseAnim = new Animated.Value(1);
  const slideAnim = new Animated.Value(100);

  // Initialize audio system
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
        console.log("Audio system ready");
      } catch (error) {
        console.error("Error setting up audio:", error);
      }
    };

    setupAudio();

    return () => {
      stopRingtone();
    };
  }, []);

  useEffect(() => {
    // Start call animations and ringtone
    startCallAnimations();
    playRingtone();

    return () => {
      Vibration.cancel();
      stopRingtone();
      setVibrating(false);
    };
  }, [isAudioReady]);

  const startCallAnimations = () => {
    // Simulate phone vibration on incoming call
    Vibration.vibrate([500, 1000, 500, 1000], true);
    setVibrating(true);

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
      ])
    ).start();

    // Slide up animation for buttons
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const playRingtone = async () => {
    try {
      // Stop any existing ringtone first
      await stopRingtone();

      if (!isAudioReady) {
        console.log("Audio not ready yet, retrying in 100ms");
        setTimeout(playRingtone, 100);
        return;
      }

      console.log("Playing ringtone for incoming call...");

      const { sound } = await Audio.Sound.createAsync(
        require("/assets/audio/ringtone.mp3"),
        {
          isLooping: true,
          volume: 1.0,
          shouldPlay: true,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      await sound.playAsync();
      console.log("Ringtone started successfully");
    } catch (err) {
      console.error("Error playing ringtone:", err);
      // Retry after a short delay
      setTimeout(playRingtone, 500);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error(`Playback error: ${status.error}`);
      }
    } else {
      console.log("Ringtone playback status:", status);
    }
  };

  const stopRingtone = async () => {
    try {
      if (soundRef.current) {
        console.log("Stopping ringtone...");
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        console.log("Ringtone stopped");
      }
    } catch (err) {
      console.error("Error stopping ringtone:", err);
    }
  };

  const handleAccept = async () => {
    console.log("Accepting call...");
    Vibration.cancel();
    await stopRingtone();

    navigation.replace("VideoCallScreen", {
      callUrl,
      partnerId: callerId,
      isCaller: false,
    });
  };

  const handleDecline = async () => {
    console.log("Declining call...");
    Vibration.cancel();
    await stopRingtone();
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={["#1a1a2e", "#16213e", "#0f3460"]}
      style={styles.container}>
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
            ]}>
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              style={styles.avatarGradient}>
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
          <Text style={styles.subtitle}>Incoming Call </Text>

          {/* Call status with animation */}
          <View style={styles.callStatus}>
            <View style={styles.pulseDot} />
            <Text style={styles.callStatusText}>Calling...</Text>
          </View>

          {/* Audio status for debugging */}
          <Text style={styles.debugText}>
            Audio: {isAudioReady ? "Ready" : "Loading..."}
          </Text>
        </View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.buttonsContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={handleDecline}>
            <LinearGradient
              colors={["#ff6b6b", "#ee5a52"]}
              style={[styles.button, styles.decline]}>
              <Ionicons name="close" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.buttonLabel}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonWrapper} onPress={handleAccept}>
            <LinearGradient
              colors={["#4ecdc4", "#44a08d"]}
              style={[styles.button, styles.accept]}>
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
