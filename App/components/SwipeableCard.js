import React, { useRef } from "react";
import { Animated, PanResponder, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SwipeableCard = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  userId,
  onSwipeComplete,
  onSwipeError,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const isSwiping = useRef(false);

  const handleSwipeAction = async (direction) => {
    if (!userId) {
      console.warn("No userId provided for swipe action");
      return;
    }

    const token = await AsyncStorage.getItem("userToken");
    const loggedInUserId = await AsyncStorage.getItem("loggedInUserId"); // Fixed typo
    const action = direction === "right" ? "like" : "dislike";

    try {
      const response = await fetch(
        "https://closematch-backend-seix.onrender.com/api/v1/match/like-or-dislike",
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
      console.log("Swipe action successful:", data);

      if (onSwipeComplete) {
        onSwipeComplete(userId, direction, data);
      }

      if (direction === "right" && onSwipeRight) {
        onSwipeRight();
      } else if (direction === "left" && onSwipeLeft) {
        onSwipeLeft();
      }
    } catch (error) {
      console.error("Error sending swipe action:", error.message);

      if (onSwipeError) {
        onSwipeError(error.message, userId, direction);
      } else {
        Alert.alert(
          "Swipe Error",
          "Failed to register swipe. Please try again."
        );
      }

      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 5,
        useNativeDriver: false,
      }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        isSwiping.current = true;
        Animated.event(
          [
            null,
            {
              dx: pan.x,
              dy: pan.y,
            },
          ],
          { useNativeDriver: false }
        )(_, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 50) {
          const direction = gestureState.dx > 0 ? "right" : "left";

          // Immediate UI response
          if (direction === "right" && onSwipeRight) {
            onSwipeRight();
          } else if (direction === "left" && onSwipeLeft) {
            onSwipeLeft();
          }

          Animated.timing(pan, {
            toValue: {
              x: gestureState.dx > 0 ? 500 : -500,
              y: gestureState.dy,
            },
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            handleSwipeAction(direction);
          });
        } else {
          if (!isSwiping.current && onPress) {
            onPress();
          }
          isSwiping.current = false;

          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        isSwiping.current = false;
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const animatedStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate: rotate },
    ],
  };

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    overflow: "hidden", // This ensures child content respects the border radius
  },
});

export default SwipeableCard;
