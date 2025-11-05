import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BottomButtons from "../components/BottomButtons";
import { NunitoTitle } from "../components/NunitoComponents";
import { useNavigation } from "@react-navigation/native";
import { ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen({}) {
  const navigation = useNavigation();
  const [isPremium, setIsPremium] = React.useState(false);
  const [user, setUser] = useState(null);

  const [profilePics, setProfilePics] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewCount, setViewCount] = useState(null);
  const [error, setError] = useState(null);
  const [temptoken, setTempToken] = useState("");
  const [profilePic, setProfilePic] = useState(null);

  const menuItems = [
    {
      id: 1,
      title: "Account Info",
      icon: "person-outline",
      screen: "AccountInfoScreen",
    },
    {
      id: 2,
      title: "Contact List",
      icon: "people-outline",
      screen: "ContactList",
    },
    {
      id: 3,
      title: "Language",
      icon: "language-outline",
      screen: "Language",
    },
    {
      id: 4,
      title: "General Setting",
      icon: "settings-outline",
      screen: "GeneralSetting",
    },
    {
      id: 5,
      title: "Change Password",
      icon: "lock-closed-outline",
      screen: "ChangePassword",
    },
  ];

  const fetchUserAndProfilePics = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("userToken");
      const userId = await AsyncStorage.getItem("loggedInUserId");

      if (!token || !userId) {
        console.error("Missing token or user ID");
        setError("Authentication required");
        return;
      }

      // 1️⃣ Fetch user details
      const userResponse = await fetch(
        "https://closematch-backend-seix.onrender.com/api/v1/users/me",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }

      const userData = await userResponse.json();
      console.log("Fetched user data:", userData);

      // 2️⃣ Safely extract image URL from userData
      const imageUrl = userData?.profile_pic?.[0]?.url; // ✅ Correct access

      // 3️⃣ Validate the image URL
      if (imageUrl) {
        try {
          const check = await fetch(imageUrl, { method: "HEAD" });
          if (check.ok) {
            setProfilePic({ uri: imageUrl });
          } else {
            console.warn("Profile image URL invalid, using local fallback");
            setProfilePic(require("../assets/images/users/1.png"));
          }
        } catch (err) {
          console.warn("Image fetch failed:", err.message);
          setProfilePic(require("../assets/images/users/2.png"));
        }
      } else {
        console.log("No online image found — using local fallback");
        setProfilePic(require("../assets/images/users/3.png"));
      }

      // 4️⃣ Optionally fetch all profile pictures (if needed)
      const profilePicResponse = await fetch(
        `https://closematch-backend-seix.onrender.com/api/v1/users/${userId}/profile-pictures`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (profilePicResponse.ok) {
        const profileData = await profilePicResponse.json();
        console.log("Profile photos:", profileData);
        setProfilePics(profileData);
      } else {
        console.error("Failed to fetch profile pictures");
      }

      // 5️⃣ Set user info
      setUser(userData);
    } catch (error) {
      console.error("Error fetching user or profile pictures:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndProfilePics();
  }, []); // Added empty dependency array to prevent infinite loops

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B61FF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchUserAndProfilePics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <BottomButtons />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("ExploreScreen")}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <NunitoTitle style={styles.headerTitle}>Profile</NunitoTitle>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate("EditAccountScreen")}>
          <Ionicons name="pencil-outline" size={20} color="#7B61FF" />
        </TouchableOpacity>
      </View>
      {user ? (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}>
          {/* Header */}

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <Image
              source={profilePic || require("../assets/images/users/1.png")}
              style={styles.avatar}
            />
            <NunitoTitle style={styles.userName}>
              {user.name || "Afro Dating"}
            </NunitoTitle>
            <NunitoTitle style={styles.userEmail}>
              {user.email || "user@afrodating.com"}
            </NunitoTitle>

            {/* Premium Badge 
          <TouchableOpacity style={styles.premiumBadge}>
            <Ionicons name="diamond" size={16} color="#FFD700" />
            <NunitoTitle style={styles.premiumText}>Premium Member</NunitoTitle>
          </TouchableOpacity>
          */}
          </View>

          {/* Payment & Upgrade Section
        <View style={styles.section}>
          <NunitoTitle style={styles.sectionTitle}>Payment & Upgrade</NunitoTitle>
          <View style={styles.upgradeCard}>
            <View style={styles.upgradeInfo}>
              <NunitoTitle style={styles.upgradeTitle}>Go Premium</NunitoTitle>
              <NunitoTitle style={styles.upgradeDescription}>
                Unlock all features and get unlimited matches
              </NunitoTitle>
              <NunitoTitle style={styles.upgradePrice}>$9.99/month</NunitoTitle>
            </View>
            <Switch
              value={isPremium}
              onValueChange={setIsPremium}
              trackColor={{ false: "#E5E7EB", true: "#7B61FF" }}
              thumbColor={isPremium ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>
         */}

          {/* Menu Items */}
          <View style={styles.section}>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate("PremiumScreen")}>
                <View style={styles.menuLeft}>
                  <Ionicons name={"diamond"} size={22} color="#FB923C" />
                  <NunitoTitle style={styles.menuText}>
                    Payment & Upgrade
                  </NunitoTitle>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => navigation.navigate(item.screen)}>
                  <View style={styles.menuLeft}>
                    <Ionicons name={item.icon} size={22} color="#7B61FF" />
                    <NunitoTitle style={styles.menuText}>
                      {item.title}
                    </NunitoTitle>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout Button 
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <NunitoTitle style={styles.logoutText}>Log Out</NunitoTitle>
        </TouchableOpacity>
        */}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e1e1e" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      <BottomButtons />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  profileSection: {
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#7B61FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  premiumText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B8860B",
    marginLeft: 6,
  },
  section: {
    //  paddingVertical: 24,
    backgroundColor: "white",
    elevation: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 30,
  },

  upgradeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  upgradeDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 20,
  },
  upgradePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7B61FF",
  },
  menuContainer: {},
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignContent: "center",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    color: "#1D3A70",
    marginLeft: 16,
    fontWeight: "500",
    //  backgroundColor: "red",
    marginBottom: -5,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginVertical: 24,
    paddingVertical: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 8,
  },
});
