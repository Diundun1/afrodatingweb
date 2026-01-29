import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomButtons from "../components/BottomButtons";
import { SafeAreaView } from "react-native-safe-area-context";
import { NunitoTitle } from "../components/NunitoComponents";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 48) / 2; // 2 columns with padding

// Placeholder image for users without profile pictures
const PLACEHOLDER = require("../assets/images/users/1.png");

export default function MyFavouriteScreen() {
  const navigation = useNavigation();
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [listData, setListData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);

  useEffect(() => {
    fetchCurrentUserLocation();
  }, []);

  useEffect(() => {
    if (currentUserLocation) {
      fetchLikedUsers();
    }
  }, [currentUserLocation]);

  const fetchCurrentUserLocation = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No auth token found");

      const response = await fetch("http://localhost:5000/api/v1/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const currentUser = await response.json();
      if (currentUser.location?.coordinates) {
        setCurrentUserLocation(currentUser.location.coordinates);
      } else {
        // If no location, still fetch liked users
        fetchLikedUsers();
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      // Continue with fetching liked users even if location fails
      fetchLikedUsers();
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (coords1, coords2) => {
    if (!coords1 || !coords2) return "Unknown";

    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;

    // Radius of the Earth in kilometers
    const R = 6371;

    // Convert degrees to radians
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    // Haversine formula
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

  const fetchLikedUsers = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) throw new Error("No auth token found");

      const response = await fetch(
        "http://localhost:5000/api/v1/users/you-liked",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      //  const fetchDataXcc = await response.json();
      //   console.log(fetchDataXcc);

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const { users: likes } = await response.json();

      if (!likes || likes.length === 0) {
        setListData([]);
        return;
      }

      // Extract only unique user2_id values
      const uniqueUserIds = Array.from(new Set(likes.map((l) => l.user2_id)));

      // Fetch each user exactly once
      const userDetails = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          try {
            const userRes = await fetch(
              `http://localhost:5000/api/v1/users/${userId}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!userRes.ok) {
              console.error(`Failed to fetch user ${userId}:`, userRes.status);
              return null;
            }
            const user = await userRes.json();

            const primaryPic = user.profile_pic?.find(
              (pic) => pic.isPrimary,
            )?.url;

            // Calculate distance based on coordinates
            const distanceText =
              currentUserLocation && user.location?.coordinates
                ? calculateDistance(
                    currentUserLocation,
                    user.location.coordinates,
                  )
                : "Unknown";

            return {
              id: userId,
              userId: userId,
              image: primaryPic ? { uri: primaryPic } : PLACEHOLDER,
              name: user.name || "No Name",
              role: user.occupation || "Unknown",
              distance: distanceText,
              age: user.age ? `${user.age}` : "",
            };
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
          }
        }),
      );

      const validUsers = userDetails.filter(Boolean);
      setListData(validUsers);
    } catch (error) {
      console.error("Failed to fetch liked users:", error);
      setListData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        console.log(item.userId);
        navigation.navigate("ProfileDetailScreen", { user: item.userId });
      }}
    >
      <Image source={item.image} style={styles.image} />
      <View style={styles.overlay}>
        <NunitoTitle style={styles.name}>
          {item.name.split(" ")[0]}, {item.age}
          {"\n"}
          {item.role}
        </NunitoTitle>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color="#9CA3AF" />
      <NunitoTitle style={styles.emptyStateTitle}>No Favorites Yet</NunitoTitle>
      <NunitoTitle style={styles.emptyStateText}>
        Users you like will appear here
      </NunitoTitle>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <NunitoTitle style={styles.title}>My Favorites</NunitoTitle>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B61FF" />
          <NunitoTitle style={styles.loadingText}>
            Loading favorites...
          </NunitoTitle>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            listData.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
        />
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
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
    color: "#222",
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
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE + 40,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  name: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 2,
  },
  role: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
    lineHeight: 16,
    marginBottom: 4,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: {
    color: "#fff",
    fontSize: 10,
    opacity: 0.8,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
});
