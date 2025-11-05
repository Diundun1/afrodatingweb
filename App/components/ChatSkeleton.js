// ChatSkeleton.js
import React from "react";
import { View, StyleSheet } from "react-native";

const SkeletonItem = () => (
  <View style={styles.row}>
    {/* Avatar placeholder */}
    <View style={styles.avatar} />

    {/* Text placeholders */}
    <View style={styles.textContainer}>
      <View style={styles.name} />
      <View style={styles.message} />
    </View>

    {/* Time placeholder */}
    <View style={styles.time} />
  </View>
);

export default function ChatSkeleton() {
  return (
    <View style={styles.container}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <SkeletonItem key={idx} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e0e0e0",
    opacity: 0.6,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    width: "60%",
    height: 16,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 8,
    opacity: 0.6,
  },
  message: {
    width: "80%",
    height: 14,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    opacity: 0.6,
  },
  time: {
    width: 40,
    height: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginLeft: 10,
    opacity: 0.6,
  },
});
