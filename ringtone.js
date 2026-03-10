// ringtone.js
// Plays the app's custom ringtone using the Web Audio API.
// The audio element is reused across calls to avoid double-play issues.

let audio = null;
let isPlaying = false;

export const startRingtone = () => {
  try {
    if (!audio) {
      audio = new Audio("/sounds/android_ringtone.mp3");
      audio.loop = true;
      audio.volume = 1.0;
    }

    if (isPlaying) return;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          isPlaying = true;
          console.log("🔔 Ringtone playing");
        })
        .catch((err) => {
          // NotAllowedError = browser autoplay block; caller must retry after gesture
          console.warn("🔇 Ringtone autoplay blocked:", err.name, err.message);
          isPlaying = false;
          // Re-throw so IncomingCallScreen knows to attach a gesture listener
          throw err;
        });
    }
  } catch (err) {
    console.error("startRingtone error:", err);
    throw err;
  }
};

export const stopRingtone = () => {
  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      isPlaying = false;
      console.log("🔕 Ringtone stopped");
    }
  } catch (err) {
    console.error("stopRingtone error:", err);
  }
};
