import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Image, Dimensions } from "react-native";

const { width: _SW } = Dimensions.get("window");
const _WR = Math.min(_SW / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "../services/AuthService";
import { useTheme } from "../components/ThemeContext";

const LOGO = require("../assets/puac_logo.png");

const SESSION_KEY = "@faithly_session";
const ONBOARDED_KEY_PREFIX = "@faithly_onboarded_";

export default function SplashScreen({ navigation }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate text after logo
    setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 800);

    // Check session after splash animation
    const timer = setTimeout(async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);

        if (raw) {
          const session = JSON.parse(raw);

          if (session?.email) {
            // Ensure the user has a valid JWT token for API calls
            const token = await getToken();
            if (!token) {
              // Session exists but no token (old login) → force re-login
              await AsyncStorage.removeItem(SESSION_KEY);
              navigation.replace("Start");
              return;
            }

            // Check if this user has completed onboarding
            const onboardedKey = `${ONBOARDED_KEY_PREFIX}${session.email}`;
            const onboarded = await AsyncStorage.getItem(onboardedKey);
            if (!onboarded) {
              navigation.replace("Onboarding", { email: session.email, source: "signup" });
              return;
            }
            navigation.replace("Home", { email: session.email, source: "login" });
            return;
          }
        }
      } catch (err) {
        console.log("Session check error:", err);
      }

      // No valid session → StartScreen
      navigation.replace("Start");
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, logoScale, logoOpacity, textOpacity]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Animated.Image
        source={LOGO}
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
        resizeMode="contain"
      />

      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={[styles.title, { color: colors.textDark }]}>IsangDiwa</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your Digital Church Community</Text>
      </Animated.View>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: s(110),
    height: s(110),
    borderRadius: s(55),
    marginBottom: s(20),
  },
  title: {
    fontSize: fs(34),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: s(6),
  },
  subtitle: {
    fontSize: fs(15),
    textAlign: "center",
  },
});
