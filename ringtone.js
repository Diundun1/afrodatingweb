// ringtone.js
let audio;

export const startRingtone = () => {
  if (!audio) {
    audio = new Audio("/sounds/android_ringtone.mp3");
    audio.loop = true;
  }

  audio.play().catch((err) => {
    console.error("Playback failed:", err);
  });
};

export const stopRingtone = () => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
};
