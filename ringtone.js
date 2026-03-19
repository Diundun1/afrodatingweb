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

// Outgoing call tone — WhatsApp-style repeating beep using Web Audio API
let callingAudioCtx = null;
let callingIntervalId = null;

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

export const startCallingTone = () => {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;

  stopCallingTone(); // clear any existing

  try {
    callingAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    playBeep(callingAudioCtx);
    // repeat every 3 seconds like WhatsApp outgoing call
    callingIntervalId = setInterval(() => {
      if (callingAudioCtx) playBeep(callingAudioCtx);
    }, 3000);
  } catch (err) {
    console.error("Calling tone failed:", err);
  }
};

export const stopCallingTone = () => {
  if (callingIntervalId) {
    clearInterval(callingIntervalId);
    callingIntervalId = null;
  }
  if (callingAudioCtx) {
    callingAudioCtx.close().catch(() => { });
    callingAudioCtx = null;
  }
};
