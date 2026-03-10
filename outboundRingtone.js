// outboundRingtone.js
// Plays the outbound "calling" tone (the sound the CALLER hears while waiting)
let callingAudio = null;
let isCallingPlaying = false;

export const startCallingTone = () => {
    try {
        if (!callingAudio) {
            // Use a softer repeating tone for the caller side
            callingAudio = new Audio("/sounds/calling_tone.mp3");
            callingAudio.loop = true;
            callingAudio.volume = 0.8;
        }

        if (isCallingPlaying) return;

        const playPromise = callingAudio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    isCallingPlaying = true;
                    console.log("📞 Calling tone started");
                })
                .catch((err) => {
                    console.warn("Calling tone autoplay blocked:", err.message);
                    isCallingPlaying = false;
                });
        }
    } catch (err) {
        console.error("startCallingTone error:", err);
    }
};

export const stopCallingTone = () => {
    try {
        if (callingAudio) {
            callingAudio.pause();
            callingAudio.currentTime = 0;
            isCallingPlaying = false;
            console.log("📞 Calling tone stopped");
        }
    } catch (err) {
        console.error("stopCallingTone error:", err);
    }
};
