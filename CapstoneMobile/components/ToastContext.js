import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";

import { useTheme } from "./ThemeContext";

const ToastContext = createContext({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);


export function ToastProvider({ children }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const showToast = useCallback((message, variant = "success", duration = 3000) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ message, variant });

    // Slide in
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Auto dismiss
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, duration);
  }, [translateY, opacity]);

  const TOAST_COLORS = {
    success: { bg: colors.greenLight, border: colors.green, text: colors.green, icon: "✓" },
    error:   { bg: colors.redLight, border: colors.red, text: colors.red, icon: "✕" },
    info:    { bg: colors.blueLight, border: colors.blue, text: colors.blue, icon: "ℹ" },
  };

  const color = toast ? TOAST_COLORS[toast.variant] || TOAST_COLORS.info : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && color && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            {
              backgroundColor: colors.cardBg,
              borderColor: color.border,
              borderLeftWidth: 6,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: color.border }]}>
            <Text style={styles.iconText}>{color.icon}</Text>
          </View>
          <Text style={[styles.message, { color: color.text }]} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
  },
});
