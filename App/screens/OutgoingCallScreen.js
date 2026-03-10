import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Animated,
    Easing,
    Dimensions,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { startCallingTone, stopCallingTone } from "../../outboundRingtone";
import initializeSocket from "../lib/socket";

const { width, height } = Dimensions.get("window");

// Call state machine: calling → ringing → connected
const CALL_STATES = {
    CALLING: "calling",   // We sent the invite, waiting for recipient device to ring
    RINGING: "ringing",   // Recipient's device is ringing (callInvitationDelivered)
    CONNECTED: "connected", // Recipient accepted
    DECLINED: "declined",
    ENDED: "ended",
};

export default function OutgoingCallScreen({ route }) {
    const navigation = useNavigation();
    const {
        partnerName,
        partnerId,
        callUrl,
        room,
        callType: initialCallType = "video",
    } = route.params || {};

    const [callState, setCallState] = useState(CALL_STATES.CALLING);
    const [callType, setCallType] = useState(initialCallType);
    const [callDuration, setCallDuration] = useState(0);
    const [upgradeRequested, setUpgradeRequested] = useState(false); // video upgrade pending

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const socketRef = useRef(null);
    const callingToneStarted = useRef(false);
    const timerRef = useRef(null);
    const callEndedRef = useRef(false);

    // ── Animations ──────────────────────────────────────────────────────────────
    useEffect(() => {
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        // Pulse avatar
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.12,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // ── Calling tone ─────────────────────────────────────────────────────────────
    useEffect(() => {
        // Try immediate autoplay; fallback to first interaction
        const tryPlay = () => {
            if (callingToneStarted.current) return;
            try {
                startCallingTone();
                callingToneStarted.current = true;
                if (Platform.OS === "web") {
                    document.removeEventListener("click", tryPlay);
                    document.removeEventListener("touchstart", tryPlay);
                }
            } catch (_) {
                // blocked — will retry on interaction
            }
        };

        tryPlay();
        if (!callingToneStarted.current && Platform.OS === "web") {
            document.addEventListener("click", tryPlay, { once: true });
            document.addEventListener("touchstart", tryPlay, { once: true });
        }

        return () => {
            stopCallingTone();
            callingToneStarted.current = false;
        };
    }, []);

    // ── Socket: listen for recipient events ──────────────────────────────────────
    useEffect(() => {
        let socket = null;

        const setupSocket = async () => {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) return;

            socket = initializeSocket(
                "https://backend-afrodate-8q6k.onrender.com/messaging",
                token
            );
            socketRef.current = socket;

            // Recipient's device received the invitation → show "Ringing"
            socket.on("callInvitationDelivered", () => {
                setCallState(CALL_STATES.RINGING);
            });

            // Recipient accepted → stop tone, go to VideoCallScreen
            socket.on("callAccepted", (data) => {
                stopCallingTone();
                setCallState(CALL_STATES.CONNECTED);
                if (!callEndedRef.current) {
                    callEndedRef.current = true;
                    navigation.replace("VideoCallScreen", {
                        callUrl: data.callUrl || callUrl,
                        partnerId,
                        partnerName,
                        isCaller: true,
                        room,
                    });
                }
            });

            // Recipient declined
            socket.on("callDeclined", () => {
                stopCallingTone();
                setCallState(CALL_STATES.DECLINED);
                setTimeout(() => navigation.goBack(), 2000);
            });

            // Other party ended while ringing
            socket.on("callEnded", () => {
                handleEndCall();
            });

            // Recipient accepted a video upgrade
            socket.on("callUpgradeAccepted", () => {
                setUpgradeRequested(false);
                setCallType("video");
            });
        };

        setupSocket();

        // Timeout: if no answer in 60 seconds, end call
        const noAnswerTimeout = setTimeout(() => {
            if (callState === CALL_STATES.CALLING || callState === CALL_STATES.RINGING) {
                handleEndCall();
            }
        }, 60000);

        return () => {
            clearTimeout(noAnswerTimeout);
            clearInterval(timerRef.current);
            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
            }
        };
    }, []);

    // ── Call duration timer (when connected) ────────────────────────────────────
    useEffect(() => {
        if (callState === CALL_STATES.CONNECTED) {
            timerRef.current = setInterval(() => {
                setCallDuration((d) => d + 1);
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [callState]);

    // ── Actions ──────────────────────────────────────────────────────────────────
    const handleEndCall = async () => {
        if (callEndedRef.current) return;
        callEndedRef.current = true;
        stopCallingTone();

        // Notify partner
        if (socketRef.current?.connected) {
            socketRef.current.emit("callEnded", { room, recipientId: partnerId });
            socketRef.current.emit("callCancelled", { room, recipientId: partnerId });
        }

        await AsyncStorage.multiRemove(["callUrl", "partnerId", "partnerName", "callRoom"]);
        navigation.goBack();
    };

    const handleSwitchToVideo = () => {
        if (upgradeRequested || callType === "video") return;
        setUpgradeRequested(true);
        if (socketRef.current?.connected) {
            socketRef.current.emit("callUpgradeRequest", {
                room,
                recipientId: partnerId,
                upgradeType: "video",
            });
        }
    };

    const formatTime = (s) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    // ── Status label ─────────────────────────────────────────────────────────────
    const statusLabel = {
        [CALL_STATES.CALLING]: "Calling…",
        [CALL_STATES.RINGING]: "Ringing…",
        [CALL_STATES.CONNECTED]: formatTime(callDuration),
        [CALL_STATES.DECLINED]: "Call Declined",
        [CALL_STATES.ENDED]: "Call Ended",
    }[callState];

    return (
        <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.container}>
            {/* Decorative background rings */}
            <View style={styles.bgRings}>
                {[200, 280, 360].map((size, i) => (
                    <View
                        key={i}
                        style={[
                            styles.bgRing,
                            {
                                width: size,
                                height: size,
                                borderRadius: size / 2,
                                opacity: 0.06 - i * 0.015,
                            },
                        ]}
                    />
                ))}
            </View>

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <Animated.View
                        style={[styles.avatarOuter, { transform: [{ scale: pulseAnim }] }]}
                    >
                        <LinearGradient
                            colors={["#667eea", "#764ba2"]}
                            style={styles.avatarGradient}
                        >
                            <Image
                                source={require("../assets/images/appIco.png")}
                                style={styles.avatar}
                            />
                        </LinearGradient>
                    </Animated.View>

                    <Text style={styles.partnerName}>{partnerName || "Unknown"}</Text>

                    {/* Animated status dots */}
                    <StatusDots state={callState} />
                    <Text style={styles.statusLabel}>{statusLabel}</Text>

                    {callType === "voice" && (
                        <Text style={styles.callTypeLabel}>
                            <Ionicons name="call" size={13} color="rgba(255,255,255,0.5)" />{" "}
                            Voice call
                        </Text>
                    )}
                    {callType === "video" && (
                        <Text style={styles.callTypeLabel}>
                            <Ionicons name="videocam" size={13} color="rgba(255,255,255,0.5)" />{" "}
                            Video call
                        </Text>
                    )}
                </View>

                {/* Upgrade request badge */}
                {upgradeRequested && (
                    <View style={styles.upgradeBadge}>
                        <Ionicons name="videocam" size={14} color="#fff" />
                        <Text style={styles.upgradeBadgeText}>
                            Requesting video upgrade…
                        </Text>
                    </View>
                )}

                {/* Controls */}
                <View style={styles.controls}>
                    {/* Voice → Video upgrade button (only shown on voice calls) */}
                    {callType === "voice" && !upgradeRequested && (
                        <TouchableOpacity
                            style={styles.controlBtn}
                            onPress={handleSwitchToVideo}
                        >
                            <View style={styles.controlBtnInner}>
                                <Ionicons name="videocam" size={24} color="#fff" />
                            </View>
                            <Text style={styles.controlBtnLabel}>Switch to Video</Text>
                        </TouchableOpacity>
                    )}

                    {/* End call */}
                    <TouchableOpacity
                        style={[styles.controlBtn, styles.endBtn]}
                        onPress={handleEndCall}
                    >
                        <View style={[styles.controlBtnInner, styles.endBtnInner]}>
                            <MaterialIcons name="call-end" size={28} color="#fff" />
                        </View>
                        <Text style={styles.controlBtnLabel}>End</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </LinearGradient>
    );
}

// Animated "…" dots that pulse during calling/ringing
function StatusDots({ state }) {
    const dot1 = useRef(new Animated.Value(0.3)).current;
    const dot2 = useRef(new Animated.Value(0.3)).current;
    const dot3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        if (state !== CALL_STATES.CALLING && state !== CALL_STATES.RINGING) return;
        const anim = (dot, delay) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0.3,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );
        const a1 = anim(dot1, 0);
        const a2 = anim(dot2, 200);
        const a3 = anim(dot3, 400);
        a1.start();
        a2.start();
        a3.start();
        return () => {
            a1.stop?.();
            a2.stop?.();
            a3.stop?.();
        };
    }, [state]);

    if (state === CALL_STATES.CONNECTED) return null;

    return (
        <View style={styles.dots}>
            {[dot1, dot2, dot3].map((dot, i) => (
                <Animated.View
                    key={i}
                    style={[styles.dot, { opacity: dot }]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    bgRings: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    bgRing: {
        position: "absolute",
        borderWidth: 1,
        borderColor: "#fff",
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 80,
        paddingHorizontal: 24,
    },
    avatarSection: { alignItems: "center", marginTop: 40 },
    avatarOuter: {
        width: 150,
        height: 150,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 28,
    },
    avatarGradient: {
        width: 130,
        height: 130,
        borderRadius: 65,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#667eea",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 12,
    },
    avatar: { width: 100, height: 100, tintColor: "#fff" },
    partnerName: {
        color: "#fff",
        fontSize: 30,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
    },
    dots: {
        flexDirection: "row",
        gap: 6,
        marginTop: 12,
        marginBottom: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#4ecdc4",
    },
    statusLabel: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 16,
        fontWeight: "500",
        marginTop: 4,
    },
    callTypeLabel: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 13,
        marginTop: 8,
    },
    upgradeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(78,205,196,0.2)",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "rgba(78,205,196,0.4)",
    },
    upgradeBadgeText: { color: "#4ecdc4", fontSize: 13, fontWeight: "500" },
    controls: {
        flexDirection: "row",
        gap: 40,
        alignItems: "flex-end",
        paddingBottom: 20,
    },
    controlBtn: { alignItems: "center", gap: 8 },
    controlBtnInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    controlBtnLabel: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 13,
        fontWeight: "500",
    },
    endBtn: {},
    endBtnInner: {
        backgroundColor: "#EF4444",
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
});
