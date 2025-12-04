import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MyStatusBar from "../components/MyStatusBar";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomDatePicker from "../components/CustomDatePicker";

export default function SignupScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("create");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [degree, setDegree] = useState("");
  const [religion, setReligion] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [notif, setNotif] = useState("");

  const [latitude, setLatitude] = useState(9.9396052);
  const [longitude, setLongitude] = useState(8.9024603);

  // Date picker states
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [gender, setGender] = useState("");
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const [secondForm, setSecondForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDate(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    const checkUserToken = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        navigation.replace("ExploreScreen");
      }
    };

    checkUserToken();
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission denied", "Allow location access to continue.");
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (location?.coords) {
        console.log("Location:", location.coords);
        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);
      }
    })();
  }, []);

  const handleGenderSelect = (selectedGender) => {
    setGender(selectedGender);
    setShowGenderDropdown(false);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePasswordStrength = (password) => {
    if (password.length < 8) {
      return {
        valid: false,
        message: "Password must be at least 8 characters long",
      };
    }
    /* if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      return {
        valid: false,
        message: "Password must contain both uppercase and lowercase letters",
      };
    }
      
    if (!/(?=.*\d)/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one number",
      };
    }
      */
    return { valid: true, message: "Password is strong" };
  };

  const validateForm = () => {
    if (!fullName || !email || !password || !phoneNumber) {
      setNotif("Some required fields are missing");
      console.warn("Some required fields are missing");
      // Alert.alert("Error", "All fields are required!");
      return false;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setNotif("Please enter a valid email address");

      return false;
    }

    // Validate password strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      setNotif(passwordCheck.message);
      Alert.alert("Error", passwordCheck.message);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateForm()) {
      setSecondForm(true);
    }
  };

  const registerUser = async () => {
    if (!validateForm()) {
      setNotif("All fields are required");
      // return;
    }

    setLoading(true);

    const requestBody = {
      name: fullName,
      email,
      password,
      gender,
      date_of_birth: date,
      address,
      latitude,
      longitude,
      bio,
      occupation,
      country,
      degree,
      religion,
      marital_status: maritalStatus,
      phoneNumber,
      location:
        latitude && longitude
          ? {
              type: "Point",
              coordinates: [longitude, latitude],
            }
          : null,
    };

    console.log("Request:", requestBody);

    try {
      const response = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      // Get the response text first
      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        // Try to parse as JSON
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        data = {
          message: "Server returned invalid JSON",
          rawResponse: responseText,
        };
      }

      console.log("Parsed data:", data);
      console.log("Response status:", response.status);

      // Handle different status codes
      if (response.status === 201) {
        // Success
        setNotif("Registration successful");
        setTimeout(() => {
          navigation.replace("LoginScreen");
        }, 1500);
      } else {
        // All error cases (400, 500, etc.)
        const errorMessage = getErrorMessage(response.status, data);
        setNotif(errorMessage);
      }
    } catch (error) {
      console.error("Network error:", error);

      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        setNotif("Network error. Please check your connection and try again.");
      } else {
        setNotif("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to extract error messages based on status code
  const getErrorMessage = (status, data) => {
    switch (status) {
      case 400:
        return (
          data.error || // "User already exists."
          data.message ||
          data.details?.[0]?.message ||
          "Bad request. Please check your input."
        );

      case 401:
        return (
          data.error ||
          data.message ||
          "Authentication failed. Please try again."
        );

      case 403:
        return (
          data.error ||
          data.message ||
          "Access forbidden. You don't have permission for this action."
        );

      case 404:
        return (
          data.error ||
          data.message ||
          "Resource not found. Please try again later."
        );

      case 409:
        return (
          data.error || // This is likely where "User already exists" falls
          data.message ||
          "Conflict. This resource already exists."
        );

      case 422:
        return (
          data.error ||
          data.message ||
          data.details?.[0]?.message ||
          "Validation failed. Please check your input."
        );

      case 429:
        return (
          data.error ||
          data.message ||
          "Too many requests. Please wait and try again."
        );

      case 500:
        return (
          data.error || data.message || "Server error. Please try again later."
        );

      case 502:
      case 503:
      case 504:
        return (
          data.error ||
          data.message ||
          "Service temporarily unavailable. Please try again later."
        );

      default:
        return (
          data.error ||
          data.message ||
          data.details?.[0]?.message ||
          `Request failed with status ${status}`
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MyStatusBar notif={notif} setNotif={setNotif} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
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
            <TouchableOpacity onPress={() => setActiveTab("create")}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === "create" && styles.activeTab,
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("LoginScreen")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "login" && styles.activeTab,
                ]}
              >
                Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.formContainer}>
            {secondForm ? (
              <View>
                <Text style={styles.label}>Country of Residence</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Eg Kenya"
                  value={country}
                  placeholderTextColor={"#7b7b7b75"}
                  onChangeText={setCountry}
                  maxLength={30}
                />

                <Text style={styles.label}>State/District</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter State/District"
                  value={address}
                  placeholderTextColor={"#7b7b7b75"}
                  onChangeText={setAddress}
                  maxLength={40}
                />

                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, {}]}
                  placeholder="Tell us about yourself"
                  value={bio}
                  placeholderTextColor={"#7b7b7b75"}
                  onChangeText={setBio}
                  maxLength={100}
                  multiline
                />

                <Text style={styles.label}>Occupation</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your occupation"
                  value={occupation}
                  placeholderTextColor={"#7b7b7b75"}
                  onChangeText={setOccupation}
                  maxLength={30}
                />

                <Text style={styles.label}>Degree</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your degree"
                  placeholderTextColor={"#7b7b7b75"}
                  value={degree}
                  onChangeText={setDegree}
                  maxLength={40}
                />

                <Text style={styles.label}>Religion</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your religion"
                  value={religion}
                  onChangeText={setReligion}
                  placeholderTextColor={"#7b7b7b75"}
                  maxLength={20}
                />

                <Text style={styles.label}>Marital Status</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your marital status"
                  value={maritalStatus}
                  onChangeText={setMaritalStatus}
                  maxLength={15}
                  placeholderTextColor={"#7b7b7b75"}
                />
                <Text style={styles.label}>Date of birth</Text>

                <CustomDatePicker
                  value={date}
                  onChange={(selectedDate) => setDate(selectedDate)}
                />
                <Text style={styles.label}>Gender</Text>
                <TouchableOpacity
                  style={[styles.inputWithIcon, { zIndex: 999 }]}
                  onPress={() => setShowGenderDropdown(!showGenderDropdown)}
                >
                  <Ionicons
                    name={showGenderDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#7B61FF"
                  />
                  <Text
                    style={[
                      styles.inputText,
                      !gender && styles.placeholderText,
                    ]}
                  >
                    {gender || "Select Gender"}
                  </Text>

                  {showGenderDropdown && (
                    <View style={styles.dropdown}>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => handleGenderSelect("male")}
                      >
                        <Text style={styles.dropdownText}>male</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => handleGenderSelect("female")}
                      >
                        <Text style={styles.dropdownText}>female</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => handleGenderSelect("other")}
                      >
                        <Text style={styles.dropdownText}>other</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Register Button */}
                <TouchableOpacity
                  style={[styles.nextBtn, loading && styles.disabledBtn]}
                  onPress={registerUser}
                  disabled={loading}
                >
                  <Text style={styles.nextText}>
                    {loading ? (
                      <ActivityIndicator size={20} color={"#ffff"} />
                    ) : (
                      "Create Account"
                    )}
                  </Text>
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity
                  style={[styles.backBtn, loading && styles.disabledBtn]}
                  onPress={() => setSecondForm(false)}
                  disabled={loading}
                >
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <View style={{ width: "100%", height: 200 }}></View>
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={fullName}
                  placeholderTextColor={"#7b7b7b75"}
                  onChangeText={setFullName}
                />

                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  // maxLength={25}
                  placeholderTextColor={"#7b7b7b75"}
                />

                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    keyboardType="default"
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor={"#7b7b7b75"}
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

                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+230 4859 49584 948"
                  keyboardType="phone-pad"
                  placeholderTextColor={"#7b7b7b75"}
                  value={phoneNumber}
                  maxLength={15}
                  onChangeText={setPhoneNumber}
                />

                {/* Next Button */}
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                  <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>

                {/* Google Sign Up 
                <TouchableOpacity style={styles.googleBtn}>
                  <Image
                    source={require("../assets/images/google.png")}
                    style={styles.googleIcon}
                  />
                  <Text style={styles.googleText}>Sign up with Google</Text>
                </TouchableOpacity>
                */}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  mainContent: {
    paddingHorizontal: 15,
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
    marginLeft: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 14,
    backgroundColor: "#fff",
    outlineWidth: 0,
  },
  // Password container styles
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 14,
    outlineWidth: 0,
  },
  eyeIcon: {
    padding: 10,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
  },
  inputText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  placeholderText: {
    color: "#abababff",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  column: {
    flex: 0.48,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    zIndex: 1000,
    marginTop: 5,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
    textTransform: "capitalize",
  },
  nextBtn: {
    backgroundColor: "#7B61FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 25,
    width: "80%",
    alignSelf: "center",
  },
  backBtn: {
    backgroundColor: "#F4F4F4",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 15,
    width: "80%",
    alignSelf: "center",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  nextText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  backText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
    backgroundColor: "#F4F4F4",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginTop: 15,
    alignSelf: "center",
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
