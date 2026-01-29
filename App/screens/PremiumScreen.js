import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const subscriptionBenefits = [
  "Direct message to all profiles",
  "Unlimited profile visits",
  "Directly find contact info",
];

const PremiumScreen = () => {
  const navigation = useNavigation();
  const [plansList, setPlansList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [error, setError] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [isPaymentUrlArrived, setIsPaymentUrlArrived] = useState(false);

  // Brand colors
  const BRAND_COLORS = {
    primary: "#7B61FF",
    primaryLight: "rgba(123, 97, 255, 0.1)",
    primaryMedium: "rgba(123, 97, 255, 0.2)",
    white: "#FFFFFF",
    black: "#1F2937",
    gray: "#6B7280",
    lightGray: "#9CA3AF",
  };

  useEffect(() => {
    const fetchSubStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");

        if (!token) {
          setError("Authentication error: Token not found.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "https:backend-afrodate-8q6k.onrender.com/api/v1/subscription/status",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const SubStatusdata = await response.json();
        console.log("Fetched Sub Status:", SubStatusdata);

        setCurrentSubscription(SubStatusdata?.plan_data || null);
      } catch (error) {
        console.error("Error fetching Sub Status:", error);
        setError("An error occurred while fetching Sub Status.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubStatus();
  });

  useEffect(() => {
    if (!plansList?.length || selectedPlanIndex !== null) return;

    // 1️⃣ Try matching by PLAN ID (BEST)
    if (currentSubscription?._id) {
      const indexById = plansList.findIndex(
        (plan) => plan.id === currentSubscription._id,
      );

      if (indexById !== -1) {
        setSelectedPlanIndex(indexById);
        return;
      }
    }

    // 2️⃣ Try matching by NAME + INTERVAL
    if (currentSubscription?.name) {
      const indexByName = plansList.findIndex(
        (plan) =>
          plan.planTime?.toLowerCase() ===
            currentSubscription.name.toLowerCase() &&
          plan.interval?.toLowerCase() ===
            currentSubscription.interval?.toLowerCase(),
      );

      if (indexByName !== -1) {
        setSelectedPlanIndex(indexByName);
        return;
      }
    }

    // 3️⃣ Fallback → Best Offer
    const bestIndex = plansList.findIndex((plan) => plan.isBestOffer);

    if (bestIndex !== -1) {
      setSelectedPlanIndex(bestIndex);
      return;
    }

    // 4️⃣ Final fallback
    setSelectedPlanIndex(0);
  }, [plansList, currentSubscription]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");

        if (!token) {
          setError("Authentication error: Token not found.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "https:backend-afrodate-8q6k.onrender.com/api/v1/plans",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();
        console.log("Fetched Plans:", data);

        if (response.ok && Array.isArray(data)) {
          if (data.length === 0) {
            setError("No subscription plans available");
          } else {
            const formattedPlans = data.map((plan, index) => {
              const planPrice = plan.price;
              const planCurrency = plan.currency || "NGN";

              const priceInWholeUnits = planPrice / 100;
              const discountedPrice = priceInWholeUnits * 0.85;

              return {
                id: plan._id,
                planTime: plan.name || `Plan ${index + 1}`,
                offerPrice: discountedPrice.toFixed(2),
                oldPrice: priceInWholeUnits.toFixed(2),
                isBestOffer: index === 1,
                currency: planCurrency,
                interval: plan.interval || "monthly",
                features: plan.features || [],
              };
            });

            setPlansList(formattedPlans);
          }
        } else {
          setError("Failed to load plans. Please try again.");
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
        setError("An error occurred while fetching plans.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  const handleSubscription = async () => {
    const selectedPlan = plansList[selectedPlanIndex];

    if (!selectedPlan?.id) {
      alert("Please select a valid plan.");
      return;
    }

    console.log("Selected Plan:", selectedPlan);

    setIsPaymentUrlArrived(true);

    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        alert("Authentication error: Token not found.");
        return;
      }

      const response = await fetch(
        "https:backend-afrodate-8q6k.onrender.com/api/v1/payment/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan_id: selectedPlan.id }),
        },
      );

      const text = await response.text();
      console.log("Raw Response:", text);

      try {
        const data = JSON.parse(text);

        if (response.ok && data.redirectUrl) {
          setIsPaymentUrlArrived(false);
          navigation.navigate("PaymentWebview", {
            paymentUrl: data.redirectUrl,
            title: "Complete Payment",
          });
        } else {
          setIsPaymentUrlArrived(false);
          alert(data.message || "Subscription failed. Please try again.");
        }
      } catch (jsonError) {
        setIsPaymentUrlArrived(false);
        alert("Unexpected server response. Please try again later.");
      }
    } catch (error) {
      setIsPaymentUrlArrived(false);
      alert("An error occurred. Please check your internet connection.");
    }
  };

  const renderPlanItem = (item, index) => (
    <View key={item.id || index}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSelectedPlanIndex(index)}
        style={styles.planItem}
      >
        <View style={styles.planInfo}>
          <Text style={styles.planName}>{item.planTime}</Text>
          <Text style={styles.planPrice}>
            <Text style={styles.oldPrice}>
              {item.currency} {item.oldPrice}
            </Text>
            <Text style={styles.currentPrice}>
              {" "}
              {item.currency} {item.offerPrice}
            </Text>
            <Text style={styles.interval}> per {item.interval}</Text>
          </Text>
        </View>
        <View style={styles.planActions}>
          {item.isBestOffer && (
            <View
              style={[
                styles.bestOfferBadge,
                { backgroundColor: BRAND_COLORS.primaryLight },
              ]}
            >
              <Text style={styles.bestOfferText}>Best price</Text>
            </View>
          )}
          <View
            style={[
              styles.radioButton,
              {
                borderColor:
                  selectedPlanIndex === index
                    ? BRAND_COLORS.primary
                    : BRAND_COLORS.lightGray,
                backgroundColor:
                  selectedPlanIndex === index
                    ? BRAND_COLORS.primary
                    : BRAND_COLORS.white,
              },
            ]}
          >
            {selectedPlanIndex === index && (
              <MaterialIcons
                name="check"
                color={BRAND_COLORS.white}
                size={18}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
      {index < plansList.length - 1 && <View style={styles.divider} />}
    </View>
  );

  const renderBenefits = () => {
    const selectedPlan = plansList[selectedPlanIndex];
    let benefits = subscriptionBenefits;

    if (selectedPlan?.features && Array.isArray(selectedPlan.features)) {
      benefits = selectedPlan.features.map((feature) => {
        if (typeof feature === "string") return feature;
        if (feature && typeof feature === "object" && feature.description)
          return feature.description;
        return JSON.stringify(feature);
      });
    }

    return (
      <View style={styles.benefitsSection}>
        <Text style={styles.benefitsTitle}>Subscription Benefits</Text>
        {benefits.map((item, index) => (
          <View key={index} style={styles.benefitItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.benefitText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="close" size={24} color={BRAND_COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Subscription</Text>
      </View>

      {/* Premium Icon Section */}
      <View style={styles.premiumSection}>
        <View style={styles.premiumIcon}>
          <Image
            source={require("../assets/icons/premium.png")}
            style={styles.premiumImage}
          />
        </View>
        <Text style={styles.premiumText}>
          You have profile likes. Find out who liked you.
        </Text>
      </View>

      {/* Subscription Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Plans List */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : plansList.length > 0 ? (
            <View style={styles.plansSection}>
              {plansList.map(renderPlanItem)}
            </View>
          ) : (
            <Text style={styles.noPlansText}>
              No subscription plans available at the moment.
            </Text>
          )}

          {/* Benefits */}
          {plansList.length > 0 && renderBenefits()}
        </ScrollView>

        {/* Continue Button */}
        {plansList.length > 0 && (
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: BRAND_COLORS.primary },
            ]}
            onPress={handleSubscription}
            disabled={isPaymentUrlArrived}
          >
            {isPaymentUrlArrived ? (
              <ActivityIndicator size="small" color={BRAND_COLORS.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continue Payment</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#7B61FF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  closeButton: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  premiumSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  premiumIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumImage: {
    width: 40,
    height: 40,
  },
  premiumText: {
    marginTop: 12,
    fontSize: 15,
    color: "#FFFFFF",
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  plansSection: {
    marginBottom: 30,
  },
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 14,
  },
  oldPrice: {
    fontSize: 14,
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7B61FF",
  },
  interval: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  planActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  bestOfferBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  bestOfferText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7B61FF",
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(123, 97, 255, 0.1)",
    marginVertical: 8,
  },
  benefitsSection: {
    marginTop: 30,
  },
  benefitsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: "#7B61FF",
    marginRight: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 20,
  },
  continueButton: {
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#7B61FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
    color: "#7B61FF",
    marginVertical: 20,
  },
  noPlansText: {
    textAlign: "center",
    fontSize: 16,
    color: "#6B7280",
    marginVertical: 20,
  },
});

export default PremiumScreen;
