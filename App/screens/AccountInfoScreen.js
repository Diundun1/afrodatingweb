import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NunitoTitle } from "../components/NunitoComponents";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AccountInfoScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profilePic, setProfilePic] = useState(null);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setError("Authentication token not found");
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
        setUserInfo(data);

        // Set profile picture
        const imageUrl = data?.profile_pic?.[0]?.url;
        if (imageUrl) {
          try {
            const check = await fetch(imageUrl, { method: "HEAD" });
            if (check.ok) {
              setProfilePic({ uri: imageUrl });
            } else {
              setProfilePic(require("../assets/images/users/1.png"));
            }
          } catch (err) {
            setProfilePic(require("../assets/images/users/1.png"));
          }
        } else {
          setProfilePic(require("../assets/images/users/1.png"));
        }
      } else {
        setError(data.message || "Failed to fetch user data");
      }
    } catch (error) {
      setError("Something went wrong while fetching user data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const infoSections = userInfo
    ? [
        {
          title: "Personal Info",
          items: [
            { label: "Your name", value: userInfo.name || "Not specified" },
            {
              label: "Occupation",
              value: userInfo.occupation || "Not specified",
            },
            {
              label: "Gender",
              value: userInfo.gender
                ? userInfo.gender.charAt(0).toUpperCase() +
                  userInfo.gender.slice(1)
                : "Not specified",
            },
            {
              label: "Age",
              value: userInfo.age ? `${userInfo.age}` : "Not specified",
            },
            { label: "Country", value: userInfo.country || "Not specified" },
            { label: "Address", value: userInfo.address || "Not specified" },
          ],
        },
        {
          title: "Education & Background",
          items: [
            { label: "Degree", value: userInfo.degree || "Not specified" },
            { label: "Religion", value: userInfo.religion || "Not specified" },
            {
              label: "Marital Status",
              value: userInfo.marital_status || "Not specified",
            },
          ],
        },
        {
          title: "Contact Info",
          items: [
            { label: "Phone number", value: userInfo.phone || "Not specified" },
            { label: "Email", value: userInfo.email || "Not specified" },
          ],
        },
        {
          title: "About Me",
          items: [{ label: "Bio", value: userInfo.bio || "No bio available" }],
        },
      ]
    : [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <NunitoTitle style={styles.headerTitle}>Account Info</NunitoTitle>
          <View style={styles.editButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B61FF" />
          <NunitoTitle style={styles.loadingText}>
            Loading account info...
          </NunitoTitle>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <NunitoTitle style={styles.headerTitle}>Account Info</NunitoTitle>
          <View style={styles.editButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <NunitoTitle style={styles.errorText}>{error}</NunitoTitle>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchUserProfile}
          >
            <NunitoTitle style={styles.retryButtonText}>Try Again</NunitoTitle>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <NunitoTitle style={styles.headerTitle}>Account Info</NunitoTitle>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate("EditAccountScreen")}
        >
          <Ionicons name="pencil" size={20} color="#7B61FF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={profilePic || require("../assets/images/users/1.png")}
            style={styles.avatar}
          />
          <NunitoTitle style={styles.userName}>
            {userInfo?.name || "User"}
          </NunitoTitle>
          <NunitoTitle style={styles.userEmail}>
            {userInfo?.email || "No email"}
          </NunitoTitle>
        </View>

        {/* Info Sections */}
        <View style={styles.content}>
          {infoSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <NunitoTitle style={styles.sectionTitle}>
                {section.title}
              </NunitoTitle>
              <View style={styles.infoCard}>
                {section.items.map((item, itemIndex) => (
                  <View
                    key={itemIndex}
                    style={[
                      styles.infoItem,
                      itemIndex < section.items.length - 1 &&
                        styles.infoItemBorder,
                    ]}
                  >
                    <NunitoTitle style={styles.infoLabel}>
                      {item.label}
                    </NunitoTitle>
                    <NunitoTitle style={styles.infoValue}>
                      {item.value}
                    </NunitoTitle>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          style={styles.editAccountButton}
          onPress={() => navigation.navigate("EditAccountScreen")}
        >
          <NunitoTitle style={styles.editAccountText}>
            Edit Account Information
          </NunitoTitle>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 2,
    backgroundColor: "#F3F4F6",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D3A70",
    marginBottom: -5,
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  backButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 16,
  },
  infoCard: {
    overflow: "hidden",
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  infoItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1D3A70",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 10,
  },
  editAccountButton: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  editAccountText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7B61FF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: "#7B61FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
