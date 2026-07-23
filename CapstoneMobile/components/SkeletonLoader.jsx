import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import { useTheme } from "./ThemeContext";

/**
 * Base skeleton block with animated shimmer.
 * Props: width, height, borderRadius, style
 */
export function SkeletonBlock({ width = "100%", height = 16, borderRadius = 8, style }) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeletonBase,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Circle avatar skeleton */
export function SkeletonAvatar({ size = 48, style }) {
  return <SkeletonBlock width={size} height={size} borderRadius={size / 2} style={style} />;
}

/** Single text line skeleton */
export function SkeletonLine({ width = "100%", height = 14, style }) {
  return <SkeletonBlock width={width} height={height} borderRadius={4} style={[{ marginBottom: 8 }, style]} />;
}

/** Card skeleton: mimics a stat card */
export function SkeletonCard({ style }) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <SkeletonBlock width={40} height={40} borderRadius={12} style={{ marginBottom: 10 }} />
      <SkeletonLine width="60%" />
      <SkeletonLine width="40%" height={20} />
    </View>
  );
}

/** Member card skeleton */
export function SkeletonMemberCard() {
  return (
    <View style={skeletonStyles.memberCard}>
      <SkeletonAvatar size={48} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <SkeletonLine width="55%" height={16} />
        <SkeletonLine width="75%" height={12} />
      </View>
      <SkeletonBlock width={60} height={26} borderRadius={13} />
    </View>
  );
}

/** Profile info row skeleton */
export function SkeletonInfoRows({ count = 6 }) {
  return (
    <View style={{ paddingHorizontal: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={skeletonStyles.infoRow}>
          <SkeletonLine width="35%" height={11} style={{ marginBottom: 4 }} />
          <SkeletonLine width="65%" height={15} />
        </View>
      ))}
    </View>
  );
}

/** Wide stat card skeleton (used by Loans, Donations, Attendance) */
export function SkeletonStatCard({ style }) {
  return (
    <View style={[skeletonStyles.statCard, style]}>
      <View style={{ flex: 1 }}>
        <SkeletonLine width="50%" height={12} />
        <SkeletonBlock width="70%" height={26} borderRadius={6} />
      </View>
      <SkeletonBlock width={46} height={46} borderRadius={14} />
    </View>
  );
}

/** Quick action card skeleton */
export function SkeletonQuickAction() {
  return (
    <View style={skeletonStyles.quickAction}>
      <SkeletonBlock width={42} height={42} borderRadius={14} style={{ marginBottom: 10 }} />
      <SkeletonLine width="70%" height={13} />
      <SkeletonLine width="50%" height={10} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECF0",
    width: "48%",
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECF0",
    marginBottom: 16,
    marginHorizontal: 20,
  },
  infoRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECF0",
    marginBottom: 12,
  },
  quickAction: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECF0",
    width: "48%",
    marginBottom: 12,
  },
});

