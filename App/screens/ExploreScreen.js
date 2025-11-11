import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SwipeableCard from "../components/SwipeableCard";
import BottomButtons from "../components/BottomButtons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import MyStatusBar from "../components/MyStatusBar";

const { width, height } = Dimensions.get("window");

// Placeholder images for users without profile pictures
const placeholders = [
  require("../assets/images/users/1.png"),
  require("../assets/images/users/2.png"),
  require("../assets/images/users/3.png"),
];

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 25;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};

export default function ExploreScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notif, setNotif] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  // Separate API call functions for button clicks
  const handleLikeButton = async (userId) => {
    console.log("Like button pressed for user:", userId);

    const token = await AsyncStorage.getItem("userToken");
    const action = "like";

    try {
      const response = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/match/like-or-dislike",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: userId,
            action: action,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `HTTP error! Status: ${response.status}, Response: ${text}`
        );
      }

      const data = await response.json();
      console.log("Like action successful:", data);

      // Remove the card after successful like
      removeCard(userId);
      setNotif(`You liked ${users.find((user) => user.id === userId)?.name}!`);
    } catch (error) {
      console.error("Error sending like action:", error.message);
      let errorMessage = "Failed to register like. Please try again.";

      try {
        const jsonStart = error.message.indexOf("{");
        if (jsonStart !== -1) {
          const jsonString = error.message.substring(jsonStart);
          const errorData = JSON.parse(jsonString);
          errorMessage = errorData.message || errorMessage;
        }
      } catch (parseError) {
        console.log("Could not parse error message:", parseError);
      }

      setNotif(errorMessage);
    }
  };

  const handleDislikeButton = async (userId) => {
    console.log("Dislike button pressed for user:", userId);

    const token = await AsyncStorage.getItem("userToken");
    const action = "dislike";

    try {
      const response = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/match/like-or-dislike",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: userId,
            action: action,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `HTTP error! Status: ${response.status}, Response: ${text}`
        );
      }

      const data = await response.json();
      console.log("Dislike action successful:", data);

      // Remove the card after successful dislike
      removeCard(userId);
      setNotif(
        `You passed on ${users.find((user) => user.id === userId)?.name}`
      );
    } catch (error) {
      console.error("Error sending dislike action:", error.message);
      let errorMessage = "Failed to register dislike. Please try again.";

      try {
        const jsonStart = error.message.indexOf("{");
        if (jsonStart !== -1) {
          const jsonString = error.message.substring(jsonStart);
          const errorData = JSON.parse(jsonString);
          errorMessage = errorData.message || errorMessage;
        }
      } catch (parseError) {
        console.log("Could not parse error message:", parseError);
      }

      setNotif(errorMessage);
    }
  };

  const fetchUsers = async (likedByIds = [], youLikedIds = []) => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("userToken");

      console.log(token);
      if (!token) throw new Error("No token found. Please log in again.");

      console.log("Fetching users from API...");

      const response = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/users/by-preferences",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("API Response Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      console.log("API Response Data:", data);

      const usersArray = data.users || data.nearByUser || [];

      if (usersArray.length > 0) {
        const formattedUsers = usersArray.map((user) => {
          let profilePicture = null;

          if (user.profile_pic && user.profile_pic?.length > 0) {
            const picUrl =
              typeof user.profile_pic[0] === "string"
                ? user.profile_pic[0]
                : user.profile_pic[0].url || user.profile_pic[0].uri;

            profilePicture = { uri: picUrl || "../assets/images/users/1.png" };
          } else {
            profilePicture =
              placeholders[Math.floor(Math.random() * placeholders.length)];
          }

          const locationParts = user.address ? user.address.split(",") : [];
          const locationName =
            locationParts.length > 0 ? locationParts[0].trim() : "";

          return {
            id: user._id,
            name: user.name,
            age: calculateAge(user.date_of_birth),
            profession: user.occupation || "Not specified",
            distance: user.distance || 0,
            location: user.country || user.address || "Unknown",
            locationName: locationName,
            image: profilePicture,
            bio: user.bio || "",
            isFavorite: youLikedIds.includes(user._id),
            hasLikedYou: likedByIds.includes(user._id),
            email: user.email,
            gender: user.gender,
            marital_status: user.marital_status,
            religion: user.religion,
            degree: user.degree,
          };
        });

        console.log("Formatted Users Data:", formattedUsers);
        setUsers(formattedUsers);
      } else {
        console.warn("No users found in response");
        setError("No users found nearby");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = (userId, direction) => {
    console.log(`Swiped ${direction} on user ${userId}`);
    // Remove the swiped user from the list
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleCardPress = (userId) => {
    const usernx = users.find((u) => u.id === userId);
    const user = usernx.id;
    console.log(user);
    navigation.navigate("ProfileDetailScreen", { user });
  };

  const refreshData = () => {
    fetchUsers();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MyStatusBar notif={notif} setNotif={setNotif} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.preferenceButton}>
          <Ionicons name="options-outline" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity
          style={styles.preferenceButton}
          onPress={() => navigation.navigate("Preferences")}>
          <Ionicons name="options-outline" size={24} color="#7B61FF" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {users.length > 0 ? (
          <View style={styles.cardsContainer}>
            {users.map((user, index) => (
              <View
                key={user.id}
                style={[styles.cardWrapper, { zIndex: users.length - index }]}>
                <SwipeableCard
                  onSwipeLeft={() => handleSwipe(user.id, "left")}
                  onSwipeRight={() => handleSwipe(user.id, "right")}
                  onPress={() => handleCardPress(user.id)}
                  userId={user.id}
                  onSwipeComplete={(userId, direction, data) => {
                    setNotif("Profile Swipe was successful");
                    console.log(
                      `Swipe completed for user ${userId} with direction ${direction}`
                    );
                  }}
                  onSwipeError={(error, userId, direction) => {
                    setNotif(
                      "You do not have access to this feature, please upgrade your plan"
                    );

                    console.error(`Swipe error for user ${userId}:`, error);
                  }}>
                  <ImageBackground
                    source={user.image || "../assets/images/users/1.png"}
                    style={styles.cardImage}
                    resizeMode="cover">
                    <LinearGradient
                      colors={[
                        "rgba(0, 0, 0, 0.58)",
                        "rgba(0, 0, 0, 0)",
                        "rgba(0, 0, 0, 0)",
                        "rgba(0, 0, 0, 0.58)",
                      ]}
                      style={styles.gradientOverlay}>
                      {/* Top section - Likes You badge and location */}
                      <View style={styles.topSection}>
                        {user.hasLikedYou && (
                          <View style={styles.likedBadge}>
                            <Ionicons name="heart" size={16} color="#fff" />
                            <Text style={styles.likedBadgeText}>Likes You</Text>
                          </View>
                        )}
                        <View style={styles.locationContainer}>
                          <Ionicons name="location" size={16} color="#fff" />
                          <Text style={styles.locationText}>
                            {user.distance.toFixed(1)}km away (
                            {user.locationName})
                          </Text>
                        </View>
                      </View>

                      {/* Bottom section with user info and actions */}
                      <View style={styles.bottomSection}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDislikeButton(user.id)}>
                          <View style={styles.buttonIcon}>
                            <Ionicons name="close" size={24} color="#FF6B6B" />
                          </View>
                          <Text style={styles.buttonText}>Dislike</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.userInfoContainer}
                          onPress={() => handleCardPress(user.id)}>
                          <Text style={styles.userName}>
                            {user.name}, {user.age}
                          </Text>
                          <Text style={styles.userProfession}>
                            {user.profession}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleLikeButton(user.id)}>
                          <View style={styles.buttonIcon}>
                            <Ionicons name="heart" size={24} color="#6C63FF" />
                          </View>
                          <Text style={styles.buttonText}>Like</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </SwipeableCard>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noUsersContainer}>
            <Ionicons name="people-outline" size={80} color="#7B61FF" />
            <Text style={styles.noUsersTitle}>No more profiles</Text>
            <Text style={styles.noUsersText}>
              Check back later for new matches in your area
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshData}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <BottomButtons />
      </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    alignSelf: "center",
    color: "#1F2937",
  },
  preferenceButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cardsContainer: {
    width: "100%",
    height: height * 0.72,
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: "space-between",
    borderRadius: 20,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 16,
  },
  likedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 77, 109, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  likedBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  locationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  bottomSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 16,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  userInfoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  userProfession: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    marginTop: 4,
  },
  noUsersContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  noUsersTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 20,
    marginBottom: 12,
  },
  noUsersText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: "#7B61FF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomNav: {
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: "#7B61FF",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
