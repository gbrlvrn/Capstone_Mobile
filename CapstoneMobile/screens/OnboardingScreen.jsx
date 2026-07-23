import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../components/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDED_KEY_PREFIX = "@faithly_onboarded_";

const ICONS = {
  loans: require("../assets/icons/loans.png"),
  heart: require("../assets/icons/heart.png"),
  chat: require("../assets/icons/chat.png"),
};

const SLIDES = [
  {
    icon: ICONS.loans,
    iconBg: "rgba(46,107,240,0.12)",
    iconTint: "#0D1F45",
    title: "Manage Your Loans",
    subtitle: "Apply, track, and repay church loans transparently with full visibility into your balance and schedule.",
  },
  {
    icon: ICONS.heart,
    iconBg: "rgba(52,199,89,0.12)",
    iconTint: "#34C759",
    title: "Stay Connected",
    subtitle: "Attend events, make donations, and engage with your community — all from one app.",
  },
  {
    icon: ICONS.chat,
    iconBg: "rgba(88,86,214,0.12)",
    iconTint: "#5856D6",
    title: "Smart Assistance",
    subtitle: "Get instant help from FaithBot, your AI-powered assistant for loan inquiries and app navigation.",
  },
];

export default function OnboardingScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const email = (route?.params?.email || "").trim().toLowerCase();
  const source = route?.params?.source || "";
  const onboardedKey = email ? `${ONBOARDED_KEY_PREFIX}${email}` : ONBOARDED_KEY_PREFIX + "device";

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(onboardedKey, "true");
    if (source === "signup" && email) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home", params: { email, source: "signup" } }],
      });
    } else {
      navigation.replace("PUAC");
    }
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const onMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
        <Image
          source={item.icon}
          style={[styles.slideIcon, { tintColor: item.iconTint }]}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.slideTitle, { color: colors.textDark }]}>{item.title}</Text>
      <Text style={[styles.slideSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipBtn}
        activeOpacity={0.6}
        onPress={handleSkip}
      >
        <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Bottom area: dots + button */}
      <View style={styles.bottomArea}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: colors.blue,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity
          style={styles.nextBtn}
          activeOpacity={0.8}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  slideIcon: {
    width: 48,
    height: 48,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  slideSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  bottomArea: {
    paddingBottom: Platform.OS === "ios" ? 50 : 36,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    width: "100%",
    backgroundColor: "#0D1F45",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

