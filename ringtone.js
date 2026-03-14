// ringtone.js — WhatsApp-like call audio management
let audio = null;

export const startRingtone = () => {
  stopRingtone();
  try {
    audio = new Audio("/sounds/android_ringtone.mp3");
    audio.loop = true;
    audio.play().catch(() => {});
  } catch (e) {
    console.warn("Ringtone init failed:", e);
  }
};

export const stopRingtone = () => {
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio = null;
    }
  } catch (e) {}
};
