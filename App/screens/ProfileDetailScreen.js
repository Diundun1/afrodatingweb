import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Share,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export default function ProfileDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const userId = route.params?.user;

  const [isExpanded, setIsExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [profilePictures, setProfilePictures] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [distance, setDistance] = useState("");
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({}); // Track failed image loads

  const galleryFlatListRef = useRef(null);

  useEffect(() => {
    console.log("User ID from params:", userId);

    if (!userId) {
      setError("No user ID provided");
      setLoading(false);
      return;
    }

    fetchUserData();
    fetchCurrentUserLocation();
    checkIfUserIsLiked();
  }, [userId]);

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

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (coords1, coords2) => {
    if (!coords1 || !coords2) {
      return "Unknown";
    }

    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return `${distance.toFixed(1)}km`;
  };

  const fetchCurrentUserLocation = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/users/me",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const currentUser = await response.json();

      if (currentUser.location?.coordinates) {
        setCurrentUserLocation(currentUser.location.coordinates);
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
    }
  };

  const checkIfUserIsLiked = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token || !userId) {
        return;
      }

      const response = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/users/you-liked",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        return;
      }

      const likesData = await response.json();
      const { users: likes } = likesData;
      const isLiked = likes.some((like) => like.user2_id === userId);
      setIsFavorite(isLiked);
    } catch (error) {
      console.error("Failed to check if user is liked:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await fetch(
        `https://backend-afrodate-8q6k.onrender.com/api/v1/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const user = await response.json();
      console.log("Loaded user profile:", user);

      setUserData(user);

      // Set profile pictures from user data
      if (user.profile_pic && Array.isArray(user.profile_pic)) {
        setProfilePictures(user.profile_pic);

        // Find primary image index
        const primaryIndex = user.profile_pic.findIndex((pic) => pic.isPrimary);
        if (primaryIndex !== -1) {
          setSelectedImageIndex(primaryIndex);
        }
      }

      // Calculate distance
      if (currentUserLocation && user.location?.coordinates) {
        const distanceText = calculateDistance(
          currentUserLocation,
          user.location.coordinates
        );
        setDistance(distanceText);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to load user data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await fetch(
        `https://backend-afrodate-8q6k.onrender.com/api/v1/users/like-or-dislike/${userId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      setIsFavorite(!isFavorite);
      setShowSnackBar(true);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) {
      return "Unknown";
    }
    const birthDate = new Date(dob);
    if (isNaN(birthDate)) {
      return "Unknown";
    }

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

  const handleImageError = (index) => {
    setImageErrors((prev) => ({
      ...prev,
      [index]: true,
    }));
  };

  // Handle image index change
  const handleIndexChange = (index) => {
    setSelectedImageIndex(index);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${userData?.name}'s profile on CloseMatch!`,
        url: "https://closematch.com",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLike = () => {
    toggleFavorite();
  };

  const handleMessage = () => {
    navigation.navigate("ChatDetail", { user: userData });
  };

  // Render carousel item
  const renderCarouselItem = ({ item, index }) => (
    <View style={styles.imageContainer}>
      <Image
        source={
          item.url && !imageErrors[index]
            ? { uri: item.url }
            : require("../assets/images/users/3.png")
        }
        style={styles.profileImage}
        onError={() => handleImageError(index)}
        defaultSource={require("../assets/images/users/3.png")}
      />
    </View>
  );

  useEffect(() => {
    setImageErrors({});
  }, [profilePictures]);

  // Render image indicator
  const renderImageIndicator = (_, index) => (
    <View
      key={index}
      style={[
        styles.imageIndicator,
        index === selectedImageIndex && styles.activeImageIndicator,
      ]}
    />
  );

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

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || "Failed to load profile"}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="notifications-outline" size={20} color="#7B61FF" />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={[
          styles.scrollView,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Profile Images Carousel */}
        <View style={styles.imageCarousel}>
          <FlatList
            ref={galleryFlatListRef}
            data={profilePictures.length > 0 ? profilePictures : [{}]}
            renderItem={renderCarouselItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setSelectedImageIndex(newIndex);
            }}
            keyExtractor={(item, index) => index.toString()}
          />

          {/* Image Indicators */}
          {profilePictures.length > 1 && (
            <View style={styles.imageIndicators}>
              {profilePictures.map((_, index) =>
                renderImageIndicator(_, index)
              )}
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              {userData.name.split(" ")[0]},{" "}
              {userData.age || calculateAge(userData.date_of_birth)}
            </Text>
          </View>
          <Text style={styles.profession}>
            {userData.occupation || "No occupation"}
          </Text>
          <Text style={styles.profession}>
            {distance || "Unknown distance"} away •{" "}
            {userData.country || "Unknown location"}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.dislikeButton}>
              <Ionicons name="close" size={30} color="#FF6B6B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={30}
                color={isFavorite ? "#FF6B6B" : "#6C63FF"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* About Me Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Marital Status</Text>
          </View>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText} numberOfLines={1}>
              {userData.marital_status || "No bio available"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Religion</Text>
          </View>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText} numberOfLines={1}>
              {userData.religion || "No bio available"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Education</Text>
          </View>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText} numberOfLines={1}>
              {userData.degree || "No bio available"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Address</Text>
          </View>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText} numberOfLines={2}>
              {userData.address || "No bio available"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gender</Text>
          </View>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText} numberOfLines={1}>
              {userData.gender || "No bio available"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>About Me</Text>
          </View>
          <View style={styles.aboutCard}>
            <Text
              style={styles.aboutText}
              numberOfLines={isExpanded ? undefined : 4}>
              {userData.bio || "No bio available"}
            </Text>
            {userData.bio && userData.bio.length > 100 && (
              <TouchableOpacity
                style={styles.readMoreButton}
                onPress={() => setIsExpanded(!isExpanded)}>
                <Text style={styles.readMoreText}>
                  {isExpanded ? "Read Less" : "Read More"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={{ width: "100%", height: 200 }}></View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  imageCarousel: {
    height: height * 0.5,
    position: "relative",
  },
  imageContainer: {
    width: width,
    height: "100%",
    position: "relative",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  imageIndicators: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginHorizontal: 4,
  },
  activeImageIndicator: {
    backgroundColor: "#7B61FF",
    width: 12,
    height: 12,
  },
  profileInfo: {
    backgroundColor: "#A1A1A1BA",
    width: "100%",
    padding: 10,
    borderRadius: 20,
    marginTop: 20,
    paddingBottom: 0,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    alignContent: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginRight: 12,
    alignSelf: "flex-start",
  },
  profession: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "500",
    opacity: 0.9,
    paddingVertical: 3,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "60%",
    alignSelf: "center",
    marginTop: 10,
    borderRadius: 20,
    marginVertical: 30,
    marginBottom: 17,
  },
  dislikeButton: {
    alignItems: "center",
    padding: 5,
    backgroundColor: "#fff",
    borderRadius: 100,
  },
  likeButton: {
    alignItems: "center",
    padding: 5,
    backgroundColor: "#fff",
    borderRadius: 100,
  },
  divider: {
    height: 8,
    backgroundColor: "#F9FAFB",
    marginVertical: 8,
  },
  section: {
    padding: 20,
    paddingBottom: 0,
    paddingHorizontal: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 12,
  },
  preferenceCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BEC5D1",
  },
  preferenceCardText: {
    fontSize: 12,
    color: "#575757",
    fontWeight: "400",
    marginBottom: 4,
  },
  aboutCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BEC5D1",
  },
  aboutText: {
    fontSize: 12,
    color: "#575757",
    fontWeight: "400",
  },
  readMoreButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  readMoreText: {
    fontSize: 14,
    color: "#7B61FF",
    fontWeight: "600",
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
    marginBottom: 20,
    fontSize: 16,
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
});
