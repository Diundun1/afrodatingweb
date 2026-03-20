import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform, Alert } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "../lib/SocketContext";
import CallKeepService from "../lib/CallKeepService";
import { Audio } from "expo-av";
import { startCallingTone, stopCallingTone } from "../../ringtone";

// WEBRTC CROSS-PLATFORM BINDINGS
let RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCView, mediaDevices;
if (Platform.OS !== "web") {
  const webrtc = require("react-native-webrtc");
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCView = webrtc.RTCView;
  mediaDevices = webrtc.mediaDevices;
} else {
  RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
  RTCIceCandidate = window.RTCIceCandidate;
  RTCSessionDescription = window.RTCSessionDescription;
  mediaDevices = navigator.mediaDevices;
}

const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function VideoCallScreen({ route }) {
  const navigation = useNavigation();
  const { socketRef } = useSocket();

  const [partnerName, setPartnerName] = useState("");
  const [partnerId, setPartnerId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // WebRTC references
  const pc = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Fallback context logic
  let useCall = () => ({ setInCall: () => {}, setParticipant: () => {} });
  try {
    const callContext = require("../lib/CallContext");
    if (callContext && callContext.useCall) useCall = callContext.useCall;
  } catch (e) {}
  const { setInCall, setParticipant } = useCall();

  useEffect(() => {
    const initCall = async () => {
      try {
        setLoading(true);
        const storedPartnerName = await AsyncStorage.getItem("partnerName");
        const storedPartnerId = await AsyncStorage.getItem("partnerId");
        const myId = socketRef?.current?.userId; // Custom hook might expose this, otherwise rely on auth
        
        if (!storedPartnerId) {
          navigation.goBack();
          return;
        }
        
        setPartnerName(storedPartnerName || "Partner");
        setPartnerId(storedPartnerId);
        setInCall(true);
        setParticipant(storedPartnerName || "Partner");

        if (Platform.OS !== "web") {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            playThroughEarpieceAndroid: true,
          });
        }

        const callerFlag = route?.params?.isCaller ?? false;
        if (callerFlag && Platform.OS === "web") startCallingTone();

        // 1. Setup local stream
        let stream;
        try {
          stream = await mediaDevices.getUserMedia({
            audio: true,
            video: { width: 1280, height: 720, facingMode: "user" }
          });
          setLocalStream(stream);
        } catch (err) {
          console.error("Mic/Cam Error:", err);
          Alert.alert("Permissions", "Camera/Mic access is required to make calls.");
          endCall();
          return;
        }

        // 2. Setup Peer Connection
        const peerConnection = new RTCPeerConnection(configuration);
        pc.current = peerConnection;

        // Add tracks
        if (Platform.OS === "web") {
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        } else {
            // react-native-webrtc API
            peerConnection.addStream(stream);
        }

        // Handle remote stream
        peerConnection.onaddstream = (event) => {
          console.log("Remote stream received");
          stopCallingTone();
          setRemoteStream(event.stream);
        };
        // For modern browsers adding track event mapping
        peerConnection.ontrack = (event) => {
           if (event.streams && event.streams[0]) {
               setRemoteStream(event.streams[0]);
           }
        };

        // Handle ICE Candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate && socketRef?.current && storedPartnerId) {
            socketRef.current.emit("signal", {
              to: storedPartnerId,
              from: myId,
              data: { type: "candidate", candidate: event.candidate }
            });
          }
        };

        // Caller initiates the offer
        if (callerFlag) {
          const offer = await peerConnection.createOffer({});
          await peerConnection.setLocalDescription(offer);
          socketRef.current.emit("signal", {
            to: storedPartnerId,
            from: myId,
            data: { type: "offer", sdp: offer.sdp }
          });
        }
        setLoading(false);
      } catch (e) {
        console.error("Init call error:", e);
        endCall();
      }
    };

    initCall();

    return () => endCall(false);
  }, []);

  // WebRTC Signaling Socket Listener
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !pc.current) return;

    const handleSignal = async ({ from, data }) => {
      // Ignore signals strictly not from our partner
      if (from !== partnerId && partnerId !== null) return;
      
      const peerConnection = pc.current;
      if (!peerConnection) return;

      try {
        if (data.type === "offer") {
            stopCallingTone();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("signal", {
              to: from,
              from: socket.userId,
              data: { type: "answer", sdp: answer.sdp }
            });
        } else if (data.type === "answer") {
            stopCallingTone();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
            console.log("✅ Remote description set successfully");
        } else if (data.type === "candidate") {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log("✅ Remote ICE candidate added");
        }
      } catch (err) {
        console.warn("Signaling Error", err);
      }
    };

    const handleRemoteCallEnded = () => {
      if (!callEnded) {
        console.log("📞 Remote user ended the call");
        stopCallingTone();
        setCallEnded(true);
        setTimeout(() => endCall(false), 2000);
      }
    };

    socket.on("signal", handleSignal);
    socket.on("call_ended", handleRemoteCallEnded);

    return () => {
      socket.off("signal", handleSignal);
      socket.off("call_ended", handleRemoteCallEnded);
    };
  }, [socketRef, callEnded, partnerId]);

  // Audio / Video Toggles
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMuted(!audioTracks[0].enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        setIsVideoOn(!videoTracks[0].enabled);
      }
    }
  };

  const toggleSpeaker = async () => {
    if (Platform.OS !== "web") {
      try {
        const newSpeakerState = !isSpeakerOn;
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: !newSpeakerState,
        });
        setIsSpeakerOn(newSpeakerState);
      } catch (e) {
        console.log("Failed to toggle speaker", e);
      }
    }
  };

  const endCall = async (notifyPartner = true) => {
    try {
      stopCallingTone();

      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
      
      const pid = partnerId || (await AsyncStorage.getItem("partnerId"));
      
      if (notifyPartner && pid && socketRef?.current) {
        socketRef.current.emit("call_ended", { recipientId: pid });
      }

      CallKeepService.endAllCalls();
      await AsyncStorage.multiRemove(["callUrl", "partnerId", "partnerName"]);
    } catch (e) {
      console.log("Error tearing down call", e);
    }
    setInCall(false);
    setParticipant("");
    navigation.goBack();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderVideo = () => {
    if (Platform.OS === "web") {
      // Create raw HTML5 Video tags for Web Fallback
      return (
        <View style={StyleSheet.absoluteFill}>
          <video
            autoPlay
            playsInline
            muted
            ref={ref => { if (ref) ref.srcObject = remoteStream || localStream; }}
            style={{ width: "100%", height: "100%", backgroundColor: "black", objectFit: "cover" }}
          />
        </View>
      );
    } else {
      return (
        <View style={StyleSheet.absoluteFill}>
          {remoteStream ? (
            <RTCView 
               streamURL={remoteStream.toURL()} 
               style={styles.iframe} 
               objectFit={"cover"} 
            />
          ) : localStream ? (
            <RTCView 
               streamURL={localStream.toURL()} 
               style={styles.iframe} 
               objectFit={"cover"} 
               mirror={true}
            />
          ) : (
            <View style={styles.mobileFallback}>
               <Text style={styles.loadingText}>Connecting Feed...</Text>
            </View>
          )}
        </View>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Ionicons name="videocam" size={60} color="#4169E1" />
        <Text style={styles.loadingText}>Setting up secure peer connection...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderVideo()}

      <View style={styles.controlsContainer}>
        {/* Top Bar */}
        <LinearGradient colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0)"]} style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={endCall}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.callInfo}>
            <Text style={styles.partnerName} numberOfLines={1} ellipsizeMode="tail">
              {partnerName}
            </Text>
            <Text style={styles.duration}>
              {callEnded ? "Call Ended" : formatTime(callDuration)}
            </Text>
          </View>
        </LinearGradient>

        {/* Bottom Controls */}
        <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]} style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted ? styles.controlButtonActive : styles.controlButtonInactive]}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color={isMuted ? "#000" : "#fff"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn ? styles.controlButtonActive : styles.controlButtonInactive]}
            onPress={toggleSpeaker}
          >
            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={26} color={isSpeakerOn ? "#000" : "#fff"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
            <MaterialIcons name="call-end" size={36} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, !isVideoOn ? styles.controlButtonActive : styles.controlButtonInactive]}
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
  bottomControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 40,
    gap: 15,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 55,
    height: 55,
    borderRadius: 27.5,
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
});
