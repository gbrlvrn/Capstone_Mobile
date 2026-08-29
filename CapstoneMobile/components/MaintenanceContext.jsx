import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
} from "react-native";
import { getPublicSettings } from "../services/AuthService";
import { useTheme } from "./ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));

const LOGO = require("../assets/puac_logo.png");

const MaintenanceContext = createContext({
  isMaintenanceMode: false,
  maintenanceMessage: "",
  checkMaintenance: async () => false,
  setMaintenanceMode: () => {},
});

export function useMaintenanceMode() {
  return useContext(MaintenanceContext);
}

export function MaintenanceProvider({ children }) {
  const { colors } = useTheme();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [checking, setChecking] = useState(false);

  // Animations
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Run entrance animation when maintenance mode activates
  useEffect(() => {
    if (isMaintenanceMode) {
      iconScale.setValue(0.5);
      iconOpacity.setValue(0);
      contentOpacity.setValue(0);
      contentTranslateY.setValue(20);

      // Icon bounce in
      Animated.sequence([
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1,
            tension: 50,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Content fade in
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Breathing pulse on icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isMaintenanceMode]);

  const checkMaintenance = useCallback(async () => {
    try {
      const res = await getPublicSettings();
      if (res?.maintenanceMode === true) {
        setIsMaintenanceMode(true);
        setMaintenanceMessage(
          res?.maintenanceMessage ||
            "The IsangDiwa platform is currently undergoing system updates. Access for regular members is temporarily restricted."
        );
        return true;
      } else {
        setIsMaintenanceMode(false);
        setMaintenanceMessage("");
        return false;
      }
    } catch {
      // If we can't reach the server, don't block the user
      return false;
    }
  }, []);

  const handleRetry = useCallback(async () => {
    setChecking(true);
    try {
      const stillMaintenance = await checkMaintenance();
      if (!stillMaintenance) {
        setIsMaintenanceMode(false);
      }
    } finally {
      setChecking(false);
    }
  }, [checkMaintenance]);

  // Expose a way for login to trigger maintenance from 503
  const setMaintenanceMode = useCallback((active, message) => {
    setIsMaintenanceMode(active);
    if (message) setMaintenanceMessage(message);
  }, []);

  return (
    <MaintenanceContext.Provider
      value={{ isMaintenanceMode, maintenanceMessage, checkMaintenance, setMaintenanceMode }}
    >
      {children}

      {/* Full-Screen Maintenance Overlay */}
      <Modal
        visible={isMaintenanceMode}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={[styles.overlay, { backgroundColor: colors.bg }]}>
          {/* Decorative top gradient bar */}
          <View style={styles.topBar}>
            <View style={[styles.topBarInner, { backgroundColor: colors.blue || "#0D1F45" }]} />
          </View>

          <View style={styles.content}>
            {/* Animated Icon Area */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: Animated.multiply(iconScale, pulseAnim) }],
                  opacity: iconOpacity,
                },
              ]}
            >
              <View style={[styles.iconCircleOuter, { borderColor: "rgba(245,166,35,0.15)" }]}>
                <View style={[styles.iconCircle, { backgroundColor: "rgba(245,166,35,0.1)" }]}>
                  <Text style={styles.wrenchEmoji}>🛠️</Text>
                </View>
              </View>
            </Animated.View>

            {/* Badge */}
            <Animated.View
              style={{
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }}
            >
              <View style={[styles.badge, { backgroundColor: "rgba(245,166,35,0.12)", borderColor: "rgba(245,166,35,0.3)" }]}>
                <Text style={[styles.badgeText, { color: "#D4910A" }]}>Scheduled Maintenance</Text>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.textDark }]}>
                System Under Maintenance
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.textMuted }]}>
                {maintenanceMessage ||
                  "The IsangDiwa platform is currently undergoing system updates. Access for regular members is temporarily restricted."}
              </Text>

              {/* Info card */}
              <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <Image source={LOGO} style={styles.infoLogo} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoTitle, { color: colors.textDark }]}>IsangDiwa</Text>
                  <Text style={[styles.infoSub, { color: colors.textMuted }]}>
                    We'll be back shortly. Thank you for your patience.
                  </Text>
                </View>
              </View>

              {/* Retry Button */}
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.blue || "#0D1F45" }]}
                activeOpacity={0.8}
                onPress={handleRetry}
                disabled={checking}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.retryBtnText}>Check System Status</Text>
                )}
              </TouchableOpacity>

              {/* Subtle hint */}
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Tap above to check if maintenance is complete
              </Text>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </MaintenanceContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    overflow: "hidden",
  },
  topBarInner: {
    flex: 1,
  },
  content: {
    width: "100%",
    paddingHorizontal: 36,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 28,
  },
  iconCircleOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    alignItems: "center",
    justifyContent: "center",
  },
  wrenchEmoji: {
    fontSize: 48,
  },
  badge: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  infoLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  infoSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  retryBtn: {
    alignSelf: "center",
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default MaintenanceContext;
