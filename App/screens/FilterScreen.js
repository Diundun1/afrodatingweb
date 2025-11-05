import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import NunitoText from "../components/NunitoText";
import { useNavigation } from "@react-navigation/native";
import BottomButtons from "../components/BottomButtons";

export default function FilterScreen() {
  const navigation = useNavigation();

  const [distance, setDistance] = useState(10);
  const [age, setAge] = useState(25);
  const [selectedGender, setSelectedGender] = useState("Man");

  const GenderButton = ({ label }) => (
    <TouchableOpacity
      style={[
        styles.genderButton,
        selectedGender === label && styles.genderButtonActive,
      ]}
      onPress={() => setSelectedGender(label)}>
      <Text
        style={[
          styles.genderText,
          selectedGender === label && styles.genderTextActive,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <NunitoText style={styles.title}>Filter & Search</NunitoText>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}>
        {/* Search Input */}
        <View style={styles.inputRow}>
          <TextInput
            placeholder="E.g Kenya"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.inputWrapper}>
          <NunitoText>Search</NunitoText>

          <TextInput
            placeholder="E.g Kenya"
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.valueText}>{distance} km</Text>

          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={0}
            maximumValue={30}
            step={1}
            value={distance}
            minimumTrackTintColor="#7B61FF"
            thumbTintColor="#7B61FF"
            onValueChange={(value) => setDistance(value)}
          />
          <View style={styles.sliderLabels}>
            <NunitoText>0 km</NunitoText>
            <Text>30 km</Text>
          </View>
        </View>

        {/* Age */}
        <View style={styles.section}>
          <Text style={styles.label}>Age</Text>
          <View style={styles.sliderLabels}>
            <Text>18</Text>
            <Text>85</Text>
          </View>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={18}
            maximumValue={85}
            step={1}
            value={age}
            minimumTrackTintColor="#7B61FF"
            thumbTintColor="#7B61FF"
            onValueChange={(value) => setAge(value)}
          />
          <Text style={styles.valueText}>{age}</Text>
        </View>

        {/* Gender / Interest */}
        <View style={styles.section}>
          <Text style={styles.label}>Interested In</Text>
          <View style={styles.genderRow}>
            <GenderButton label="Man" />
            <GenderButton label="Woman" />
            <GenderButton label="Other" />
          </View>
        </View>

        {/* Apply Button */}
        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyText}>Apply Filter</Text>
        </TouchableOpacity>
      </ScrollView>

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
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 20,
    color: "#000000",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrapper: {
    marginTop: 16,
  },
  input: {
    flex: 1,
    // backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#BEC5D1",
    color: "#9CA3AF",
    fontWeight: "400",
  },
  searchButton: {
    backgroundColor: "#7B61FF",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchText: {
    color: "#fff",
    fontWeight: "500",
  },
  section: {
    marginTop: 24,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 8,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  valueText: {
    textAlign: "center",
    fontSize: 13,
    color: "#555",
  },
  genderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  genderButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 4,
  },
  genderButtonActive: {
    backgroundColor: "#7B61FF",
  },
  genderText: {
    color: "#333",
  },
  genderTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  applyButton: {
    marginTop: 30,
    backgroundColor: "#7B61FF",
    borderRadius: 6,
    paddingVertical: 14,
  },
  applyText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: "#555",
  },
  homeButton: {
    width: 56,
    height: 56,
    backgroundColor: "#7B61FF",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30,
    shadowColor: "#7B61FF",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
});
