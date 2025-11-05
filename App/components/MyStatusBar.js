import { StatusBar } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import SlideInNotifications from "./SlideInNotifications";

export default function MyStatusBar({ notif, setNotif }) {
  return (
    <SafeAreaView style={{ zIndex: 9999 }}>
      <StatusBar
        translucent={false}
        backgroundColor={"#6C63FF"}
        barStyle={"light-content"}
      />
      <SlideInNotifications
        message={notif}
        onClose={() => setNotif("")}
        style={{ marginTop: 100, backgroundColor: "#6C63FF" }}
      />
    </SafeAreaView>
  );
}
