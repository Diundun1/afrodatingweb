import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NunitoText from "./NunitoText";
import { useNavigation } from "@react-navigation/native";

export default function BottomButtons({ active = "ExploreScreen" }) {
  const navigation = useNavigation();

  // Brand color constant for consistency
  const BRAND_COLOR = "#7B61FF";

  return (
    <View style={styles.container}>
      {/* Filter */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate("FilterScreen")}>
        <View
          style={[
            styles.iconContainer,
            active === "FilterScreen" && styles.activeIconContainer,
          ]}>
          <Ionicons
            name="options-outline"
            size={18}
            color={active === "FilterScreen" ? BRAND_COLOR : "#333"}
          />
        </View>
        <NunitoText
          style={[
            styles.label,
            active === "FilterScreen" && {
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
            active === "MyFavouriteScreen" && styles.activeIconContainer,
          ]}>
          <Ionicons
            name="card-outline"
            size={18}
            color={active === "MyFavouriteScreen" ? BRAND_COLOR : "#333"}
          />
        </View>
        <NunitoText
          style={[
            styles.label,
            active === "MyFavouriteScreen" && {
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
            active === "Home" && styles.activeCenterIcon,
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
            active === "ChatScreen" && styles.activeIconContainer,
          ]}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color={active === "ChatScreen" ? BRAND_COLOR : "#333"}
          />
        </View>
        <NunitoText
          style={[
            styles.label,
            active === "ChatScreen" && {
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
            active === "Profile" && styles.activeIconContainer,
          ]}>
          <Ionicons
            name="person-outline"
            size={18}
            color={active === "Profile" ? BRAND_COLOR : "#333"}
          />
        </View>
        <NunitoText
          style={[
            styles.label,
            active === "Profile" && {
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
    paddingVertical: 12,
    paddingHorizontal: 10,
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
  activeIconContainer: {
    backgroundColor: "rgba(124, 97, 255, 0.1)", // Light purple background using brand color
  },
  label: {
    fontSize: 11,
    color: "#666",
    marginTop: -9,
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
    backgroundColor: BRAND_COLOR, // Using brand color for center icon
    borderRadius: 50,
    padding: 12,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCenterIcon: {
    backgroundColor: BRAND_COLOR, // Using brand color for active center icon
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
