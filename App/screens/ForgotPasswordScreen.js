import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import NunitoText from "../components/NunitoText";
import MyStatusBar from "../components/MyStatusBar";

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notif, setNotif] = useState("");

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage("Please enter your email.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/v1/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();
      console.log(response);
      console.log(data);

      if (response.ok) {
        setMessage("Password reset instructions sent! Check your email.");
        setTimeout(
          () => navigation.navigate("ResetPasswordScreen", { email }),
          2000,
        );
      } else {
        if (response.status === 404) {
          setMessage(data?.error);
          return;
        }
        // setMessage(data?.message || "Something went wrong. Please try again.");
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
          <Text style={styles.title}>Forgot Password?</Text>
          <NunitoText style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset
            your password.
          </NunitoText>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor={"#7b7b7b75"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {message ? (
              <NunitoText
                style={[
                  styles.message,
                  message.includes("sent")
                    ? styles.successMessage
                    : styles.errorMessage,
                ]}
              >
                {message}
              </NunitoText>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size={20} color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Instructions</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => navigation.goBack()}
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

export default ForgotPasswordScreen;

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
