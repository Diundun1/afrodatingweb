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
  const [fullName, setFullName] = useState("Rodney Chukwuemeka");
  const [email, setEmail] = useState("t@t.com");
  const [password, setPassword] = useState("123123123");
  const [phoneNumber, setPhoneNumber] = useState("07011290915");
  const [address, setAddress] = useState("Nigeria");
  const [country, setCountry] = useState("Nigeria");
  const [bio, setBio] = useState("Lovely");
  const [occupation, setOccupation] = useState("Big");
  const [degree, setDegree] = useState("Dev");
  const [religion, setReligion] = useState("Christianity");
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const tempDate = "Date Of Birth";
  const [notif, setNotif] = useState("");

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Date picker states
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [gender, setGender] = useState("");
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const [secondForm, setSecondForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDate(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
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
    if (!validateForm()) return;

    setLoading(true);

    // Debug: Check what we have
    console.log("Date value:", date);
    console.log("Date type:", typeof date);
    console.log("Is Date instance:", date instanceof Date);

    // Ensure we have a valid Date object for date_of_birth
    let dateOfBirthToSend;

    if (date instanceof Date && !isNaN(date.getTime())) {
      // If it's already a valid Date object
      dateOfBirthToSend = date;
    } else {
      // Fallback - use a reasonable default (25 years ago)
      dateOfBirthToSend = new Date();
      dateOfBirthToSend.setFullYear(dateOfBirthToSend.getFullYear() - 25);
      console.log("Using fallback date:", dateOfBirthToSend);
    }

    const requestBody = {
      name: fullName,
      email,
      password,
      phone: phoneNumber,
      gender: gender,
      date_of_birth: "05-08-2001", // This will now work
      address,
      bio,
      occupation,
      country: country,
      latitude,
      longitude,
      degree,
      religion: religion.toLowerCase(),
      marital_status: maritalStatus.toLowerCase(),
      location:
        latitude && longitude
          ? {
              type: "Point",
              coordinates: [longitude, latitude],
            }
          : null,
    };

    console.log("Raw JSON being sent to backend:");
    console.log(JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(
        "https://closematch-backend-seix.onrender.com/api/v1/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const responseText = await response.text();

      console.log("Status Code:", response.status);
      console.log("Raw Response:", responseText);

      setNotif(responseText.error);

      if (response.status === 400) {
        setNotif("User already exists");
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Parsed Response:", data);
      } catch (err) {
        console.log("Failed to parse JSON:", err.message);
        data = { message: "Unexpected response from server" };
      }

      if (response.status === 201) {
        setNotif("Registration successful");
        navigation.replace("LoginScreen");
      } else {
        setNotif(data.message || "Something went wrong. Try again.");
        Alert.alert(
          "Error",
          data.message || "Something went wrong. Try again."
        );
      }
    } catch (error) {
      console.log("Network/Fetch error:", error.message);
      setNotif("Network error. Please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MyStatusBar notif={notif} setNotif={setNotif} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
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
                ]}>
                Create Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("LoginScreen")}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === "login" && styles.activeTab,
                ]}>
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

                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your address"
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
                  onChange={(date) => setDate(date)}
                />
                <Text style={styles.label}>Gender</Text>
                <TouchableOpacity
                  style={[styles.inputWithIcon, { zIndex: 999 }]}
                  onPress={() => setShowGenderDropdown(!showGenderDropdown)}>
                  <Ionicons
                    name={showGenderDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#7B61FF"
                  />
                  <Text
                    style={[
                      styles.inputText,
                      !gender && styles.placeholderText,
                    ]}>
                    {gender || "Select Gender"}
                  </Text>

                  {showGenderDropdown && (
                    <View style={styles.dropdown}>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => handleGenderSelect("Male")}>
                        <Text style={styles.dropdownText}>Male</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => handleGenderSelect("Female")}>
                        <Text style={styles.dropdownText}>Female</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dropdownOption}
                        onPress={() => handleGenderSelect("Other")}>
                        <Text style={styles.dropdownText}>Other</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Register Button */}
                <TouchableOpacity
                  style={[styles.nextBtn, loading && styles.disabledBtn]}
                  onPress={registerUser}
                  disabled={loading}>
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
                  disabled={loading}>
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
                  maxLength={25}
                  placeholderTextColor={"#7b7b7b75"}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  // secureTextEntry
                  keyboardType="default"
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor={"#7b7b7b75"}
                />

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
