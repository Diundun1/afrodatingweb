/**
 * ringtone.js
 * Platform-aware audio for ringtones and calling tones.
 * - Web (PWA): uses Web Audio API + HTMLAudioElement (no native deps)
 * - Native (iOS/Android): uses expo-audio
 */
import { Platform } from "react-native";

// ─── NATIVE AUDIO PLAYER (expo-audio) ────────────────────────────────────────
let nativePlayer = null;

const getNativeAudio = async () => {
  if (Platform.OS === "web") return null;
  try {
    const { useAudioPlayer, setAudioModeAsync } = await import("expo-audio");
    return { useAudioPlayer, setAudioModeAsync };
  } catch (e) {
    console.warn("expo-audio not available:", e);
    return null;
  }
};

// ─── INCOMING RINGTONE ────────────────────────────────────────────────────────

// Web: HTMLAudioElement
let webRingtoneAudio = null;

export const startRingtone = async () => {
  if (Platform.OS === "web") {
    // Web — use HTMLAudioElement
    if (!webRingtoneAudio) {
      webRingtoneAudio = new Audio("/sounds/android_ringtone.mp3");
      webRingtoneAudio.loop = true;
    }
    webRingtoneAudio.play().catch((err) =>
      console.warn("Web ringtone playback failed:", err),
    );
    return;
  }

  // Native — use expo-audio
  try {
    const { AudioPlayer, setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
    nativePlayer = new AudioPlayer(
      { uri: "https://unigate.com.ng/ringtones/ringtone.mp3" },
      100,
    );
    nativePlayer.loop = true;
    nativePlayer.play();
  } catch (err) {
    console.warn("Native ringtone failed:", err);
  }
};

export const stopRingtone = async () => {
  if (Platform.OS === "web") {
    if (webRingtoneAudio) {
      webRingtoneAudio.pause();
      webRingtoneAudio.currentTime = 0;
    }
    return;
  }

  // Native
  try {
    if (nativePlayer) {
      nativePlayer.pause();
      nativePlayer.remove();
      nativePlayer = null;
    }
  } catch (err) {
    console.warn("Error stopping native ringtone:", err);
  }
};

// ─── OUTGOING CALLING TONE (Web Audio API beep — web only) ───────────────────
let callingAudioCtx = null;
let callingIntervalId = null;
let nativeCallingPlayer = null;

const playBeep = (ctx) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, ctx.currentTime);
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.4);
};

export const startCallingTone = async () => {
  if (Platform.OS === "web") {
    if (typeof AudioContext === "undefined" && typeof window === "undefined")
      return;
    stopCallingTone();
    try {
      callingAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      playBeep(callingAudioCtx);
      callingIntervalId = setInterval(() => {
        if (callingAudioCtx) playBeep(callingAudioCtx);
      }, 3000);
    } catch (err) {
      console.warn("Calling tone failed:", err);
    }
    return;
  }

  // Native — reuse ringtone file as calling tone
  try {
    const { AudioPlayer, setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
    nativeCallingPlayer = new AudioPlayer(
      { uri: "https://unigate.com.ng/ringtones/ringtone.mp3" },
      100,
    );
    nativeCallingPlayer.loop = true;
    nativeCallingPlayer.play();
  } catch (err) {
    console.warn("Native calling tone failed:", err);
  }
};

export const stopCallingTone = async () => {
  if (Platform.OS === "web") {
    if (callingIntervalId) {
      clearInterval(callingIntervalId);
      callingIntervalId = null;
    }
    if (callingAudioCtx) {
      callingAudioCtx.close().catch(() => { });
      callingAudioCtx = null;
    }
    return;
  }

  // Native
  try {
    if (nativeCallingPlayer) {
      nativeCallingPlayer.pause();
      nativeCallingPlayer.remove();
      nativeCallingPlayer = null;
    }
  } catch (err) {
    console.warn("Error stopping native calling tone:", err);
  }
};
