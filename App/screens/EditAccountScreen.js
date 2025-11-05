import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { NunitoTitle } from "../components/NunitoComponents";
import { useNavigation } from "@react-navigation/native";
import MyStatusBar from "../components/MyStatusBar";

import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditAccountScreen({ navigation }) {
  const [notif, setNotif] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    occupation: "",
    email: "",
    phone: "",
    bio: "",
    address: "",
    country: "",
    degree: "",
    religion: "",
    marital_status: "",
    date_of_birth: "",
    age: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userId, setUserId] = useState(null);

  // Format date for display (from "2001-05-08T00:00:00.000Z" to "2001-05-08")
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    return dateString.split("T")[0];
  };

  // Fetch user profile information
  const fetchUserProfile = async () => {
    setFetching(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const response = await fetch(
        "https://closematch-backend-seix.onrender.com/api/v1/users/me",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log("User data fetched:", data);

      if (response.ok) {
        setUserId(data._id);

        // Update form data with fetched user information
        setFormData({
          name: data.name || "",
          occupation: data.occupation || "",
          email: data.email || "",
          phone: data.phone || "",
          bio: data.bio || "",
          address: data.address || "",
          country: data.country || "",
          degree: data.degree || "",
          religion: data.religion || "",
          marital_status: data.marital_status || "",
          date_of_birth: formatDateForInput(data.date_of_birth) || "",
          age: data.age?.toString() || "",
        });
      } else {
        Alert.alert("Error", data.message || "Failed to fetch user data");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong while fetching user data");
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Update user profile API call
  const updateUserProfile = async () => {
    if (!userId) {
      Alert.alert("Error", "User ID not found");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      // Prepare data for API - convert age to number and format date
      const updateData = {
        name: formData.name,
        occupation: formData.occupation,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        address: formData.address,
        country: formData.country,
        degree: formData.degree,
        religion: formData.religion,
        marital_status: formData.marital_status,
        date_of_birth: formData.date_of_birth
          ? `${formData.date_of_birth}T00:00:00.000Z`
          : "",
        age: formData.age ? parseInt(formData.age) : 0,
      };

      const response = await fetch(
        `https://closematch-backend-seix.onrender.com/api/v1/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to update profile");
        return;
      }

      setNotif("Profile updated successfully");
      setTimeout(() => {
        fetchUserProfile();
      }, 3000);
    } catch (error) {
      console.error("Update Profile Error:", error);
      Alert.alert("Error", "Something went wrong while updating profile");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    updateUserProfile();
  };

  // Skeleton loading component
  const SkeletonLoader = () => (
    <View style={styles.content}>
      <View style={styles.formCard}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((item) => (
          <View
            key={item}
            style={[
              styles.inputContainer,
              item < 11 && styles.inputContainerBorder,
            ]}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonInput} />
          </View>
        ))}
      </View>

      {/* Additional Info Skeleton */}
      <View style={styles.additionalInfo}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonText} />
        <View style={styles.verificationBadge}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonBadgeText} />
        </View>
      </View>
    </View>
  );

  const fields = [
    { label: "Full Name", key: "name", placeholder: "Enter your full name" },
    {
      label: "Occupation",
      key: "occupation",
      placeholder: "Enter your occupation",
    },
    {
      label: "Email",
      key: "email",
      placeholder: "Enter email address",
      keyboardType: "email-address",
    },
    {
      label: "Phone Number",
      key: "phone",
      placeholder: "Enter phone number",
      keyboardType: "phone-pad",
    },
    {
      label: "Bio",
      key: "bio",
      placeholder: "Tell us about yourself",
      multiline: true,
    },
    {
      label: "Address",
      key: "address",
      placeholder: "Enter your address",
    },
    {
      label: "Country",
      key: "country",
      placeholder: "Enter your country",
    },
    {
      label: "Degree/Education",
      key: "degree",
      placeholder: "Enter your degree or education",
    },
    {
      label: "Religion",
      key: "religion",
      placeholder: "Enter your religion",
    },
    {
      label: "Marital Status",
      key: "marital_status",
      placeholder: "e.g., single, married, divorced",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <MyStatusBar notif={notif} setNotif={setNotif} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={20} color="#000" />
          </TouchableOpacity>
          <NunitoTitle style={styles.headerTitle}>Edit Account</NunitoTitle>
          <View style={styles.headerPlaceholder} />
        </View>

        {fetching ? (
          <SkeletonLoader />
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}>
            {/* Form */}
            <View style={styles.content}>
              <View style={styles.formCard}>
                {fields.map((field, index) => (
                  <View
                    key={field.key}
                    style={[
                      styles.inputContainer,
                      index < fields.length - 1 && styles.inputContainerBorder,
                    ]}>
                    <NunitoTitle style={styles.inputLabel}>
                      {field.label}
                    </NunitoTitle>
                    <TextInput
                      style={[
                        styles.textInput,
                        field.multiline && styles.multilineInput,
                      ]}
                      value={formData[field.key]}
                      onChangeText={(text) => updateField(field.key, text)}
                      placeholder={field.placeholder}
                      placeholderTextColor="#9CA3AF"
                      keyboardType={field.keyboardType || "default"}
                      editable={!loading}
                      multiline={field.multiline || false}
                      numberOfLines={field.multiline ? 3 : 1}
                    />
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading || fetching}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  backButton: {
    padding: 8,
  },
  headerPlaceholder: {
    width: 40,
  },
  saveButtonContainer: {
    // padding: 20,
    // paddingTop: 10,
  },
  saveButton: {
    // paddingHorizontal: 16,
    // paddingVertical: 16,
    backgroundColor: "#7B61FF",
    borderRadius: 12,
    alignItems: "center",
    alignContent: "center",
    justifyContent: "center",
    paddingBottom: 0,
  },
  saveButtonDisabled: {
    backgroundColor: "#7B61FF",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "center",
    margin: 20,
    padding: 15,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    // backgroundColor: "red",
    alignSelf: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  inputContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  inputContainerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 8,
    fontWeight: "500",
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  additionalInfo: {
    backgroundColor: "#F0F9FF",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0369A1",
    marginBottom: 8,
  },
  additionalInfoText: {
    fontSize: 14,
    color: "#0C4A6E",
    marginBottom: 12,
    lineHeight: 20,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
    marginLeft: 6,
  },
  // Skeleton loading styles
  skeletonLabel: {
    height: 14,
    width: "40%",
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonInput: {
    height: 20,
    width: "80%",
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
  },
  skeletonTitle: {
    height: 16,
    width: "60%",
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonText: {
    height: 14,
    width: "90%",
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonIcon: {
    width: 20,
    height: 20,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
  },
  skeletonBadgeText: {
    height: 12,
    width: 80,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    marginLeft: 6,
  },
});
