/**
 * outboundRingtone.js
 *
 * Generates a "tum tum" calling tone programmatically using the Web Audio API.
 * This avoids any dependency on a specific audio file and plays the classic
 * double-beep calling sound (like a UK/international dial tone).
 *
 * Pattern:  tum (0.4s) → silence (0.2s) → tum (0.4s) → silence (1.2s) → repeat
 */

let audioCtx = null;
let intervalId = null;
let isPlaying = false;

/**
 * Play one "tum" beep at the given time offset.
 * Uses a sine wave at ~440Hz with a smooth envelope to sound natural.
 */
function playBeep(ctx, startTime, duration = 0.4) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, startTime); // Concert A — classic ring tone

    // Smooth attack/release envelope so it doesn't click
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.35, startTime + 0.03);   // attack
    gainNode.gain.setValueAtTime(0.35, startTime + duration - 0.04); // sustain
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);   // release

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

/**
 * Schedule one full "tum tum" cycle starting at `ctx.currentTime`.
 * Returns the total duration of the cycle so the interval can be set correctly.
 */
function scheduleTumTum(ctx) {
    const now = ctx.currentTime;
    playBeep(ctx, now, 0.4);           // tum
    playBeep(ctx, now + 0.6, 0.4);    // tum (after 0.2s gap)
    // 1.2s silence follows → total cycle = 0.6 + 0.4 + 1.2 = 2.2s
    return 2200; // ms
}

export const startCallingTone = () => {
    if (isPlaying) return;

    try {
        // Create AudioContext lazily (requires a user gesture on many browsers,
        // but OutgoingCallScreen always starts after a user tap on the call button)
        if (!audioCtx || audioCtx.state === "closed") {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        isPlaying = true;
        console.log("📞 Calling tone started (tum tum)");

        // Play immediately, then repeat every 2.2s
        const cycleMs = scheduleTumTum(audioCtx);
        intervalId = setInterval(() => {
            if (audioCtx && audioCtx.state !== "closed") {
                scheduleTumTum(audioCtx);
            }
        }, cycleMs);
    } catch (err) {
        console.warn("startCallingTone error:", err);
        isPlaying = false;
    }
};

export const stopCallingTone = () => {
    try {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (audioCtx && audioCtx.state !== "closed") {
            audioCtx.close();
            audioCtx = null;
        }
        isPlaying = false;
        console.log("📞 Calling tone stopped");
    } catch (err) {
        console.warn("stopCallingTone error:", err);
    }
};
