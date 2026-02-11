import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Platform,
  AppState,
  StatusBar,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { initPush } from "./App/lib/RegisterForPushNotificationsAsync";
// Import your screens
import WelcomeScreen1 from "./App/screens/WelcomeScreen1";
import LoginScreen from "./App/screens/LoginScreen";
import WelcomeScreen2 from "./App/screens/WelcomeScreen2";
import SignupScreen from "./App/screens/SignupScreen";
import OTPScreen from "./App/screens/OTPScreen";
import ExploreScreen from "./App/screens/ExploreScreen";
import ProfileScreen from "./App/screens/ProfileScreen";
import AccountInfoScreen from "./App/screens/AccountInfoScreen";
import ChatScreen from "./App/screens/ChatScreen";
import EditAccountScreen from "./App/screens/EditAccountScreen";
import ProfileDetailScreen from "./App/screens/ProfileDetailScreen";
import MyFavouriteScreen from "./App/screens/MyFavouriteScreen";
import FilterScreen from "./App/screens/FilterScreen";
import PremiumScreen from "./App/screens/PremiumScreen";
import PaymentWebview from "./App/screens/PaymentWebview";
import GeneralSettings from "./App/screens/GeneralSettings";
import ChangePasswordScreen from "./App/screens/ChangePasswordScreen";
import NotificationManager from "./App/components/NotificationManager";
// Import the PWA installation component
import InstallPWAButton from "./App/components/InstallPWAButton";
import MessageScreen from "./App/screens/MessageScreen";
import { CallProvider } from "./App/lib/CallContext";
import { SocketProvider } from "./App/lib/SocketContext";
import IncomingCallScreen from "./App/screens/IncomingCallScreen";
import VideoCallScreen from "./App/screens/VideoCallScreen";
import RestrictScreen from "./App/components/RestricScreen";
import NotificationsScreen from "./App/screens/NotificationsScreen";
import ForgotPasswordScreen from "./App/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./App/screens/ResetPasswordScreen";
import RegisterForPushNotificationsAsync from "./App/lib/RegisterForPushNotificationsAsync";
import { createNavigationContainerRef } from "@react-navigation/native";

// 1. Create a ref to the navigation object
export const navigationRef = createNavigationContainerRef();

const linking = {
  // ✅ This tells the browser that links from this domain belong to the app
  prefixes: ["https://afrodatingweb.vercel.app", window.location.origin],
  config: {
    screens: {
      // ✅ This matches the path used in your Service Worker targetUrl
      IncomingCallScreen: "incoming-call",
      ExploreScreen: "explore",
      ChatScreen: "chat/:roomId",
    },
  },
};

const Stack = createNativeStackNavigator();

const { width } = Dimensions.get("window");

// Service Worker registration
const registerServiceWorker = async () => {
  if (Platform.OS === "web" && "serviceWorker" in navigator) {
    try {
      // Clean up any existing service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }

      // Simple registration
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        {
          scope: "/",
          updateViaCache: "none",
        },
      );

      console.log("✅ Service Worker registered successfully:", registration);

      // Check if service worker is actually controlling the page
      if (navigator.serviceWorker.controller) {
        console.log("✅ Service Worker is controlling the page");
      } else {
        console.log(
          "⚠️ Service Worker registered but not controlling the page",
        );
      }

      return registration;
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
      return null;
    }
  } else {
    console.log("❌ Service Workers not supported in this browser");
    return null;
  }
};

// Check if PWA is installed
const isPWAInstalled = () => {
  if (Platform.OS === "web") {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://")
    );
  }
  return false;
};

const requestWebNotificationPermission = async () => {
  try {
    if (typeof Notification === "undefined") {
      console.log("This environment does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      console.log("Notification permission already granted");
      return true;
    }

    if (Notification.permission === "denied") {
      console.log("Notification permission was denied");
      return false;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted!");

      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification("Welcome to Diundun! 🎉", {
            body: "You will now receive notifications for new messages and calls.",
            icon: "/favicon.ico",
            tag: "welcome",
          });
        } catch (error) {
          console.log("Could not show welcome notification:", error);
        }
      }

      return true;
    } else {
      console.log("Notification permission denied");
      return false;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

export default function App() {
  // useEffect(() => {
  //   // Register for push notifications when app loads
  //   const initPush = async () => {
  //     const userId = localStorage.getItem("loggedInUserId");
  //     const token = localStorage.getItem("userToken");

  //     if (userId && token) {
  //       await RegisterForPushNotificationsAsync();
  //       console.log("✅ Push notifications initialized");
  //     }
  //   };

  //   initPush();
  // }, []);

  const [loaded] = useFonts({
    Roboto_Light: require("./assets/fonts/Roboto-Light.ttf"),
    Roboto_Regular: require("./assets/fonts/Roboto-Regular.ttf"),
    Roboto_Medium: require("./assets/fonts/Roboto-Medium.ttf"),
    Roboto_Bold: require("./assets/fonts/Roboto-Bold.ttf"),
  });

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const navigationRef = useRef();
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const handleMessage = (event) => {
        if (event.data.type === "NAVIGATE_TO_CALL") {
          // Force internal navigation
          navigation.navigate("IncomingCallScreen", event.data.payload);
        }
      };
      navigator.serviceWorker.addEventListener("message", handleMessage);
      return () =>
        navigator.serviceWorker.removeEventListener("message", handleMessage);
    }
  }, []);

  // useEffect(() => {
  //   if ("serviceWorker" in navigator) {
  //     const handleMessage = (event) => {
  //       // ✅ Use navigationRef.current to access the helper functions
  //       if (event.data.type === "NAVIGATE" && navigationRef.current) {
  //         const url = event.data.payload.url;

  //         console.log("🚀 Navigating to:", url);

  //         if (url === "/explore") {
  //           navigationRef.current.navigate("ExploreScreen");
  //         } else if (url.startsWith("/chat/")) {
  //           const roomId = url.split("/").pop();
  //           navigationRef.current.navigate("ChatScreen", { roomId });
  //         }
  //       }
  //     };

  //     navigator.serviceWorker.addEventListener("message", handleMessage);
  //     return () =>
  //       navigator.serviceWorker.removeEventListener("message", handleMessage);
  //   }
  // }, []);

  // Service Worker registration for PWA
  useEffect(() => {
    if (Platform.OS === "web") {
      // Check if already running as PWA
      setIsPWA(isPWAInstalled());

      // Add manifest link if not exists
      if (!document.querySelector('link[rel="manifest"]')) {
        const manifestLink = document.createElement("link");
        manifestLink.rel = "manifest";
        manifestLink.href = "/manifest.json";
        document.head.appendChild(manifestLink);
        console.log("✅ Added manifest.json");
      }

      // Register service worker
      registerServiceWorker().then((registration) => {
        if (registration) {
          console.log("PWA setup complete");
        }
      });

      // Listen for PWA installation
      window.addEventListener("appinstalled", (event) => {
        console.log("PWA was installed");
        setIsPWA(true);
      });

      // Cleanup function for web
      return () => {
        window.removeEventListener("appinstalled", () => {});
      };
    } else {
      // Set status bar for native apps (not web)
      StatusBar.setBarStyle("light-content");
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();

      // Request notification permission after 2 seconds (web only)
      if (Platform.OS === "web") {
        setTimeout(() => {
          const checkNotificationPermission = async () => {
            try {
              const hasBeenAsked = await AsyncStorage.getItem(
                "notificationDealDOne",
              );

              if (!hasBeenAsked && Notification.permission === "default") {
                setShowNotificationModal(true);
              }
            } catch (error) {
              console.error("Error checking notification status:", error);
              if (Notification.permission === "default") {
                setShowNotificationModal(true);
              }
            }
          };
          checkNotificationPermission();
        }, 2000);
      }
    }
  }, [loaded]);

  // Event listeners for chat and navigation
  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOpenChatRoom = (event) => {
        const { roomId, messageId } = event.detail;
        if (navigationRef.current?.isReady?.()) {
          navigationRef.current.navigate("ChatScreen", {
            roomIdxccd: roomId,
            focusMessageId: messageId,
          });
        }
      };

      const handleOpenChat = (event) => {
        const data = event.detail;
        if (navigationRef.current?.isReady?.() && data.roomId) {
          navigationRef.current.navigate("ChatScreen", {
            roomIdxccd: data.roomId,
          });
        }
      };

      window.addEventListener("openChatRoom", handleOpenChatRoom);
      window.addEventListener("openChat", handleOpenChat);

      return () => {
        window.removeEventListener("openChatRoom", handleOpenChatRoom);
        window.removeEventListener("openChat", handleOpenChat);
      };
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!navigator.serviceWorker) return;

    const handler = (event) => {
      const { type, payload } = event.data || {};

      console.log("📩 Message from Service Worker:", event.data);

      // 🔹 Open chat
      if (type === "OPEN_CHAT" && payload?.roomId) {
        console.log("navigating....");
        if (navigationRef.current?.isReady?.()) {
          navigationRef.current.navigate("MessageScreen", {
            roomIdxccd: payload?.roomId,
            focusMessageId: payload?.messageId,
          });
        } else {
          console.warn("⚠ Navigation not ready yet");
        }
      }

      // 🔹 Incoming call
      if (type === "INCOMING_CALL" && payload?.callUrl) {
        window.location.href = payload?.callUrl;
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);

    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  const handleAllowNotifications = async () => {
    try {
      setShowNotificationModal(false);
      await AsyncStorage.setItem("notificationDealDOne", "asked");
      const permissionGranted = await requestWebNotificationPermission();
      console.log("Permission granted:", permissionGranted);
    } catch (error) {
      console.error("Error in handleAllowNotifications:", error);
      setShowNotificationModal(false);
    }
  };

  const handleDenyNotifications = async () => {
    await AsyncStorage.setItem("notificationDealDOne", "asked");
    setShowNotificationModal(false);
  };

  if (!loaded) {
    return null;
  }

  // if (width > 420) {
  //   return <RestrictScreen />;
  // }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        fallback={<Text>Loading...</Text>}
      >
        <CallProvider>
          <SocketProvider>
            <Stack.Navigator
              screenOptions={{ headerShown: false }}
              initialRouteName="WelcomeScreen"
            >
              {/* <NotificationManager user={user} token={token} /> */}
              <Stack.Screen name="WelcomeScreen" component={WelcomeScreen1} />
              <Stack.Screen name="WelcomeScreen2" component={WelcomeScreen2} />
              <Stack.Screen name="SignupScreen" component={SignupScreen} />
              <Stack.Screen name="MessageScreen" component={MessageScreen} />
              <Stack.Screen name="LoginScreen" component={LoginScreen} />
              <Stack.Screen name="OTPScreen" component={OTPScreen} />
              <Stack.Screen name="ExploreScreen" component={ExploreScreen} />
              <Stack.Screen
                name="ResetPasswordScreen"
                component={ResetPasswordScreen}
              />
              <Stack.Screen
                name="ForgotPasswordScreen"
                component={ForgotPasswordScreen}
              />
              <Stack.Screen
                name="NotificationsScreen"
                component={NotificationsScreen}
              />
              <Stack.Screen
                name="IncomingCallScreen"
                component={IncomingCallScreen}
              />
              <Stack.Screen
                name="VideoCallScreen"
                component={VideoCallScreen}
              />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
              <Stack.Screen
                name="GeneralSettings"
                component={GeneralSettings}
              />
              <Stack.Screen
                name="ChangePasswordScreen"
                component={ChangePasswordScreen}
              />
              <Stack.Screen
                name="AccountInfoScreen"
                component={AccountInfoScreen}
              />
              <Stack.Screen name="ChatScreen" component={ChatScreen} />
              <Stack.Screen
                name="EditAccountScreen"
                component={EditAccountScreen}
              />
              <Stack.Screen
                name="MyFavouriteScreen"
                component={MyFavouriteScreen}
              />
              <Stack.Screen name="FilterScreen" component={FilterScreen} />
              <Stack.Screen name="PremiumScreen" component={PremiumScreen} />
              <Stack.Screen name="PaymentWebview" component={PaymentWebview} />
              <Stack.Screen
                name="ProfileDetailScreen"
                component={ProfileDetailScreen}
              />
            </Stack.Navigator>
          </SocketProvider>
        </CallProvider>
      </NavigationContainer>

      {/* PWA Installation Prompt - Only shows on web */}
      <InstallPWAButton />

      {/* Notification Permission Modal - Only shows on web */}
      {Platform.OS === "web" && showNotificationModal && (
        <Modal
          visible={showNotificationModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleDenyNotifications}
        >
          <View style={styles.notificationModal}>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Enable Notifications</Text>
              <Text style={styles.notificationText}>
                Get notified about new messages, matches, and important updates.
              </Text>
              <View style={styles.notificationButtons}>
                <TouchableOpacity
                  onPress={handleAllowNotifications}
                  style={styles.allowButton}
                >
                  <Text style={styles.allowButtonText}>Allow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDenyNotifications}
                  style={styles.denyButton}
                >
                  <Text style={styles.denyButtonText}>Not Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  notificationModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notificationContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    maxWidth: 400,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  notificationText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  notificationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  allowButton: {
    flex: 1,
    backgroundColor: "#7B61FF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  allowButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  denyButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  denyButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});
