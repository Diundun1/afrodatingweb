// components/NunitoComponents.js
import React from "react";
import { StyleSheet } from "react-native";
import NunitoText from "./NunitoText";

// Title Component
export const NunitoTitle = ({ children, style, weight = "bold", ...props }) => {
  return (
    <NunitoText style={[styles.title, style]} weight={weight} {...props}>
      {children}
    </NunitoText>
  );
};

// Subtitle Component
export const NunitoSubtitle = ({
  children,
  style,
  weight = "semibold",
  ...props
}) => {
  return (
    <NunitoText style={[styles.subtitle, style]} weight={weight} {...props}>
      {children}
    </NunitoText>
  );
};

// Body Text Component
export const NunitoBody = ({
  children,
  style,
  weight = "regular",
  ...props
}) => {
  return (
    <NunitoText style={[styles.body, style]} weight={weight} {...props}>
      {children}
    </NunitoText>
  );
};

const styles = StyleSheet.create({
  title: {
    lineHeight: 32,
    color: "#6C63FF",
    marginBottom: 8,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 6,
    opacity: 0.8,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
});
