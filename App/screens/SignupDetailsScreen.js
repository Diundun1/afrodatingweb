import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function SignupDetailsScreen({ navigation }) {
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(new Date(1997, 2, 20));
  const [showDate, setShowDate] = useState(false);
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);

  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDate(false);
    setDate(currentDate);
  };

  const handleGenderSelect = (selectedGender) => {
    setGender(selectedGender);
    setShowGenderDropdown(false);
  };

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

  const validateForm = () => {
    if (
      !fullName ||
      !email ||
      !password ||
      !address ||
      !bio ||
      !occupation ||
      !selectedCountry ||
      !phone ||
      !degree ||
      !dob ||
      !maritalStatus ||
      !religion
    ) {
      console.warn("SOme fields are not present");
      Alert.alert("Error", "All fields are required!");
      return false;
    }

    // Validate email format
    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    // Validate password strength
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      Alert.alert("Error", passwordCheck.message);
      return false;
    }

    return true;
  };

  const registerUser = async () => {
    // if (!validateForm()) return;

    setLoading(true);

    const requestBody = {
      name: fullName,
      email,
      password,
      gender: gender.toLowerCase(),
      date_of_birth: dob,
      address,
      latitude,
      longitude,
      bio,
      occupation,
      country: selectedCountry,
      degree,
      religion: religion.toLowerCase(),
      marital_status: maritalStatus.toLowerCase(),

      location:
        latitude && longitude
          ? {
              type: "Point",
              coordinates: [longitude, latitude], // Note: GeoJSON is [long, lat]
            }
          : null,
    };

    // Log the raw JSON being sent to backend
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

      console.log(response);

      console.log(
        "Here is the response:",
        response,
        "... and here is the request body: ",
        requestBody
      );

      const responseText = await response.text(); // raw text for debugging

      // 🔍 Log all parts of the response
      console.log("Status Code:", response.status);
      console.log("Headers:", response.headers);
      console.log("Raw Response:", responseText);

      if (response.status === 400) {
        Alert.alert("User already exists.");
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
        Alert.alert("Success", "Registration successful!");
        navigation.replace("LoginScreen");
      } else {
        /*  Alert.alert(
          "Error",
          data.message || "Something went wrong. Try again."
        );*/
      }
    } catch (error) {
      console.log("Network/Fetch error:", error.message);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* Main content container - centered vertically */}
        <View style={styles.mainContent}>
          <Text style={styles.label}>Country of Residence</Text>
          <TextInput
            style={styles.input}
            placeholder="Eg Kenya"
            value={country}
            onChangeText={setCountry}
            placeholderTextColor={"#7b7b7b75"}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your address"
            value={address}
            onChangeText={setAddress}
            placeholderTextColor={"#7b7b7b75"}
          />

          <View style={styles.row}>
            {/* Date of Birth with Calendar Icon */}

            {/* Gender with Dropdown Icon */}
            <View style={styles.column}>
              <Text style={styles.label}>Gender</Text>
              <TouchableOpacity
                style={styles.inputWithIcon}
                onPress={() => setShowGenderDropdown(!showGenderDropdown)}>
                <Ionicons
                  name={showGenderDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#7B61FF"
                />
                <Text
                  style={[styles.inputText, !gender && styles.placeholderText]}>
                  {gender || "Select Gender"}
                </Text>
              </TouchableOpacity>

              {/* Gender Dropdown Options */}
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
            </View>
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={registerUser}>
            {loading ? (
              <ActivityIndicator size={20} color={"#fff"} />
            ) : (
              <Text style={styles.nextText}>Register</Text>
            )}
          </TouchableOpacity>
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
  inputWithIcon: {
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  inputText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "700",
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  column: {
    flex: 1,
  },
  nextBtn: {
    backgroundColor: "#7B61FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 35,
    width: "80%",
    alignSelf: "center",
  },
  nextText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  dropdown: {
    position: "absolute",
    top: 70, // Position below the input
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#BEC5D1",
    borderRadius: 10,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownText: {
    fontSize: 14,
    color: "#444",
  },
});
