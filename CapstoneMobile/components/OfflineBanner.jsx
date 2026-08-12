/**
 * OfflineBanner.jsx
 *
 * Animated top banner shown when the device has no internet connection.
 * Uses expo-network for fast system-level detection + OfflineService
 * for actual backend reachability confirmation.
 *
 * Already imported by HomeScreen — no other screen changes needed.
 * Upgrade: now uses expo-network for instant detection instead of
 * relying solely on slow HEAD-request pings.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import * as Network from "expo-network";
import { getQueue } from "../services/OfflineService";

// How often to re-check connectivity (ms)
const POLL_INTERVAL = 8000;

function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backOnlineTimer = useRef(null);

  // ── Slide in ──────────────────────────────────────────────────────
  const slideIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  // ── Slide out ─────────────────────────────────────────────────────
  const slideOut = useCallback(
    (onDone) => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(onDone);
    },
    [slideAnim, opacityAnim]
  );

  // ── Connectivity polling ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let wasOffline = false;

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const online =
          state.isConnected === true && state.isInternetReachable !== false;

        if (!mounted) return;

        if (!online && !wasOffline) {
          // Just went offline
          wasOffline = true;
          setOffline(true);
          setBackOnline(false);
          slideIn();

          // Refresh queue count
          const queue = await getQueue();
          if (mounted) setQueueCount(queue.length);
        } else if (online && wasOffline) {
          // Just came back online
          wasOffline = false;
          setBackOnline(true);
          setOffline(false);
          slideIn(); // show "back online" briefly

          if (backOnlineTimer.current) clearTimeout(backOnlineTimer.current);
          backOnlineTimer.current = setTimeout(() => {
            slideOut(() => {
              if (mounted) setBackOnline(false);
            });
          }, 2500);
        }
      } catch {
        // expo-network unavailable — silently skip
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (backOnlineTimer.current) clearTimeout(backOnlineTimer.current);
    };
  }, [slideIn, slideOut]);

  // Don't render anything if we're online and no "back online" flash
  if (!offline && !backOnline) return null;

  const isBackOnline = backOnline && !offline;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        isBackOnline ? styles.bannerOnline : styles.bannerOffline,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      accessibilityLabel={isBackOnline ? "Connection restored" : "No internet connection"}
      accessibilityRole="alert"
    >
      <View
        style={[
          styles.dot,
          isBackOnline ? styles.dotOnline : styles.dotOffline,
        ]}
      />
      <Text style={[styles.text, isBackOnline ? styles.textOnline : styles.textOffline]}>
        {isBackOnline
          ? "Back online ✓"
          : queueCount > 0
          ? `Offline • ${queueCount} action${queueCount > 1 ? "s" : ""} queued`
          : "No internet — showing cached data"}
      </Text>
    </Animated.View>
  );
}

export default React.memo(OfflineBanner);

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 36,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99999,
  },
  bannerOffline: {
    backgroundColor: "#1A1A2E",
    borderColor: "rgba(231,76,60,0.5)",
  },
  bannerOnline: {
    backgroundColor: "#0D2B1A",
    borderColor: "rgba(52,199,89,0.5)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    flexShrink: 0,
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
