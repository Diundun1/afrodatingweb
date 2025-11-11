import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MyStatusBar from "../components/MyStatusBar";
import BottomButtons from "../components/BottomButtons";

export default function FilterScreen() {
  const navigation = useNavigation();

  // State for filters
  const [location, setLocation] = useState("");
  const [distance, setDistance] = useState(60);
  const [menSelected, setMenSelected] = useState(true);
  const [minAge, setMinAge] = useState(22);
  const [maxAge, setMaxAge] = useState(32);
  const [profession, setProfession] = useState("");
  const [religion, setReligion] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState("");

  const handleApply = async () => {
    if (minAge > maxAge) {
      setNotif("Minimum age cannot be greater than maximum age");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setNotif("Please login to set preferences");
        return;
      }

      const payload = {
        gender: menSelected ? "male" : "female",
        religion: religion || undefined,
        ageRange: {
          min: minAge,
          max: maxAge,
        },
        distance: Math.round(distance),
        profession: profession || undefined,
      };

      console.log("Sending preferences:", payload);
      console.log("Token:", token);

      const response = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/users/set-preference",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      // Get response text first
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Raw response:", responseText);

      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        data = { message: "Invalid server response" };
      }

      if (response.ok) {
        const successMessage =
          data.message || "Preferences saved successfully!";
        setNotif(successMessage);

        console.log("Preferences saved:", data);

        // Navigate back after success
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        // Handle different error cases
        if (response.status === 400) {
          setNotif(data.message || "All fields are required");
        } else if (response.status === 401) {
          setNotif("Please login again");
        } else if (response.status === 500) {
          setNotif("Server error. Please try again later.");
        } else {
          setNotif(
            data.message || `Failed to save preferences (${response.status})`
          );
        }

        console.error("Error response:", data);
      }
    } catch (error) {
      console.error("Network error:", error);
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        setNotif("Network error. Please check your connection.");
      } else {
        setNotif("Failed to save preferences. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    // Reset to default values
    setLocation("");
    setDistance(60);
    setMenSelected(true);
    setMinAge(22);
    setMaxAge(32);
    setProfession("");
    setReligion("");
    setNotif("Filters cleared");
  };

  const GenderButton = ({ label, isMale }) => (
    <TouchableOpacity
      style={[
        styles.genderButton,
        menSelected === isMale && styles.genderButtonActive,
      ]}
      onPress={() => setMenSelected(isMale)}>
      <Text
        style={[
          styles.genderText,
          menSelected === isMale && styles.genderTextActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <MyStatusBar notif={notif} setNotif={setNotif} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Filters</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationInputContainer}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <TextInput
              placeholder="Enter location (e.g., Kenya, Lagos)"
              style={styles.locationInput}
              placeholderTextColor="#999"
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Maximum Distance</Text>
            <Text style={styles.valueText}>{Math.round(distance)} km</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={distance}
            minimumTrackTintColor="#7B61FF"
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor="#7B61FF"
            onValueChange={setDistance}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1 km</Text>
            <Text style={styles.sliderLabel}>100 km</Text>
          </View>
        </View>

        {/* Gender */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interested In</Text>
          <View style={styles.genderRow}>
            <GenderButton label="Man" isMale={true} />
            <GenderButton label="Woman" isMale={false} />
          </View>
        </View>

        {/* Age Range */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Age Range</Text>
            <Text style={styles.valueText}>
              {minAge} - {maxAge}
            </Text>
          </View>

          {/* Min Age Slider */}
          <View style={styles.ageSliderContainer}>
            <Text style={styles.ageLabel}>Min Age: {minAge}</Text>
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={maxAge - 1}
              step={1}
              value={minAge}
              minimumTrackTintColor="#7B61FF"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#7B61FF"
              onValueChange={(value) => setMinAge(value)}
            />
          </View>

          {/* Max Age Slider */}
          <View style={styles.ageSliderContainer}>
            <Text style={styles.ageLabel}>Max Age: {maxAge}</Text>
            <Slider
              style={styles.slider}
              minimumValue={minAge + 1}
              maximumValue={50}
              step={1}
              value={maxAge}
              minimumTrackTintColor="#7B61FF"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#7B61FF"
              onValueChange={(value) => setMaxAge(value)}
            />
          </View>

          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>18</Text>
            <Text style={styles.sliderLabel}>50</Text>
          </View>
        </View>

        {/* Profession */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profession</Text>
          <TextInput
            placeholder="Enter profession (optional)"
            style={styles.textInput}
            placeholderTextColor="#999"
            value={profession}
            onChangeText={setProfession}
          />
        </View>

        {/* Religion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Religion</Text>
          <TextInput
            placeholder="Enter religion (optional)"
            style={styles.textInput}
            placeholderTextColor="#999"
            value={religion}
            onChangeText={setReligion}
          />
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.applyButton, loading && styles.disabledButton]}
          onPress={handleApply}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.applyText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>

      <BottomButtons />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  valueText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7B61FF",
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 4,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  genderButtonActive: {
    backgroundColor: "#7B61FF",
    borderColor: "#7B61FF",
  },
  genderText: {
    color: "#64748B",
    fontWeight: "500",
    fontSize: 14,
  },
  genderTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  ageSliderContainer: {
    marginBottom: 20,
  },
  ageLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#1E293B",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#7B61FF",
  },
  disabledButton: {
    opacity: 0.6,
  },
  clearText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  applyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
