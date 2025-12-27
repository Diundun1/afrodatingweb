import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import InstallPWAButton from "./InstallPWAButton";

const { width, height } = Dimensions.get("window");

const RestrictScreen = () => {
  const [showRestriction, setShowRestriction] = useState(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const isWideScreen = width > 420;

    if (isWideScreen) {
      setShowRestriction(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      return <InstallPWAButton />;
    }
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowRestriction(false);
    });
  };

  if (!showRestriction) {
    return null;
  }

  return (
    <Modal
      visible={showRestriction}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      style={{ backgroundColor: "#000", zIndex: 9999 }}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.promptContainer,
            {
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Close Button */}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.appIcon}>
              <FontAwesome5 name="mobile-alt" size={32} color="#007AFF" />
            </View>
            <Text style={styles.title}>Mobile Experience Required</Text>
            <Text style={styles.subtitle}>
              Please switch to a mobile device to continue
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefits}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={22}
                  color="#007AFF"
                />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Optimized for Mobile</Text>
                <Text style={styles.benefitDescription}>
                  Designed specifically for touch interfaces and mobile screens
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="camera-outline" size={22} color="#007AFF" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Mobile Features</Text>
                <Text style={styles.benefitDescription}>
                  Access camera, GPS, and other mobile-specific capabilities
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="location-outline" size={22} color="#007AFF" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Location Services</Text>
                <Text style={styles.benefitDescription}>
                  Enhanced experience with location-based features
                </Text>
              </View>
            </View>
          </View>

          {/* Action Button
          
             <TouchableOpacity style={styles.actionButton} onPress={handleClose}>
            <Text style={styles.actionButtonText}>Got It</Text>
          </TouchableOpacity>
          
          */}

          <Text style={styles.footerNote}>
            Designed for the best experience on mobile devices
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  promptContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  title: {
    color: "#1C1C1E",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#8E8E93",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  benefits: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  benefitDescription: {
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 18,
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  footerNote: {
    color: "#C7C7CC",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});

export default RestrictScreen;
