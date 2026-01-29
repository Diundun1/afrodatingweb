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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { NunitoTitle } from "../components/NunitoComponents";
import { useNavigation } from "@react-navigation/native";
import MyStatusBar from "../components/MyStatusBar";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditAccountScreen({ navigation }) {
  const [notif, setNotif] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingImages, setUploadingImages] = useState({});

  // Profile pictures state
  const [profilePictures, setProfilePictures] = useState([]);
  const [selectedImages, setSelectedImages] = useState({});
  const MAX_IMAGES = 5;

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

  // Format date for display
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
        setNotif("Authentication token not found");
        return;
      }

      const response = await fetch("http://localhost:5000/api/v1/users/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("User data fetched:", data);

      if (response.ok) {
        setUserId(data._id);
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

        // Fetch profile pictures after getting user data
        await fetchProfilePictures(token);
      } else {
        setNotif(data.message || "Failed to fetch user data");
      }
    } catch (error) {
      setNotif("Something went wrong while fetching user data");
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  // Fetch profile pictures
  const fetchProfilePictures = async (token = null) => {
    try {
      if (!token) {
        token = await AsyncStorage.getItem("userToken");
      }

      const response = await fetch(
        "http://localhost:5000/api/v1/users/profile-pictures",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (response.ok) {
        setProfilePictures(data.images || []);
      } else {
        console.log("No profile pictures found or error:", data.message);
        setProfilePictures([]);
      }
    } catch (error) {
      console.error("Error fetching profile pictures:", error);
      setProfilePictures([]);
    }
  };

  // Get random placeholder image
  const getRandomPlaceholder = (index) => {
    const placeholders = [
      require("../assets/images/users/1.png"),
      require("../assets/images/users/2.png"),
      require("../assets/images/users/3.png"),
      require("../assets/images/users/4.png"),
      require("../assets/images/users/4.png"),
    ];
    return placeholders[index % placeholders.length];
  };

  // Handle image selection
  const pickImage = async (position) => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setNotif("We need camera roll permissions to make this work!");

        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setSelectedImages((prev) => ({
          ...prev,
          [position]: selectedImage.uri,
        }));

        await uploadImage(position, selectedImage.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setNotif("Something went wrong while selecting image ", error);
    }
  };
  // ALTERNATIVE UPLOAD FUNCTION - More robust
  const uploadImage = async (position, imageUri) => {
    setUploadingImages((prev) => ({ ...prev, [position]: true }));

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Create a Blob from the image (alternative approach)
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const formData = new FormData();

      // Append as Blob
      formData.append(
        "profilePictures",
        blob,
        `profile_${position}_${Date.now()}.jpg`,
      );

      const uploadResponse = await fetch(
        "http://localhost:5000/api/v1/users/profile-pictures",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const result = await uploadResponse.json();
      console.log("Upload result:", result);

      if (uploadResponse.ok) {
        setNotif(`Photo uploaded successfully!`);
        await fetchProfilePictures(token);

        setSelectedImages((prev) => {
          const newSelected = { ...prev };
          delete newSelected[position];
          return newSelected;
        });
      } else {
        throw new Error(result.message || result.error || "Upload failed");
      }
    } catch (error) {
      setNotif(error.message || "Failed to upload image");
    } finally {
      setUploadingImages((prev) => ({ ...prev, [position]: false }));
    }
  };

  const getImageSource = (position) => {
    if (selectedImages[position]) {
      return { uri: selectedImages[position] };
    }

    const uploadedImage = profilePictures[position];
    if (uploadedImage && uploadedImage.url) {
      return { uri: uploadedImage.url };
    }

    return getRandomPlaceholder(position);
  };

  const ProfileImagesSection = () => (
    <View style={styles.profileImagesContainer}>
      <Text style={styles.sectionTitle}>Profile Photos</Text>
      <Text style={styles.sectionSubtitle}>
        Add up to {MAX_IMAGES} photos. The first photo will be your main profile
        picture.
      </Text>

      <View style={styles.imagesGrid}>
        {Array.from({ length: MAX_IMAGES }).map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.imageContainer,
              index === 0 && styles.primaryImageContainer,
            ]}
            onPress={() => pickImage(index)}
            disabled={uploadingImages[index]}
          >
            <Image source={getImageSource(index)} style={styles.profileImage} />

            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Main</Text>
              </View>
            )}

            {/* Uploading overlay */}
            {uploadingImages[index] && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}

            {/* Add/Edit overlay */}
            {!uploadingImages[index] && (
              <View style={styles.imageOverlay}>
                <MaterialIcons
                  name={
                    profilePictures[index] || selectedImages[index]
                      ? "edit"
                      : "add-a-photo"
                  }
                  size={20}
                  color="#FFFFFF"
                />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.photoHelpText}>
        Tap any photo to {profilePictures.length > 0 ? "change" : "add"} it
      </Text>
    </View>
  );

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Update user profile API call
  const updateUserProfile = async () => {
    if (!userId) {
      await AsyncStorage.clear();
      navigation.replace("LoginScreen");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        await AsyncStorage.clear();
        navigation.replace("LoginScreen");
        return;
      }

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
        `http://localhost:5000/api/v1/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to update profile");
        return;
      }

      setNotif("Profile updated successfully!");
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
      {/* Profile Images Skeleton */}
      <View style={styles.profileImagesContainer}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
        <View style={styles.imagesGrid}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={styles.skeletonImageContainer}>
              <View style={styles.skeletonImage} />
            </View>
          ))}
        </View>
      </View>

      {/* Form Skeleton */}
      <View style={styles.formCard}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((item) => (
          <View
            key={item}
            style={[
              styles.inputContainer,
              item < 11 && styles.inputContainerBorder,
            ]}
          >
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonInput} />
          </View>
        ))}
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
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
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
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Images Section */}
            <ProfileImagesSection />

            {/* Form Section */}
            <View style={styles.content}>
              <View style={styles.formCard}>
                {fields.map((field, index) => (
                  <View
                    key={field.key}
                    style={[
                      styles.inputContainer,
                      index < fields.length - 1 && styles.inputContainerBorder,
                    ]}
                  >
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
            style={[
              styles.saveButton,
              (loading || fetching) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={loading || fetching}
          >
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
  content: {
    padding: 20,
  },
  // Profile Images Styles
  profileImagesContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  imageContainer: {
    width: "31%",
    aspectRatio: 1,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  primaryImageContainer: {
    borderWidth: 2,
    borderColor: "#7B61FF",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  primaryBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#7B61FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primaryBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  photoHelpText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  // Form Styles
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
  // Save Button Styles
  saveButtonContainer: {
    padding: 20,
    paddingTop: 10,
  },
  saveButton: {
    backgroundColor: "#7B61FF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Skeleton Styles
  skeletonTitle: {
    height: 18,
    width: "40%",
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 14,
    width: "80%",
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    marginBottom: 20,
  },
  skeletonImageContainer: {
    width: "31%",
    aspectRatio: 1,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  skeletonImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
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
});

// Add hover effect for web (if needed)
if (Platform.OS === "web") {
  styles.imageContainer = {
    ...styles.imageContainer,
    cursor: "pointer",
    transition: "transform 0.2s ease",
  };

  // Web hover effect
  const webHoverStyle = `
    .imageContainer:hover .imageOverlay {
      opacity: 1 !important;
    }
  `;
}
