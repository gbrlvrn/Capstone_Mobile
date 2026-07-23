import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";

/**
 * Reusable empty state component with optional illustration image.
 *
 * Props:
 *   icon        – Ionicons name (default "folder-open-outline"), used when no image
 *   image       – require('...') image source (if provided, replaces the icon circle)
 *   title       – main heading
 *   subtitle    – descriptive text
 *   ctaLabel    – optional button label
 *   onCta       – optional button callback
 *   color       – accent color (default "#0D1F45")
 */
export default function EmptyState({
  icon = "folder-open-outline",
  image,
  title = "Nothing here yet",
  subtitle = "",
  ctaLabel,
  onCta,
  color = "#0D1F45",
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {image ? (
        <Image source={image} style={styles.illustration} resizeMode="contain" />
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: `${color}10` }]}>
          <Ionicons name={icon} size={44} color={color} />
        </View>
      )}
      <Text style={[styles.title, { color: colors.textDark }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      {ctaLabel && onCta && (
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: color }]}
          onPress={onCta}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  illustration: {
    width: 180,
    height: 160,
    marginBottom: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2744",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7FA3",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
