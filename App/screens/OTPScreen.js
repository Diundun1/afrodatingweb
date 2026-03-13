import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function OTPScreen({ navigation }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("******@unigate.com.ng");
  const inputRefs = useRef([]);

  const handleNumberPress = (number) => {
    Keyboard.dismiss();
    const emptyIndex = otp.findIndex((digit) => digit === "");
    if (emptyIndex !== -1) {
      const newOtp = [...otp];
      newOtp[emptyIndex] = number.toString();
      setOtp(newOtp);

      // Focus next input
      if (emptyIndex < 5) {
        inputRefs.current[emptyIndex + 1]?.focus();
      }
    }
  };

  const handleBackspace = () => {
    const lastFilledIndex = otp.reduce(
      (acc, digit, index) => (digit !== "" ? index : acc),
      -1
    );

    if (lastFilledIndex !== -1) {
      const newOtp = [...otp];
      newOtp[lastFilledIndex] = "";
      setOtp(newOtp);

      // Focus previous input
      if (lastFilledIndex > 0) {
        inputRefs.current[lastFilledIndex - 1]?.focus();
      }
    }
  };

  const handleInputChange = (text, index) => {
    if (text.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);

      // Auto focus next input
      if (text && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainContent}>
          {/* Header */}
          <View style={{ width: "100%" }}>
            <Text style={styles.title}>Verify it's you</Text>

            <Text style={styles.subtitle}>
              We sent a code to <Text style={styles.email}>( {email} )</Text>
              {"\n"}
              Enter it here to verify your identity
            </Text>
          </View>

          {/* OTP Input Boxes */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                value={digit}
                onChangeText={(text) => handleInputChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend Code */}
          <TouchableOpacity style={styles.resendContainer}>
            <Text style={styles.resendText}>Resend Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => navigation.navigate("ExploreScreen")}>
            <Text style={styles.nextText}>Confirm</Text>
          </TouchableOpacity>

          {/* Number Pad */}
          <View style={styles.numberPad}>
            <View style={styles.numberRow}>
              {[1, 2, 3].map((number) => (
                <TouchableOpacity
                  key={number}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(number)}>
                  <Text style={styles.numberText}>{number}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.numberRow}>
              {[4, 5, 6].map((number) => (
                <TouchableOpacity
                  key={number}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(number)}>
                  <Text style={styles.numberText}>{number}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.numberRow}>
              {[7, 8, 9].map((number) => (
                <TouchableOpacity
                  key={number}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(number)}>
                  <Text style={styles.numberText}>{number}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.numberRow}>
              <TouchableOpacity style={styles.numberButton}>
                <Text style={styles.numberText}>*</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.numberButton}
                onPress={() => handleNumberPress(0)}>
                <Text style={styles.numberText}>0</Text>
              </TouchableOpacity>

              {/** <TouchableOpacity
                style={[
                  styles.numberButton,
                  isOtpComplete && styles.submitButtonActive,
                ]}
                onPress={() => isOtpComplete && navigation.navigate("MainApp")}
                disabled={!isOtpComplete}>
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={isOtpComplete ? "#fff" : "#7B61FF"}
                />
              </TouchableOpacity> */}

              <TouchableOpacity
                style={styles.backspaceButton}
                onPress={handleBackspace}>
                <Ionicons name="backspace-outline" size={24} color="#7B61FF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Backspace Button */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  mainContent: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6C63FF",
    textAlign: "left",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "left",
    lineHeight: 22,
    marginBottom: 40,
    fontWeight: "400",
  },
  email: {
    color: "#7B61FF",
    fontWeight: "600",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 30,
    width: "90%",
    padding: 10,
  },
  otpInput: {
    width: 43,
    height: 43,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  otpInputFilled: {
    borderColor: "#7B61FF",
    backgroundColor: "#fff",
  },
  resendContainer: {
    marginBottom: 30,
  },
  resendText: {
    fontSize: 16,
    color: "#1DAB87",
    fontWeight: "700",
    textAlign: "center",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 30,
  },
  numberPad: {
    width: "100%",
    maxWidth: 300,
  },
  numberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  numberButton: {
    width: 50,
    height: 50,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#374151",
  },
  submitButtonActive: {
    backgroundColor: "#7B61FF",
    borderColor: "#7B61FF",
  },
  backspaceButton: {
    marginTop: 20,
    padding: 12,
  },
  nextBtn: {
    backgroundColor: "#7B61FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    alignSelf: "center",
    marginVertical: 20,
    width: "90%", // Changed from 80% to 100% since container is centered
  },
  nextText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
