import React, { useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import {
  NunitoTitle,
  NunitoSubtitle,
  NunitoBody,
} from "../components/NunitoComponents";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import InstallPWAButton from "../components/InstallPWAButton";

const { width, height } = Dimensions.get("window");

const WelcomeScreen2 = ({ navigation }) => {
  useEffect(() => {
    const checkUserToken = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        navigation.replace("ExploreScreen");
      }
    };

    checkUserToken();
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={require("../assets/images/stars.png")}
          style={{
            marginVertical: 15,
            alignSelf: "flex-start",
            marginLeft: 15,
            width: 40,
          }}
          resizeMode="contain"
        />

        <Image
          source={require("../assets/images/stars.png")}
          style={styles.stars}
          resizeMode="contain"
        />

        <Image
          source={require("../assets/images/test.png")}
          style={styles.mainImage}
          resizeMode="contain"
        />
      </View>
      {/**<InstallPWAButton /> */}

      {/* Content Section */}
      <View style={styles.content}>
        {/* Text Content */}
        <View style={styles.textContainer}>
          <NunitoTitle style={styles.title}>Dating Accross Border</NunitoTitle>

          <NunitoBody style={styles.subtitle}>
            You have 24 hours to{"\n"}take a first step with new partner
          </NunitoBody>
        </View>

        {/* Buttons Container */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate("SignupScreen")}>
            <NunitoBody style={styles.nextButtonText} weight="semibold">
              Signup
            </NunitoBody>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.LoginButton}
            onPress={() => navigation.navigate("LoginScreen")}>
            <NunitoBody style={styles.nextButtonText} weight="semibold">
              Login
            </NunitoBody>
          </TouchableOpacity>

          <NunitoBody
            style={{ fontSize: 10, textAlign: "center", lineHeight: 15 }}>
            By logging in or registering, you have agreed to the Terms and
            {"\n"}
            Conditions and Privacy Policy.
          </NunitoBody>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageContainer: {
    height: "50%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  stars: {
    position: "absolute",
    top: 370,
    right: 30,
    width: 40,
    opacity: 0.8,
  },
  mainImage: {
    width: width * 0.8,
    height: height * 0.35,
    maxWidth: 300,
    maxHeight: 300,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 0,
    width: "100%",
    paddingTop: 30,
    paddingBottom: 40,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 16,
    color: "#6C63FF",
    lineHeight: 34,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    color: "#718096",
    lineHeight: 22,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  nextButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "90%",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
  },

  LoginButton: {
    backgroundColor: "#000000",
    paddingVertical: 16,
    borderRadius: 12,
    width: "90%",
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 18,
  },

  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: "100%",
    maxWidth: 280,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#161616",
    fontSize: 16,
    textDecorationLine: "underline",
    textDecorationColor: "#161616",
    textDecorationStyle: "solid",
  },
});

export default WelcomeScreen2;
