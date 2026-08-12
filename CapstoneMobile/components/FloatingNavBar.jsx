import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ICONS } from "./constants";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive scale — capped at 1.3 to avoid over-scaling on tablets
const W_RATIO = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * W_RATIO);

// Platform-aware bottom offset — handles iOS home indicator
const NAV_BOTTOM = Platform.select({
  ios: SCREEN_HEIGHT >= 812 ? s(24) : s(12),
  android: s(16),
  default: s(16),
});

const ALL_TAB_ITEMS = [
  { key: "Home", label: "Home", icon: ICONS.home },
  { key: "Loans", label: "Loans", icon: ICONS.loans },
  { key: "Donations", label: "Donations", icon: ICONS.donations },
  { key: "Attendance", label: "Attendance", icon: ICONS.attendance },
  { key: "Branches", label: "Branches", icon: ICONS.branches },
];

function FloatingNavBar({
  activeTab,
  navigation,
  userEmail,
  userRole = "member",
}) {
  const visibleTabs =
    userRole !== "officer"
      ? ALL_TAB_ITEMS.filter((t) => t.key !== "Loans")
      : ALL_TAB_ITEMS;

  const tabAnimations = useRef(
    ALL_TAB_ITEMS.map(() => ({
      pillWidth: new Animated.Value(0),
      labelOpacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    visibleTabs.forEach((tab) => {
      const index = ALL_TAB_ITEMS.findIndex((t) => t.key === tab.key);
      if (index === -1) return;
      const isActive = tab.key === activeTab;

      Animated.parallel([
        Animated.spring(tabAnimations[index].pillWidth, {
          toValue: isActive ? 1 : 0,
          tension: 120,
          friction: 14,
          useNativeDriver: false,
        }),
        Animated.timing(tabAnimations[index].labelOpacity, {
          toValue: isActive ? 1 : 0,
          duration: isActive ? 200 : 100,
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [activeTab, userRole]);

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {visibleTabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const index = ALL_TAB_ITEMS.findIndex((t) => t.key === tab.key);
          const anim = tabAnimations[index];

          const pillBg = isActive ? "#FFFFFF" : "transparent";
          const iconTint = isActive ? "#0D1F45" : "rgba(255, 255, 255, 0.65)";

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => {
                if (isActive) return;
                Haptics.selectionAsync().catch(() => {});
                if (navigation) {
                  navigation.replace(tab.key, { email: userEmail });
                }
              }}
              style={styles.tabTouch}
              accessibilityLabel={`Navigate to ${tab.label}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Animated.View
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: pillBg,
                    paddingHorizontal: anim.pillWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: [s(8), s(14)],
                    }),
                  },
                ]}
              >
                <Image
                  source={tab.icon}
                  style={[styles.tabIcon, { tintColor: iconTint }]}
                  resizeMode="contain"
                />
                {isActive && (
                  <Animated.Text
                    style={[
                      styles.tabLabel,
                      {
                        opacity: anim.labelOpacity,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Animated.Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default React.memo(FloatingNavBar);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: NAV_BOTTOM,
    left: s(16),
    right: s(16),
    alignItems: "center",
    zIndex: 99,
  },
  tabBar: {
    width: "100%",
    height: s(60),
    borderRadius: s(30),
    backgroundColor: "#0D1F45",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: s(6),
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  tabTouch: {
    alignItems: "center",
    justifyContent: "center",
    height: s(46),
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: s(40),
    borderRadius: s(20),
    gap: s(5),
  },
  tabIcon: {
    width: s(22),
    height: s(22),
  },
  tabLabel: {
    fontSize: s(12),
    fontWeight: "700",
    color: "#0D1F45",
  },
});
