import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";

const { width } = Dimensions.get("window");

export default function SlideInNotifications({
  message,
  duration = 3000,
  onClose,
}) {
  const startPosition = -100; // start off-screen
  const endPosition = 5; // slide to 80px from top
  const slideAnim = useRef(new Animated.Value(startPosition)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);

      // Slide in
      Animated.timing(slideAnim, {
        toValue: endPosition,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Slide out after duration
      const timeout = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: startPosition,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          if (onClose) onClose();
        });
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [message]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          // Manual dismiss
          Animated.timing(slideAnim, {
            toValue: startPosition,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setVisible(false);
            if (onClose) onClose();
          });
        }}>
        <Text numberOfLines={3} style={styles.message}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width - 20,
    marginHorizontal: 10,
    backgroundColor: "#6C63FF",
    padding: 15,
    borderRadius: 8,
    zIndex: 9999,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#fff",
  },
  message: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
});
