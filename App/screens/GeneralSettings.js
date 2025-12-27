import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import MyStatusBar from "../components/MyStatusBar";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NunitoTitle } from "../components/NunitoComponents";

const GeneralSettings = () => {
  const navigation = useNavigation();

  const [resetDislik, setresetDislik] = useState(true);
  const [hideLocation, sethideLocation] = useState(false);
  const [darkMode, setdarkMode] = useState(false);
  const [showLogoutDialog, setshowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      setshowLogoutDialog(false);
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginScreen" }],
      });
    } catch (error) {
      console.error("Logout error:", error);
      // You could add another modal for error handling if needed
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <MyStatusBar />
      <View style={{ flex: 1 }}>
        {header()}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.container}
        >
          {/**    {generalSection()}
          {appSettingsSection()}
          {legalSection()} */}
          {logoutSection()}
        </ScrollView>
      </View>
      {logoutDialog()}
    </View>
  );

  function logoutDialog() {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutDialog}
        onRequestClose={() => setshowLogoutDialog(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setshowLogoutDialog(false)}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity activeOpacity={1} style={styles.dialogContainer}>
              <View style={styles.dialogIcon}>
                <Ionicons name="log-out-outline" size={32} color="#EF4444" />
              </View>
              <NunitoTitle style={styles.dialogTitle}>Sign Out</NunitoTitle>
              <Text style={styles.dialogMessage}>
                Are you sure you want to sign out?
              </Text>
              <View style={styles.dialogButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setshowLogoutDialog(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.logoutButton]}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  function logoutSection() {
    return (
      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            console.log("ChangePasswordScreen");
            navigation.navigate("ChangePasswordScreen");
          }}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="lock-closed-outline" size={22} color="#7B61FF" />
            <Text style={styles.menuText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setshowLogoutDialog(true)}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text style={styles.menuText}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    );
  }

  function legalSection() {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.push("contactUs/contactUsScreen")}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="headset-outline" size={22} color="#6B7280" />
            <Text style={styles.menuText}>Contact us</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.push("termsAndCondition/termsAndConditionScreen")
          }
        >
          <View style={styles.menuLeft}>
            <Ionicons name="document-text-outline" size={22} color="#6B7280" />
            <Text style={styles.menuText}>Terms & Conditions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.push("privacy/privacyScreen")}
        >
          <View style={styles.menuLeft}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#6B7280"
            />
            <Text style={styles.menuText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    );
  }

  function appSettingsSection() {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>App Settings</Text>

        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="refresh-circle-outline" size={22} color="#6B7280" />
            <Text style={styles.menuText}>Reset disliked profiles</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setresetDislik(!resetDislik)}
            style={{
              backgroundColor: resetDislik ? "#7B61FF" : "#E5E7EB",
              ...styles.switchStyle,
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                width: 18,
                height: 18,
                borderRadius: 9,
                transform: [{ translateX: resetDislik ? 14 : -14 }],
              }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="location-outline" size={22} color="#6B7280" />
            <Text style={styles.menuText}>Hide my location</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => sethideLocation(!hideLocation)}
            style={{
              backgroundColor: hideLocation ? "#7B61FF" : "#E5E7EB",
              ...styles.switchStyle,
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                width: 18,
                height: 18,
                borderRadius: 9,
                transform: [{ translateX: hideLocation ? 14 : -14 }],
              }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="moon-outline" size={22} color="#6B7280" />
            <Text style={styles.menuText}>Enable dark mode</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setdarkMode(!darkMode)}
            style={{
              backgroundColor: darkMode ? "#7B61FF" : "#E5E7EB",
              ...styles.switchStyle,
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                width: 18,
                height: 18,
                borderRadius: 9,
                transform: [{ translateX: darkMode ? 14 : -14 }],
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function generalSection() {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>General</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.push("profileViews/profileViewsScreen")}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="eye-outline" size={22} color="#3B82F6" />
            <Text style={styles.menuText}>Profile Views</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.push("notifications/notificationsScreen")}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="notifications-outline" size={22} color="#8B5CF6" />
            <Text style={styles.menuText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.push("matches/matchesScreen")}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="heart-outline" size={22} color="#06B6D4" />
            <Text style={styles.menuText}>Profile Matches</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.push("paymentHistory/paymentHistory")}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="card-outline" size={22} color="#10B981" />
            <Text style={styles.menuText}>Payment History</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    );
  }

  function header() {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={"#1e1e1e"} />
        </TouchableOpacity>
        <NunitoTitle style={styles.headerTitle}></NunitoTitle>
        <View style={styles.headerRightPlaceholder} />
      </View>
    );
  }
};

export default GeneralSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Nunito-Bold",
    color: "#1e1e1e",
  },
  headerRightPlaceholder: {
    width: 40,
  },
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Nunito-SemiBold",
    color: "#6B7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontFamily: "Nunito-Medium",
    color: "#1e1e1e",
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 4,
  },
  switchStyle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    justifyContent: "center",
  },
  dialogContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dialogIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
    color: "#1e1e1e",
  },
  dialogMessage: {
    fontSize: 16,
    fontFamily: "Nunito-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  dialogButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Nunito-SemiBold",
    color: "#374151",
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: "Nunito-SemiBold",
    color: "#fff",
  },
});
