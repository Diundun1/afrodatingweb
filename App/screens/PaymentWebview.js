import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  useLocalSearchParams,
} from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

const PaymentWebview = ({ route }) => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const { paymentUrl, title = "Payment" } = params;

  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [iframeClosed, setIframeClosed] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    console.log("Payment URL:", paymentUrl);
  }, [paymentUrl]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleHardwareBackPress
    );

    return () => backHandler.remove();
  }, [loading, paymentStatus, iframeClosed]);

  const handleHardwareBackPress = () => {
    handleGoBack();
    return true; // Prevent default back behavior
  };

  // Enhanced iframe message handling
  useEffect(() => {
    const handleMessage = (event) => {
      console.log("Message from iframe:", event.data);

      if (event.data === "close") {
        navigation.replace("premium/premiumScreen");
      }

      if (event.data === "success") {
        navigation.replace("paymentWebView/paymentDoneScreen");
      }

      if (event.data === "error") {
        navigation.replace("(tabs)/home/homeScreen");
      }

      // Validate the message structure
      if (event.data && event.data.event) {
        const { event: eventType, data } = event.data;

        if (eventType === "success" && data) {
          handlePaymentSuccess(data);
        } else if (eventType === "error" || eventType === "failed") {
          handlePaymentFailure(data);
        } else if (eventType === "close") {
          handleIframeClose(data);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [navigation]);

  const handleIframeClose = (data = null) => {
    console.log("Iframe closed by content", data);
    setIframeClosed(true);
    setLoading(false);

    // Show confirmation before navigating back
    Alert.alert(
      "Payment Cancelled",
      "The payment window was closed. Would you like to try again or go back?",
      [
        {
          text: "Try Again",
          onPress: () => {
            setIframeClosed(false);
            handleRefresh();
          },
        },
        {
          text: "Go Back",
          onPress: () => navigation.goBack(),
          style: "cancel",
        },
      ]
    );
  };

  const handlePaymentSuccess = (paymentData) => {
    console.log("Payment successful:", paymentData);
    setPaymentStatus("success");

    // Construct the verification URL
    const verifyUrl = `https://pay.unigate.com.ng/verify/index.php?ref=${paymentData.reference}&trans=${paymentData.transaction}`;

    console.log("Verification URL:", verifyUrl);

    // Navigate to success screen with verification data
    setTimeout(() => {
      navigation.replace("ProfileScreen", {
        paymentData: paymentData,
        verifyUrl: verifyUrl,
      });
    }, 1000);
  };

  const handlePaymentFailure = (errorData) => {
    console.log("Payment failed:", errorData);
    setPaymentStatus("failed");

    // Navigate to failure screen
    setTimeout(() => {
      navigation.replace("ProfileScreen", {
        errorData: errorData,
      });
    }, 1000);
  };

  const handleLoadStart = () => {
    setLoading(true);
    setIframeClosed(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleLoadError = () => {
    setLoading(false);
    console.log("Iframe load error");
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = paymentUrl; // Reset to original URL
    }
    setLoading(true);
    setIframeClosed(false);
    setPaymentStatus(null);
  };

  const handleGoBack = () => {
    // If payment is in progress, show confirmation before going back
    if (!paymentStatus && (loading || !iframeClosed)) {
      Alert.alert(
        "Leave Payment?",
        "Your payment is still in progress. Are you sure you want to leave?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            onPress: () => {
              setIframeClosed(true);
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Enhanced iframe component with more event handlers
  const IframeComponent = () => (
    <iframe
      ref={iframeRef}
      src={paymentUrl}
      style={styles.iframe}
      onLoad={handleLoadEnd}
      onLoadStart={handleLoadStart}
      onError={handleLoadError}
      allow="payment *"
      allowFullScreen
      sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {paymentStatus === "success"
            ? "Payment Successful"
            : paymentStatus === "failed"
            ? "Payment Failed"
            : iframeClosed
            ? "Payment Cancelled"
            : title}
        </Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Indicator */}
      {loading && !paymentStatus && !iframeClosed && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Processing payment...</Text>
        </View>
      )}

      {/* Iframe Closed Message */}
      {iframeClosed && !paymentStatus && (
        <View style={styles.closedContainer}>
          <Ionicons name="warning" size={60} color="#FFA500" />
          <Text style={styles.closedText}>Payment Cancelled</Text>
          <Text style={styles.closedSubtext}>
            The payment window was closed before completing the transaction.
          </Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setIframeClosed(false);
                handleRefresh();
              }}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButtonSecondary}
              onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Payment Status Indicator */}
      {paymentStatus === "success" && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={60} color="#4ADE80" />
          <Text style={styles.successText}>Payment Successful!</Text>
          <Text style={styles.successSubtext}>Redirecting...</Text>
        </View>
      )}

      {paymentStatus === "failed" && (
        <View style={styles.failedContainer}>
          <Ionicons name="close-circle" size={60} color="#FF6B6B" />
          <Text style={styles.failedText}>Payment Failed</Text>
          <Text style={styles.failedSubtext}>Please try again</Text>
        </View>
      )}

      {/* Iframe Container - Hide when payment is completed or iframe closed */}
      {!paymentStatus && !iframeClosed && (
        <View style={styles.iframeContainer}>
          <IframeComponent />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
    marginHorizontal: 8,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  iframeContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    backgroundColor: "#fff",
  },
  closedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  closedText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFA500",
    marginTop: 16,
    textAlign: "center",
  },
  closedSubtext: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonGroup: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  retryButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButtonSecondary: {
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  backButtonText: {
    color: "#FF6B6B",
    fontSize: 16,
    fontWeight: "600",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  successText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4ADE80",
    marginTop: 16,
  },
  successSubtext: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  failedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  failedText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginTop: 16,
  },
  failedSubtext: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
});

export default PaymentWebview;
