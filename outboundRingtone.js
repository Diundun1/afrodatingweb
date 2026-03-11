/**
 * outboundRingtone.js
 *
 * Plays the "calling tone" (the sound the caller hears while waiting)
 * Pattern: calling_tone.mp3
 * Supports both Web and Native (iOS/Android via expo-av)
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let webAudio = null;
let nativeSound = null;
let isPlaying = false;

// Assets for native must be required
const nativeAsset = require('./App/assets/audio/calling_tone.mp3');

export const startCallingTone = async () => {
    if (isPlaying) return;

    try {
        if (Platform.OS === 'web') {
            if (!webAudio) {
                webAudio = new window.Audio('/sounds/calling_tone.mp3');
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
        console.log("📞 Outgoing calling tone started (calling_tone.mp3)");
    } catch (err) {
        console.warn("startCallingTone error:", err);
        isPlaying = false;
    }
};

export const stopCallingTone = async () => {
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
        console.log("📞 Outgoing calling tone stopped");
    } catch (err) {
        console.warn("stopCallingTone error:", err);
    }
};
