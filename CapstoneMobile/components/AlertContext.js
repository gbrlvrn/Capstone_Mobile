import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  Image,
} from "react-native";
import { useTheme } from "./ThemeContext";

const ICONS = {
  success: require("../assets/icons/check-circle.png"),
  remove: require("../assets/icons/close.png"),
  error: require("../assets/icons/close.png"),
  info: require("../assets/icons/bell.png"),
};

function getAlertTheme(title, message, buttons, C) {
  const t = (title || "").toLowerCase();
  const m = (message || "").toLowerCase();
  const hasDestructiveBtn = buttons?.some(
    (b) =>
      b.style === "destructive" ||
      b.text?.toLowerCase() === "remove" ||
      b.text?.toLowerCase() === "delete" ||
      b.text?.toLowerCase() === "deactivate"
  );

  // 1. Success (Goal Added, Goal Removed, Action Completed, Saved, Created)
  const isGoalRemovedSuccess = t.includes("goal removed") || (t.includes("removed") && !hasDestructiveBtn);
  if (
    isGoalRemovedSuccess ||
    t.includes("success") ||
    t.includes("created") ||
    t.includes("added") ||
    t.includes("approved") ||
    t.includes("done") ||
    t.includes("submitted") ||
    t.includes("completed")
  ) {
    return {
      type: "success",
      color: "#10B981", // Emerald Green for success
      lightBg: "rgba(16, 185, 129, 0.12)",
      icon: ICONS.success,
      buttonBg: "#10B981",
      buttonTextColor: "#FFFFFF",
    };
  }

  // 2. Destructive Confirmation / Warning / Error
  if (
    hasDestructiveBtn ||
    t.includes("remove goal") ||
    t.includes("delete") ||
    t.includes("error") ||
    t.includes("failed") ||
    t.includes("cannot") ||
    t.includes("declined")
  ) {
    return {
      type: "destructive",
      color: "#EF4444", // Clean Red for removal
      lightBg: "rgba(239, 68, 68, 0.12)",
      icon: ICONS.remove,
      buttonBg: "#EF4444",
      buttonTextColor: "#FFFFFF",
    };
  }

  // 3. Default / Info
  return {
    type: "info",
    color: C.blue || "#0D1F45",
    lightBg: C.blueLight || "rgba(13, 31, 69, 0.08)",
    icon: ICONS.info,
    buttonBg: C.blue || "#0D1F45",
    buttonTextColor: "#FFFFFF",
  };
}

const AlertContext = createContext({ showAlert: () => {} });

export const useAlert = () => useContext(AlertContext);

export function AlertProvider({ children }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: "",
    message: "",
    buttons: [],
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const translateYAnim = useRef(new Animated.Value(22)).current;
  const iconScaleAnim = useRef(new Animated.Value(0.3)).current;

  const C = colors;

  const showAlert = useCallback((title, message, buttons) => {
    // Trigger haptic feedback based on alert type/title
    if (title && typeof title === "string") {
      const lower = title.toLowerCase();
      if (lower.includes("error") || lower.includes("invalid") || lower.includes("failed") || lower.includes("cannot")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else if (lower.includes("success") || lower.includes("submitted") || lower.includes("approved") || lower.includes("done")) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }

    // If no buttons are provided, default to an "OK" button
    const defaultButtons = [{ text: "OK", onPress: () => {} }];
    const finalButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;
    
    // Reset initial values for fluid entry
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.88);
    translateYAnim.setValue(22);
    iconScaleAnim.setValue(0.3);
    setConfig({ title, message, buttons: finalButtons });
    setVisible(true);

    Animated.parallel([
      // Smooth backdrop and card fade-in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      // Organic spring for scale and position float
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 110,
        friction: 7.5,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 110,
        friction: 7.5,
        useNativeDriver: true,
      }),
      // Lively pop bounce for the badge icon
      Animated.sequence([
        Animated.delay(40),
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 5.5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, scaleAnim, translateYAnim, iconScaleAnim]);

  const handleClose = useCallback((onPress) => {
    // Snappy, responsive exit animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 10,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (onPress) onPress();
    });
  }, [fadeAnim, scaleAnim, translateYAnim]);

  const alertTheme = getAlertTheme(config.title, config.message, config.buttons, C);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={() => handleClose()}
      >
        <View style={styles.overlay}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          
          <Animated.View 
            style={[
              styles.card, 
              { 
                backgroundColor: colors.cardBg || "#FFFFFF",
                borderColor: colors.cardBorder || C.cardBorder,
                opacity: fadeAnim, 
                transform: [
                  { scale: scaleAnim },
                  { translateY: translateYAnim },
                ],
              }
            ]}
          >
            {/* Top Accent Stripe */}
            <View style={[styles.topStripe, { backgroundColor: alertTheme.color }]} />

            <View style={styles.cardContent}>
              {/* Animated Bouncy Icon Badge */}
              <Animated.View style={[
                styles.iconCircle, 
                { backgroundColor: alertTheme.lightBg, transform: [{ scale: iconScaleAnim }] }
              ]}>
                <Image
                  source={alertTheme.icon}
                  style={[styles.alertIcon, { tintColor: alertTheme.color }]}
                  resizeMode="contain"
                />
              </Animated.View>

              {config.title ? (
                <Text style={[styles.title, { color: colors.textDark || C.textDark }]}>
                  {config.title}
                </Text>
              ) : null}

              {config.message ? (
                <Text style={[styles.message, { color: colors.textMuted || C.textMuted }]}>
                  {config.message}
                </Text>
              ) : null}
            </View>

            {/* Buttons */}
            <View style={[styles.buttonContainer, { borderTopColor: colors.cardBorder || C.cardBorder }]}>
              {config.buttons.map((btn, index) => {
                const isDestructive =
                  btn.style === "destructive" ||
                  btn.text?.toLowerCase() === "remove" ||
                  btn.text?.toLowerCase() === "delete" ||
                  btn.text?.toLowerCase() === "deactivate";
                const isCancel = btn.style === "cancel" || btn.text?.toLowerCase() === "cancel";

                // Styled solid action button for single button modal (e.g. OK)
                if (config.buttons.length === 1) {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.singleButton, { backgroundColor: alertTheme.buttonBg }]}
                      activeOpacity={0.8}
                      onPress={() => handleClose(btn.onPress)}
                    >
                      <Text style={[styles.singleButtonText, { color: alertTheme.buttonTextColor }]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                // Multi-button layout (e.g. Cancel and Remove)
                let btnBg = colors.secondaryBtnBg || "#F1F5F9";
                let textColor = colors.textDark || C.textDark;

                if (isDestructive) {
                  btnBg = "#EF4444";
                  textColor = "#FFFFFF";
                } else if (!isCancel) {
                  btnBg = alertTheme.buttonBg;
                  textColor = "#FFFFFF";
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionButton,
                      { backgroundColor: btnBg },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleClose(btn.onPress)}
                  >
                    <Text 
                      style={[
                        styles.actionButtonText, 
                        { color: textColor, fontWeight: "700" }
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  topStripe: {
    height: 4,
    width: "100%",
  },
  cardContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 4,
    alignItems: "center",
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  alertIcon: {
    width: 28,
    height: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  singleButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  singleButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
