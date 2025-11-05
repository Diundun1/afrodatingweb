import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NunitoText from "../components/NunitoText";
import MyStatusBar from "../components/MyStatusBar";

export default function LoginScreen() {
  const navigation = useNavigation();
  const [isLoginButton, setIsLoginButton] = useState(false);
  const [notif, setNotif] = useState("");

  const [email, setEmail] = useState("");
  const [password, setpassword] = useState("");
  const [showPassword, setshowPassword] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkUserToken = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        navigation.replace("ExploreScreen");
      }
    };

    checkUserToken();
  }, []);

  const loginFn = async () => {
    if (!email || !password) {
      setNotif("Please enter both email and password.");
      return;
    }

    console.log(email, " ", password);

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "https://closematch-backend-seix.onrender.com/api/v1/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      console.log("Response status:", response.status);

      // Check if response is OK before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response data:", data);

      if (data.token) {
        await AsyncStorage.setItem("userToken", data.token);
        await AsyncStorage.setItem("loggedInUserId", data.user._id);
        console.log("Token stored:", data.token);
        navigation.replace("ExploreScreen");
      } else {
        setNotif(data?.message || "Invalid email or password.");
      }
    } catch (error) {
      console.log("Login error:", error);
      setNotif("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#fff", flex: 1 }}>
      <MyStatusBar notif={notif} setNotif={setNotif} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* Main content container - centered vertically */}
        <View style={styles.mainContent}>
          {/* Top icon */}
          <View style={styles.iconContainer}>
            <Image
              source={require("../assets/images/stars.png")}
              style={{
                marginVertical: 5,
                alignSelf: "flex-start",
                width: 40,
              }}
              resizeMode="contain"
            />
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate("SignupScreen")}>
              <Text style={styles.tabText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={[styles.tabText, styles.activeTab]}>Login</Text>
            </TouchableOpacity>
          </View>

          {/* Form Inputs */}
          <View style={styles.formContainer}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="email address"
              value={email}
              placeholderTextColor={"#7b7b7b75"}
              onChangeText={(value) => setEmail(value)}
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="password"
              secureTextEntry
              value={password}
              placeholderTextColor={"#7b7b7b75"}
              onChangeText={(value) => setpassword(value)}
            />

            {errorMessage ? (
              <NunitoText
                style={{
                  color: "red",
                  textAlign: "center",
                  marginVertical: 10,
                }}>
                {errorMessage}
              </NunitoText>
            ) : null}

            <TouchableOpacity style={styles.nextBtn} onPress={loginFn}>
              {loading ? (
                <ActivityIndicator size={20} color={"#fff"} />
              ) : (
                <Text style={styles.nextText}>Login</Text>
              )}
            </TouchableOpacity>

            {/**     <TouchableOpacity style={styles.googleBtn}>
              <Image
                source={require("../assets/images/google.png")}
                style={styles.googleIcon}
              />
              <Text style={styles.googleText}>Login with Google</Text>
            </TouchableOpacity> */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#fff",
    width: "100%",
    height: "100%",
    //   justifyContent: "center", // Centers content vertically
  },
  mainContent: {
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  iconContainer: {
    alignItems: "flex-start",
    marginBottom: 10,
    paddingLeft: 5,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  tabText: {
    marginHorizontal: 20,
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
  activeTab: {
    color: "#7B61FF",
    borderBottomWidth: 2,
    borderBottomColor: "#7B61FF",
    paddingBottom: 4,
  },
  formContainer: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
    marginTop: 12,
    fontWeight: "700",
    marginLeft: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  nextBtn: {
    backgroundColor: "#7B61FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 25,
    alignSelf: "center",
    width: "80%", // Changed from 80% to 100% since container is centered
  },
  nextText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "80%", // Changed from 80% to 100% since container is centered
    backgroundColor: "#F4F4F4",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignSelf: "center",
    marginTop: 15,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  googleText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
});
