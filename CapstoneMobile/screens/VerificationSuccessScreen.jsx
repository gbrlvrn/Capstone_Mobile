import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../components/ThemeContext";

const SESSION_KEY = "@faithly_session";

const CHECK_ICON = require("../assets/icons/check-circle.png");

function cleanEmail(e) {
  return (e || "").trim().toLowerCase();
}

export default function VerificationSuccessScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const source = route?.params?.source || "login";
  const email = cleanEmail(route?.params?.email);
  const user = route?.params?.user || null; // optional (if you start passing it later)

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      // always pass email forward
      if (!email) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
        return;
      }

      if (source === "signup") {
        // Save session + go to Home directly
        try {
          await AsyncStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ email })
          );
          await AsyncStorage.setItem(
            "faithly_user",
            JSON.stringify({ email })
          );
        } catch (err) {
          console.log("Session save error:", err);
        }

        navigation.reset({
          index: 0,
          routes: [{ name: "Home", params: { email, source, ...(user ? { user } : {}) } }],
        });
      } else {
        // Existing user (login) → save session + go to Home
        try {
          await AsyncStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ email })
          );
          await AsyncStorage.setItem(
            "faithly_user",
            JSON.stringify({ email })
          );
        } catch (err) {
          console.log("Session save error:", err);
        }

        navigation.reset({
          index: 0,
          routes: [{ name: "Home", params: { email, source, ...(user ? { user } : {}) } }],
        });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigation, scale, opacity, email, source, user]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Animated.Image
          source={CHECK_ICON}
          style={[styles.checkIcon, { transform: [{ scale }] }]}
          resizeMode="contain"
        />

        <Animated.View style={{ opacity }}>
          <Text style={[styles.title, { color: colors.textDark }]}>Verification Successful!</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {source === "signup"
              ? "Your account has been verified."
              : "Your email has been verified."}
          </Text>

          <Text style={[styles.emailText, { color: colors.textDark }]}>{email || "No email detected"}</Text>

          <Text style={[styles.redirectText, { color: colors.textDimmed }]}>Redirecting..</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 44,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  checkIcon: { width: 88, height: 88, marginBottom: 28 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  emailText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  redirectText: {
    fontSize: 13,
    top: 15,
    textAlign: "center",
    fontStyle: "italic",
  },
});

