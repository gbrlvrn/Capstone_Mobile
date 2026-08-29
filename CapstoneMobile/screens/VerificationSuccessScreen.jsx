import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../components/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";

const SESSION_KEY = "@faithly_session";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Confetti colors palette
const CONFETTI_COLORS = [
  "#2E6BF0", "#34C759", "#F5A623", "#AF52DE",
  "#FF3B30", "#00C3FF", "#FF9500", "#E74C3C",
  "#0D1F45", "#48DBFB", "#D4AC0D", "#FF6B6B",
];

const CONFETTI_COUNT = 40;

function cleanEmail(e) {
  return (e || "").trim().toLowerCase();
}

// Single confetti particle component
function ConfettiPiece({ delay, color, startX }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift = (Math.random() - 0.5) * 160;
    const duration = 2200 + Math.random() * 1800;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT * 0.7,
          duration: duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: drift,
          duration: duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 4 + Math.random() * 6,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(duration * 0.6),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.4,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const isRound = Math.random() > 0.5;
  const size = 6 + Math.random() * 8;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: -10,
        left: startX,
        width: size,
        height: isRound ? size : size * 2.5,
        borderRadius: isRound ? size / 2 : 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: spin }, { scale }],
      }}
    />
  );
}

export default function VerificationSuccessScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const source = route?.params?.source || "login";
  const email = cleanEmail(route?.params?.email);
  const user = route?.params?.user || null;

  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;

  // Generate confetti pieces data
  const confettiPieces = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      startX: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 600,
    }));
  }, []);

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      // 1. Ring burst
      Animated.parallel([
        Animated.spring(ringScale, {
          toValue: 1.3,
          tension: 50,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Checkmark bounce in (slightly delayed)
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          tension: 60,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Pulse animation (loop)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Text fade-in
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timer = setTimeout(async () => {
      if (!email) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
        return;
      }

      if (source === "signup") {
        // Web server's /verify-otp does NOT return a JWT — the user must log in.
        // Redirect to Login with a success banner so they know to sign in.
        navigation.reset({
          index: 0,
          routes: [{ name: "Login", params: { registrationSuccess: true } }],
        });
      } else {
        // Existing user (login) → save session + go to Home
        try {
          await AsyncStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ email })
          );
          const oldUser = await AsyncStorage.getItem("faithly_user");
          const parsedUser = oldUser ? JSON.parse(oldUser) : {};
          await AsyncStorage.setItem(
            "faithly_user",
            JSON.stringify({ ...parsedUser, email })
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
  }, [navigation, email, source, user]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Confetti Layer */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {confettiPieces.map((piece) => (
          <ConfettiPiece
            key={piece.id}
            delay={piece.delay}
            color={piece.color}
            startX={piece.startX}
          />
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        {/* Animated Check Icon */}
        <View style={styles.checkContainer}>
          {/* Expanding ring burst */}
          <Animated.View
            style={[
              styles.ringBurst,
              {
                borderColor: "#34C759",
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />

          {/* Pulsing glow */}
          <Animated.View
            style={[
              styles.glowCircle,
              {
                transform: [{ scale: pulseScale }],
              },
            ]}
          />

          {/* Main check circle */}
          <Animated.View
            style={[
              styles.checkCircle,
              {
                transform: [{ scale: checkScale }],
                opacity: checkOpacity,
              },
            ]}
          >
            <Ionicons name="checkmark-sharp" size={48} color="#FFFFFF" />
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslateY }] }}>
          <Text style={[styles.title, { color: colors.textDark }]}>Verification Successful!</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {source === "signup"
              ? "Your account has been verified."
              : "Your email has been verified."}
          </Text>

          <View style={[styles.emailPill, { backgroundColor: colors.inputBg || "rgba(46,107,240,0.08)", borderColor: colors.cardBorder }]}>
            <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.emailText, { color: colors.textDark }]}>{email || "No email detected"}</Text>
          </View>

          <View style={styles.redirectRow}>
            <View style={styles.dotPulse}>
              <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
              <View style={[styles.dot, { backgroundColor: colors.textMuted, opacity: 0.6 }]} />
              <View style={[styles.dot, { backgroundColor: colors.textMuted, opacity: 0.3 }]} />
            </View>
            <Text style={[styles.redirectText, { color: colors.textMuted }]}>Redirecting you shortly</Text>
          </View>
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
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    overflow: "hidden",
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 28,
    paddingVertical: 48,
    paddingHorizontal: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  checkContainer: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  ringBurst: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
  },
  glowCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(52,199,89,0.12)",
  },
  checkCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  emailPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    alignSelf: "center",
  },
  emailText: {
    fontSize: 13,
    fontWeight: "600",
  },
  redirectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dotPulse: {
    flexDirection: "row",
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  redirectText: {
    fontSize: 13,
    fontStyle: "italic",
  },
});
