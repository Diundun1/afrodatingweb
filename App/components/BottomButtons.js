import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NunitoText from "./NunitoText";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function BottomButtons() {
  const navigation = useNavigation();
  const route = useRoute(); // Get current route

  // Brand color constant for consistency
  const BRAND_COLOR = "#7B61FF";

  // Helper function to check if a screen is active
  const isActive = (screenName) => route.name === screenName;

  return (
    <View style={styles.container}>
      {/* Filter */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate("FilterScreen")}>
        <View
          style={[
            styles.iconContainer,
            isActive("FilterScreen") && {
              backgroundColor: BRAND_COLOR, // Brand color background
            },
          ]}>
          <Ionicons
            name="options-outline"
            size={18}
            color={isActive("FilterScreen") ? "#fff" : "#333"} // White icon when active
          />
        </View>
        <NunitoText
          style={[
            styles.label,
            isActive("FilterScreen") && {
              color: BRAND_COLOR,
              fontWeight: "600",
            },
          ]}>
          Filter
        </NunitoText>
      </TouchableOpacity>

      {/* Favourite */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate("MyFavouriteScreen")}>
        <View
          style={[
            styles.iconContainer,
            isActive("MyFavouriteScreen") && {
              backgroundColor: BRAND_COLOR, // Brand color background
            },
          ]}>
          <Ionicons
            name="card-outline"
            size={18}
            color={isActive("MyFavouriteScreen") ? "#fff" : "#333"} // White icon when active
          />
        </View>
        <NunitoText
          style={[
            styles.label,
            isActive("MyFavouriteScreen") && {
              color: BRAND_COLOR,
              fontWeight: "600",
            },
          ]}>
          Favourite
        </NunitoText>
      </TouchableOpacity>

      {/* Center Home Button */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={() => navigation.navigate("ExploreScreen")}>
        <View
          style={[
            styles.centerIcon,
            isActive("ExploreScreen") && styles.activeCenterIcon,
          ]}>
          <Image
            source={require("../assets/icons/filled.png")}
            style={styles.centerImage}
          />
        </View>
      </TouchableOpacity>

      {/* Message */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate("ChatScreen")}>
        <View
          style={[
            styles.iconContainer,
            isActive("ChatScreen") && {
              backgroundColor: BRAND_COLOR, // Brand color background
            },
          ]}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color={isActive("ChatScreen") ? "#fff" : "#333"} // White icon when active
          />
        </View>
        <NunitoText
          style={[
            styles.label,
            isActive("ChatScreen") && {
              color: BRAND_COLOR,
              fontWeight: "600",
            },
          ]}>
          Message
        </NunitoText>
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate("ProfileScreen")}>
        <View
          style={[
            styles.iconContainer,
            isActive("ProfileScreen") && {
              backgroundColor: BRAND_COLOR, // Brand color background
            },
          ]}>
          <Ionicons
            name="person-outline"
            size={18}
            color={isActive("ProfileScreen") ? "#fff" : "#333"} // White icon when active
          />
        </View>
        <NunitoText
          style={[
            styles.label,
            isActive("ProfileScreen") && {
              color: BRAND_COLOR,
              fontWeight: "600",
            },
          ]}>
          Profile
        </NunitoText>
      </TouchableOpacity>
    </View>
  );
}

const BRAND_COLOR = "#7B61FF";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    color: "#666",
    marginTop: -2,
    fontWeight: "900",
  },
  centerButton: {
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  centerIcon: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 50,
    padding: 12,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCenterIcon: {
    backgroundColor: BRAND_COLOR,
    shadowColor: BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerImage: {
    width: 30,
    height: 30,
    tintColor: "#fff",
  },
});
