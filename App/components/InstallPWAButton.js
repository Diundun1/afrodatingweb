import React, { useState, useEffect } from "react";
import Constants from "expo-constants";

const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installReason, setInstallReason] = useState("");
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const getAppType = () => {
    if (Constants.appOwnership === "standalone") return "standalone-app";
    if (Constants.appOwnership === "expo") return "expo-go";
    return "web-pwa";
  };

  // Check if already running as PWA
  const isRunningAsPWA = () => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.navigator.standalone
    );
  };

  // Check if browser supports PWA installation
  const isPWAInstallSupported = () => {
    return "BeforeInstallPromptEvent" in window;
  };

  // Check if user is on iOS
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  // Check if user is on Safari (for iOS specific behavior)
  const isSafari = () => {
    return (
      /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    );
  };

  const shouldShowInstallPrompt = () => {
    if (typeof window === "undefined") return false;

    // Check if already installed as PWA
    if (isRunningAsPWA()) {
      setInstallReason("Already running as PWA");
      return false;
    }

    // Check if user recently dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed =
        (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed <= 7) {
        setInstallReason("User recently dismissed");
        return false;
      }
    }

    // For iOS Safari, we'll show custom instructions instead of the standard PWA prompt
    if (isIOS() && isSafari()) {
      setInstallReason("Install our app for the best experience on iOS");
      return true;
    }

    // Check if browser supports PWA installation
    if (!isPWAInstallSupported()) {
      setInstallReason("Browser doesn't support PWA installation");
      return false;
    }

    setInstallReason("Ready to show install prompt");
    return true;
  };

  useEffect(() => {
    const appType = getAppType();
    console.log("📱 App type:", appType);

    // Debug PWA requirements
    console.log("🔍 PWA Requirements Check:", {
      hasServiceWorker: "serviceWorker" in navigator,
      serviceWorkerController: !!navigator.serviceWorker?.controller,
      beforeInstallPrompt: "BeforeInstallPromptEvent" in window,
      isHTTPS: window.location.protocol === "https:",
      hasManifest: document.querySelector('link[rel="manifest"]') !== null,
      isPWA: isRunningAsPWA(),
      isIOS: isIOS(),
      isSafari: isSafari(),
    });

    // Check service worker status
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      console.log("✅ Service Worker is active and controlling the page");
    } else {
      console.log("❌ Service Worker is NOT controlling the page");
    }

    // Don't show for native apps or if already PWA
    if (
      appType === "standalone-app" ||
      appType === "expo-go" ||
      isRunningAsPWA()
    ) {
      console.log("🚫 Native app or PWA - hiding install");
      setShowInstall(false);
      return;
    }

    console.log("🌐 Web environment - setting up install");

    if (shouldShowInstallPrompt()) {
      console.log("⏳ Waiting for install prompt...");

      // For iOS Safari, show instructions immediately
      if (isIOS() && isSafari()) {
        console.log("🍎 iOS Safari detected - showing custom instructions");
        setShowInstall(true);
        return;
      }

      const handleBeforeInstallPrompt = (e) => {
        console.log("🎯 beforeinstallprompt event fired!");
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstall(true);
        setInstallReason("Install our app for the best experience");
      };

      const handleAppInstalled = () => {
        console.log("✅ PWA installed");
        setShowInstall(false);
        setDeferredPrompt(null);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      // For browsers that support PWA but don't fire beforeinstallprompt immediately
      // Show the install button directly if we know PWA is supported
      const quickShowTimer = setTimeout(() => {
        if (isPWAInstallSupported() && !showInstall && !isIOS()) {
          console.log("⚡ Quick showing install - browser supports PWA");
          setShowInstall(true);
          setInstallReason("Install our app for the best experience");
        }
      }, 1000); // Only wait 1 second

      return () => {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt
        );
        window.removeEventListener("appinstalled", handleAppInstalled);
        clearTimeout(quickShowTimer);
      };
    } else {
      console.log("🚫 Not showing install:", installReason);
      setShowInstall(false);
    }
  }, []);

  const handleInstallClick = async () => {
    // For iOS Safari, show custom instructions
    if (isIOS() && isSafari()) {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      // Automatic installation
      try {
        console.log("🔄 Triggering install prompt...");
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        console.log(`👤 User response: ${outcome}`);

        setDeferredPrompt(null);
        setShowInstall(false);

        if (outcome === "accepted") {
          console.log("✅ Installation started");
        } else {
          localStorage.setItem("pwa-install-dismissed", Date.now().toString());
        }
      } catch (error) {
        console.error("💥 Install error:", error);
        setShowInstall(false);
        localStorage.setItem("pwa-install-dismissed", Date.now().toString());
      }
    } else {
      // Manual installation fallback
      console.log("📱 Showing manual install instructions");

      const isAndroid = /Android/.test(navigator.userAgent);

      if (isAndroid) {
        alert(
          "To install: Tap the menu (⋮) → 'Install App' or 'Add to Home Screen'"
        );
      } else {
        alert(
          "To install: Look for the install icon in your browser's address bar or menu"
        );
      }

      setShowInstall(false);
      localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    }
  };

  const handleClose = () => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setShowInstall(false);
    setShowIOSInstructions(false);
  };

  const handleCloseIOSInstructions = () => {
    setShowIOSInstructions(false);
    setShowInstall(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if not in web environment or already PWA
  if (!showInstall && !showIOSInstructions) {
    return null;
  }

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          padding: 20,
          boxSizing: "border-box",
        }}>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            padding: "40px 32px",
            borderRadius: 20,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 400,
            width: "100%",
            position: "relative",
          }}>
          {/* App Icon */}
          <div
            style={{
              fontSize: 48,
              marginBottom: 20,
              background: "rgba(255, 255, 255, 0.2)",
              width: 80,
              height: 80,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
            }}>
            <img
              src="/favicon.ico"
              style={{ width: "60%", borderRadius: 10 }}
            />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 12 }}>
            Install Afro Dating on iOS
          </h2>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.5,
              marginBottom: 32,
              opacity: 0.9,
            }}>
            Follow these steps to install the app on your iPhone:
          </p>

          {/* iOS Installation Steps */}
          <div
            style={{
              textAlign: "left",
              marginBottom: 32,
              background: "rgba(255, 255, 255, 0.1)",
              padding: 20,
              borderRadius: 12,
              width: "100%",
            }}>
            <div
              style={{
                marginBottom: 16,
                display: "flex",
                alignItems: "flex-start",
              }}>
              <div
                style={{
                  background: "#fff",
                  color: "#667eea",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  marginRight: 12,
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                1
              </div>
              <div>
                <strong>Tap the Share button</strong>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
                  It's the square with an arrow pointing up, at the bottom of
                  Safari
                </div>
              </div>
            </div>

            <div
              style={{
                marginBottom: 16,
                display: "flex",
                alignItems: "flex-start",
              }}>
              <div
                style={{
                  background: "#fff",
                  color: "#667eea",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  marginRight: 12,
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                2
              </div>
              <div>
                <strong>Scroll down and tap "Add to Home Screen"</strong>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
                  You may need to scroll to see this option
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div
                style={{
                  background: "#fff",
                  color: "#667eea",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  marginRight: 12,
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                3
              </div>
              <div>
                <strong>Tap "Add" in the top right</strong>
                <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
                  The app will appear on your home screen
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCloseIOSInstructions}
            style={{
              background: "#fff",
              color: "#667eea",
              border: "none",
              borderRadius: 12,
              padding: "16px 40px",
              fontSize: 16,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
              minWidth: 200,
            }}>
            Got It!
          </button>
        </div>
      </div>
    );
  }

  // Original Install Prompt (for Android and other browsers)
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        padding: 20,
        boxSizing: "border-box",
      }}>
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          padding: "40px 32px",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 400,
          width: "100%",
          position: "relative",
        }}>
        {/* App Icon */}
        <div
          style={{
            fontSize: 48,
            marginBottom: 20,
            background: "rgba(255, 255, 255, 0.2)",
            width: 80,
            height: 80,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
          }}>
          <img src="/favicon.ico" style={{ width: "60%", borderRadius: 10 }} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 12 }}>
          Install Afro Dating
        </h2>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.5,
            marginBottom: 32,
            opacity: 0.9,
          }}>
          {installReason ||
            "For the best experience, install our app to your device."}
        </p>

        <button
          onClick={handleInstallClick}
          style={{
            background: "#fff",
            color: "#667eea",
            border: "none",
            borderRadius: 12,
            padding: "16px 40px",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
            minWidth: 200,
            marginBottom: 16,
          }}>
          {isIOS() ? "Show Installation Steps" : "Install App"}
        </button>

        <p style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>
          This will add the app to your home screen for easy access
        </p>
      </div>
    </div>
  );
};

export default InstallPWAButton;
