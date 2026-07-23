/**
 * OfflineBanner.jsx
 * Animated banner that shows when the device is offline.
 */
import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { isOnline, getQueue } from "../services/OfflineService";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    let mounted = true;

    const checkConnectivity = async () => {
      const online = await isOnline();
      if (!mounted) return;

      if (!online && !offline) {
        setOffline(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }).start();
      } else if (online && offline) {
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (mounted) setOffline(false);
        });
      }

      // Update queue count
      const queue = await getQueue();
      if (mounted) setQueueCount(queue.length);
    };

    checkConnectivity();
    const interval = setInterval(checkConnectivity, 10000); // Check every 10s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [offline, slideAnim]);

  if (!offline) return null;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.dot} />
      <Text style={styles.text}>
        You're offline
        {queueCount > 0 ? ` • ${queueCount} pending` : " • Changes will sync when reconnected"}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(255, 149, 0, 0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFF",
    opacity: 0.8,
  },
  text: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
