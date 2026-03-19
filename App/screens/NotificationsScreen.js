import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import MyStatusBar from "../components/MyStatusBar";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth } = Dimensions.get("window");
const BRAND_COLOR = "#7B61FF";

const dummyNotifications = [
  {
    id: "1",
    message: "Your profile has been viewed 10 times today",
    status: "not opened",
    sent_at: "2025-08-11T08:00:00Z",
  },
  {
    id: "2",
    message: "New match found in your area",
    status: "opened",
    sent_at: "2025-08-10T18:00:00Z",
  },
  {
    id: "3",
    message: "Your subscription will expire in 3 days",
    status: "opened",
    sent_at: "2025-08-09T14:00:00Z",
  },
];

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [sideMenuFuncs, setSideMenuFuncs] = useState(false);
  const [noContentFound, setNoContentFound] = useState(false);
  const [deleteView, setDeleteView] = useState(false);
  const [noNotifications, setNoNotifications] = useState(false);
  const [fetchedNotifications, setFetchedNotfications] = useState([]);
  const [notificationIdHolder, setNotificationHolderId] = useState("");

  const notificationsFetcher = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem("userToken");
    try {
      const res = await fetch(
        "https://backend-afrodate-8q6k.onrender.com/api/v1/notifications",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log(
        "This is the request and its header before the response for the notification thingy",
      );

      if (!res.ok) {
        throw new Error(`There was an error with Status Code ${res.status}`);
      }

      const resResult = await res.json();

      if (resResult?.data?.length > 0) {
        // Notifications exist
        setFetchedNotfications(resResult.data);
        setNoContentFound(false);
      } else if (resResult?.pagination?.totalCount === 0) {
        // No notifications at all
        setFetchedNotfications([]);
        // setNoContentFound(true);
      }

      setLoading(false);

      console.log(resResult.data);
    } catch (e) {
      console.log("There was an error fetching notifications");
      setLoading(false);

      setNoContentFound(true);
    }
  };

  useEffect(() => {
    notificationsFetcher();
  }, []);

  const markAllNotificationsAsRead = async () => {
    const token = await AsyncStorage.getItem("userToken");
    notificationsFetcher();
    setSideMenuFuncs(false);
    try {
      const sendRequest = await fetch(
        "https://closematch-backend-seix.onrender.com/api/v1/notifications/mark-all-read",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-type": "application/json",
          },
        },
      );

      const processedRequest = await sendRequest.json();
      console.log(processedRequest);

      if (!sendRequest.ok) {
        throw new Error(
          `There was an error with status code ${processedRequest.status}`,
        );
        //console.log("All notifications successfully marked as read!");
      }
    } catch (e) {
      console.log("There was an error with the try catch");
    }
  };
  const deleteAllNotifications = async () => {
    setSideMenuFuncs(false);
    notificationsFetcher();

    const token = await AsyncStorage.getItem("userToken");

    try {
      const sendRequest = await fetch(
        "https://closematch-backend-seix.onrender.com/api/v1/notifications/clear-all",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-type": "application/json",
          },
        },
      );

      const passedRequest = await sendRequest.json();
      console.log(passedRequest);

      notificationsFetcher();

      if (!passedRequest.ok) {
        throw new Error(
          `There was an error with status code ${passedRequest.status}`,
        );
      }

      if (passedRequest.ok) {
        setSideMenuFuncs(false);
        console.log("All notifications deleted successfully");
      }
    } catch (e) {
      console.log("There was an error with the try catch");
    }
  };

  const deleteSpecificNotification = async () => {
    setDeleteView(false);
    notificationsFetcher();

    try {
      const token = await AsyncStorage.getItem("userToken");

      const endpoint = await fetch(
        `https://closematch-backend-seix.onrender.com/api/v1/notifications/${notificationIdHolder}`,
        {
          method: "DELETE",
          headers: {
            "Content-type": "Application/json",
            Authorization: `Bearer: ${token}`,
          },
        },
      );

      const parseEndpoint = await endpoint.json();

      if (!endpoint.ok) {
        throw new Error(
          `There was an error with status code: ${parseEndpoint.status}`,
        );
      }

      if (parseEndpoint.status === "true") {
        setNotificationHolderId("");
        notificationsFetcher();
      }
    } catch (error) {
      console.log("There was an error, Please try again later!");
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.notificationItemContainer}>
      <View style={styles.notificationContent}>
        <TouchableOpacity
          style={styles.notificationTouchable}
          onLongPress={() => {
            setNotificationHolderId(item._id);
            setDeleteView(true);
          }}
        >
          <View
            style={[
              styles.notificationIconContainer,
              item.status === "not opened"
                ? styles.unreadNotification
                : styles.readNotification,
            ]}
          >
            <MaterialIcons
              name="notifications"
              size={24}
              color={item.status === "not opened" ? "#fff" : BRAND_COLOR}
            />
          </View>
          <View style={styles.notificationTextContainer}>
            <Text numberOfLines={2} style={styles.messageText}>
              <Text
                style={[
                  styles.messageContent,
                  item.status === "not opened" && styles.boldText,
                ]}
              >
                {item.type === "message"
                  ? `${item?.data?.viewerName || "Someone"} sent you a message`
                  : item.type === "profileView"
                    ? `${item?.data?.viewerName || "Someone"} viewed your profile`
                    : "New notification"}
              </Text>
            </Text>
            <Text style={styles.timeText}>{formatTime(item.sent_at)}</Text>
          </View>
        </TouchableOpacity>

        {index < fetchedNotifications.length - 1 && (
          <View style={styles.dividerLine} />
        )}
        {index === fetchedNotifications.length - 1 && (
          <View style={styles.lastItemSpacing} />
        )}
      </View>
    </View>
  );

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const header = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          navigation.goBack();
        }}
      >
        <MaterialIcons
          name="arrow-back-ios"
          size={20}
          color="#000"
          style={styles.backIcon}
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        Notifications
        <Text style={styles.headerSubtitle}>
          {" "}
          {/*  ({fetchedNotifications.length}) */}
        </Text>
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <MyStatusBar />
      {header()}

      {noContentFound && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Couldn't fetch Notifications, Please try again
          </Text>
        </View>
      )}

      {deleteView && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDeleteView(false)}
            >
              <MaterialIcons name="close" size={25} style={styles.closeIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => deleteSpecificNotification()}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>Delete Notification</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.reportButton}>
              <Text style={styles.reportButtonText}>Report Notification</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={fetchedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  notificationItemContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  notificationContent: {
    marginHorizontal: 20,
  },
  notificationTouchable: {
    flexDirection: "row",
  },
  notificationIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadNotification: {
    backgroundColor: BRAND_COLOR,
  },
  readNotification: {
    backgroundColor: "#f8f9fa",
  },
  notificationTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  messageText: {
    lineHeight: 22,
  },
  messageContent: {
    fontSize: 15,
    color: "#000",
  },
  boldText: {
    fontWeight: "bold",
  },
  timeText: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },
  dividerLine: {
    backgroundColor: "rgba(138, 156, 191, 0.125)",
    height: 1,
    marginVertical: 18,
  },
  lastItemSpacing: {
    marginVertical: 10,
  },
  headerContainer: {
    margin: 20,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    width: 40,
    height: 40,
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    left: 2,
  },
  headerTitle: {
    alignSelf: "center",
    maxWidth: screenWidth - 130,
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  errorBanner: {
    position: "absolute",
    top: 80,
    backgroundColor: "whitesmoke",
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 1000,
    justifyContent: "center",
    alignContent: "center",
    marginHorizontal: 20,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 15,
    color: BRAND_COLOR,
    textAlign: "center",
    fontWeight: "400",
  },
  modalOverlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    position: "absolute",
    top: 0,
    zIndex: 99,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "rgba(245, 245, 245, 0.859)",
    width: "95%",
    padding: 10,
    alignItems: "center",
    borderRadius: 15,
    paddingBottom: 20,
  },
  closeButton: {
    width: "100%",
    alignItems: "flex-end",
    padding: 10,
    paddingBottom: 0,
  },
  closeIcon: {
    fontWeight: "900",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffe6e6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: "100%",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "red",
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff4e6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    width: "100%",
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cc6600",
  },
  flatListContent: {
    paddingBottom: 10,
  },
  loadingContainer: {
    width: "100%",
    padding: 20,
  },
});

export default NotificationsScreen;
