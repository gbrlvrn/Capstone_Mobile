/**
 * NetworkContext.jsx
 *
 * Monitors device internet connectivity using expo-network.
 * Exposes:
 *   - isOnline (boolean)       — current connectivity state
 *   - showOfflineBanner()      — call this when a screen falls back to cached/mock data
 *
 * Usage in screens:
 *   const { isOnline, showOfflineBanner } = useNetwork();
 *
 * The OfflineBanner renders itself at the app level (inside NetworkProvider)
 * so screens don't need to render any extra UI.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import * as Network from "expo-network";

const NetworkContext = createContext({
  isOnline: true,
  showOfflineBanner: () => {},
});

export const useNetwork = () => useContext(NetworkContext);

// How often to poll for connectivity (ms)
const POLL_INTERVAL = 8000;

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");

  // Animation values
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);

  // ── Animate banner in ──────────────────────────────────────────────
  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  // ── Animate banner out ─────────────────────────────────────────────
  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => setBannerVisible(false));
  }, [translateY, opacity]);

  // ── Show banner for a given message ───────────────────────────────
  const showBanner = useCallback(
    (message, duration = 5000) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setBannerMessage(message);
      setBannerVisible(true);
      animateIn();
      hideTimer.current = setTimeout(animateOut, duration);
    },
    [animateIn, animateOut]
  );

  // ── Public API: called by screens when falling back to cached data ─
  const showOfflineBanner = useCallback(
    (msg = "You're offline — showing cached data") => {
      showBanner(msg, 5000);
    },
    [showBanner]
  );

  // ── Poll network state every POLL_INTERVAL ms ──────────────────────
  useEffect(() => {
    let mounted = true;

    const checkConnectivity = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const online =
          state.isConnected === true && state.isInternetReachable !== false;

        if (mounted) {
          setIsOnline((prev) => {
            // Just came back online → show "back online" toast
            if (!prev && online) {
              showBanner("Back online ✓", 3000);
            }
            // Just went offline → show persistent offline banner
            if (prev && !online) {
              showBanner("No internet connection — showing cached data", 6000);
            }
            return online;
          });
        }
      } catch {
        // Network module unavailable — assume online to avoid false positives
      }
    };

    // Initial check
    checkConnectivity();
    const interval = setInterval(checkConnectivity, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showBanner]);

  return (
    <NetworkContext.Provider value={{ isOnline, showOfflineBanner }}>
      {children}

      {/* ── Offline Banner — rendered at app level, above all screens ── */}
      {bannerVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.banner,
            isOnline ? styles.bannerOnline : styles.bannerOffline,
            { transform: [{ translateY }], opacity },
          ]}
        >
          <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.text, isOnline ? styles.textOnline : styles.textOffline]}>
            {bannerMessage}
          </Text>
        </Animated.View>
      )}
    </NetworkContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 38,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99999,
  },
  bannerOffline: {
    backgroundColor: "#1A1A2E",
    borderColor: "rgba(231,76,60,0.4)",
  },
  bannerOnline: {
    backgroundColor: "#0D2B1A",
    borderColor: "rgba(52,199,89,0.4)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  dotOffline: { backgroundColor: "#E74C3C" },
  dotOnline: { backgroundColor: "#34C759" },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  textOffline: { color: "#FF8A80" },
  textOnline: { color: "#69F0AE" },
});
