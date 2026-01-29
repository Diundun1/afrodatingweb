import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NunitoSubtitle, NunitoTitle } from "../components/NunitoComponents";
import NunitoText from "../components/NunitoText";

const ChangePasswordScreen = () => {
  const navigation = useNavigation();

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isValid =
    newPass.trim() &&
    confirmPass.trim() &&
    newPass === confirmPass &&
    newPass.length >= 8;

  const handleSubmit = async () => {
    console.log("Submit Pressed");

    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(
        "http://localhost:5000/api/v1/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newPassword: newPass, // ✅ EXACTLY what API expects
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Password reset failed");
      }

      setSuccessMsg("Password updated successfully");
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (error) {
      console.error("Reset password error:", error);
      setErrorMsg(error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color="#1e1e1e" />
      </TouchableOpacity>

      <NunitoTitle style={styles.title}>Change Password</NunitoTitle>
      <NunitoSubtitle style={styles.subtitle}>
        Update your password to keep your account secure.
      </NunitoSubtitle>

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}

      {/* New Password */}
      <View style={styles.inputWrapper}>
        <NunitoText style={styles.label}>New Password</NunitoText>
        <View style={styles.inputContainer}>
          <TextInput
            secureTextEntry={showNew ? false : true}
            value={newPass}
            onChangeText={setNewPass}
            placeholder="Enter new password"
            style={styles.input}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            <Ionicons
              name={showNew ? "eye-off" : "eye"}
              size={22}
              color="#7b7b7b"
            />
          </TouchableOpacity>
        </View>

        {newPass.length > 0 && (
          <Text
            style={[
              styles.helper,
              { color: newPass.length >= 8 ? "#16a34a" : "#dc2626" },
            ]}
          >
            {newPass.length >= 8
              ? "Strong password ✔"
              : "Password must be at least 8 characters"}
          </Text>
        )}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputWrapper}>
        <NunitoText style={styles.label}>Confirm New Password</NunitoText>
        <View style={styles.inputContainer}>
          <TextInput
            secureTextEntry={showConfirm ? false : true}
            value={confirmPass}
            onChangeText={setConfirmPass}
            placeholder="Re-enter new password"
            style={styles.input}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons
              name={showConfirm ? "eye-off" : "eye"}
              size={22}
              color="#7b7b7b"
            />
          </TouchableOpacity>
        </View>

        {confirmPass.length > 0 && (
          <Text
            style={[
              styles.helper,
              {
                color: newPass === confirmPass ? "#16a34a" : "#dc2626",
              },
            ]}
          >
            {newPass === confirmPass
              ? "Passwords match ✔"
              : "Passwords do not match"}
          </Text>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, { opacity: !isValid || loading ? 0.6 : 1 }]}
        disabled={!isValid || loading}
        onPress={handleSubmit}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <NunitoText style={styles.buttonText}>Update Password</NunitoText>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ChangePasswordScreen;

const styles = StyleSheet.create({
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 25,
    paddingVertical: 20,
    fontFamily: "Nunito-SemiBold",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#000",
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 48,
    color: "#000",
  },
  helper: {
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: "#7B61FF",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    color: "#dc2626",
    marginBottom: 10,
  },
  success: {
    color: "#16a34a",
    marginBottom: 10,
  },
});
