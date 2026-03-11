// ringtone.js
// Plays the app's custom ringtone (android_ringtone.mp3)
// Supports both Web and Native (iOS/Android via expo-av)

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let webAudio = null;
let nativeSound = null;
let isPlaying = false;

// Assets for native must be required
const nativeAsset = require('./App/assets/audio/android_ringtone.mp3');

export const startRingtone = async () => {
  if (isPlaying) return;

  try {
    if (Platform.OS === 'web') {
      if (!webAudio) {
        webAudio = new window.Audio('/sounds/android_ringtone.mp3');
        webAudio.loop = true;
      }
      await webAudio.play();
    } else {
      // Native (Android/iOS)
      if (nativeSound) {
        await nativeSound.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        nativeAsset,
        { shouldPlay: true, isLooping: true }
      );
      nativeSound = sound;
    }
    isPlaying = true;
    console.log("🔔 Ringtone started (android_ringtone.mp3)");
  } catch (err) {
    console.error("startRingtone error:", err);
    isPlaying = false;
    throw err;
  }
};

export const stopRingtone = async () => {
  try {
    if (Platform.OS === 'web') {
      if (webAudio) {
        webAudio.pause();
        webAudio.currentTime = 0;
      }
    } else {
      if (nativeSound) {
        await nativeSound.stopAsync();
        await nativeSound.unloadAsync();
        nativeSound = null;
      }
    }
    isPlaying = false;
    console.log("🔕 Ringtone stopped");
  } catch (err) {
    console.error("stopRingtone error:", err);
  }
};
