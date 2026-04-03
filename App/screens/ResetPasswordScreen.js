import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import NunitoText from "../components/NunitoText";
import MyStatusBar from "../components/MyStatusBar";
import { SafeAreaView } from "react-native-safe-area-context";

const ResetPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params || {};

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notif, setNotif] = useState("");

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleResetPassword = async () => {
    if (!otp) {
      setMessage("Please enter the OTP sent to your email.");
      return;
    }
    if (!newPassword) {
      setMessage("Please enter a new password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const verifyResponse = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/auth/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email, otp }),
        },
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setMessage(verifyData?.message || "Invalid OTP. Please try again.");
        setLoading(false);
        return;
      }

      const token = verifyData.token;

      console.log(token);

      const resetResponse = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({ newPassword }),
        },
      );

      const resetData = await resetResponse.json();

      if (resetResponse.ok) {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => navigation.replace("LoginScreen"), 2000);
      } else {
        setMessage(
          resetData?.message || "Something went wrong. Please try again.",
        );
      }
    } catch (error) {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#fff", flex: 1 }}>
      <MyStatusBar notif={notif} setNotif={setNotif} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#7B61FF" />
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>Reset Password</Text>
          <NunitoText style={styles.subtitle}>
            Enter the OTP sent to your email and create a new password.
          </NunitoText>

          <View style={styles.formContainer}>
            <Text style={styles.label}>OTP Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={"#7b7b7b75"}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                placeholderTextColor={"#7b7b7b75"}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={togglePasswordVisibility}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#7b7b7b"
                />
              </TouchableOpacity>
            </View>

            {message ? (
              <NunitoText
                style={[
                  styles.message,
                  message.includes("successful")
                    ? styles.successMessage
                    : styles.errorMessage,
                ]}
              >
                {message}
              </NunitoText>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size={20} color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => navigation.navigate("LoginScreen")}
            >
              <NunitoText style={styles.backToLoginText}>
                Back to Login
              </NunitoText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#444",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Nunito-Bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#7b7b7b",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
    marginTop: 12,
    fontWeight: "700",
    marginLeft: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  message: {
    textAlign: "center",
    marginVertical: 15,
    fontSize: 14,
    paddingHorizontal: 10,
  },
  errorMessage: {
    color: "#FF3B30",
  },
  successMessage: {
    color: "#4CAF50",
  },
  button: {
    backgroundColor: "#7B61FF",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
    shadowColor: "#7B61FF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  backToLoginButton: {
    alignItems: "center",
    marginTop: 25,
    padding: 10,
  },
  backToLoginText: {
    color: "#7B61FF",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
