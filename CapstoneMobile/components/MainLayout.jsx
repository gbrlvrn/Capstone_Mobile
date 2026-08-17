import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Dimensions,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { getVerificationStatus, clearSavedCredentials } from "../services/AuthService";
import { clearToken } from "../services/AuthService";
import { useTheme } from "./ThemeContext";
import { ICONS, TAB_ITEMS, SIDEBAR_ITEMS, LOGO } from "./constants";
import ChatbotModal from "../screens/ChatbotModal";
import DraggableChatButton from "./DraggableChatButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_WIDTH = SCREEN_WIDTH / 5;

/**
 * MainLayout — Shared navigation wrapper layout blueprint.
 *
 * Capstone Architectural Note (Item #8):
 * Originally designed to wrap screens with top bar, sidebar drawer, FloatingNavBar,
 * draggable chatbot button, and sign-out confirmation. In the stabilized navigation
 * architecture, leaf screens (Announcements, Savings, Profile, Settings) implement custom
 * top back-navigation bars, while primary screens use direct layout composition to allow
 * screen-level modal overlays without z-index collisions. MainLayout serves as the reference
 * model for future centralized layout refactoring.
 *
 * Props:
 *  - activeTab: string (e.g. "Home", "Loans")
 *  - navigation: React Navigation object
 *  - userEmail: string
 *  - showNotificationBell: boolean (default true)
 *  - children: React node (screen content)
 */
export default function MainLayout({
  activeTab: initialTab,
  navigation,
  userEmail,
  showNotificationBell = true,
  children,
}) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [activeTab, setActiveTab] = useState(initialTab || "Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [userRole, setUserRole] = useState("member");
  const [userPosition, setUserPosition] = useState("");

  const slideX = useRef(new Animated.Value(-260)).current;
  const indicatorPosition = useRef(
    new Animated.Value((TAB_ITEMS.findIndex((t) => t.key === initialTab) || 0) * TAB_WIDTH)
  ).current;

  const tabAnimations = useRef(
    TAB_ITEMS.map((_, i) => ({
      scale: new Animated.Value(i === TAB_ITEMS.findIndex((t) => t.key === initialTab) ? 1.2 : 1),
      bgOpacity: new Animated.Value(i === TAB_ITEMS.findIndex((t) => t.key === initialTab) ? 1 : 0),
    }))
  ).current;

  // Re-fetch verification status on focus
  useFocusEffect(
    useCallback(() => {
      if (!userEmail) return;
      (async () => {
        try {
          const data = await getVerificationStatus(userEmail);
          if (data?.role) setUserRole(data.role);
          if (data?.position) setUserPosition(data.position);
          const cached = await AsyncStorage.getItem("faithly_user");
          const parsed = cached ? JSON.parse(cached) : {};
          await AsyncStorage.setItem(
            "faithly_user",
            JSON.stringify({ ...parsed, role: data?.role || "member", position: data?.position || "" })
          );
        } catch {}
      })();
    }, [userEmail])
  );

  // Check for unread notifications
  useFocusEffect(
    useCallback(() => {
      if (!userEmail) return;
      (async () => {
        try {
          const savedData = await AsyncStorage.getItem(`faithly_notifications_${userEmail}`);
          if (savedData) {
            const notifs = JSON.parse(savedData);
            setNotificationCount(notifs.filter((n) => !n.read).length);
          }
        } catch {}
      })();
    }, [userEmail])
  );

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    Animated.timing(slideX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideX]);

  const closeSidebar = useCallback(() => {
    Animated.timing(slideX, { toValue: -260, duration: 250, useNativeDriver: true }).start(() =>
      setSidebarOpen(false)
    );
  }, [slideX]);

  const navWithEmail = useCallback(
    (screen) => navigation.replace(screen, { email: userEmail }),
    [navigation, userEmail]
  );

  // Animate tab indicator + icons
  useEffect(() => {
    const index = TAB_ITEMS.findIndex((t) => t.key === activeTab);
    Animated.spring(indicatorPosition, {
      toValue: index * TAB_WIDTH,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    tabAnimations.forEach((anim, i) => {
      Animated.parallel([
        Animated.spring(anim.scale, {
          toValue: i === index ? 1.2 : 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(anim.bgOpacity, {
          toValue: i === index ? 1 : 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [activeTab, indicatorPosition, tabAnimations]);

  const handleSignOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("faithly_user");
      await AsyncStorage.removeItem("@faithly_session");
      // Clear saved credentials so silent re-auth doesn't log user back in
      await clearSavedCredentials();
      await clearToken();
      setShowSignOutConfirm(false);
      closeSidebar();
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
      }, 300);
    } catch (err) {
      console.log("Sign out error:", err);
    }
  }, [navigation, closeSidebar]);

  const handleNotificationPress = useCallback(() => {
    navigation.navigate("Notifications", { email: userEmail });
  }, [navigation, userEmail]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: colors.navBg }]}>
        <TouchableOpacity onPress={openSidebar} style={styles.hamburgerBtn} activeOpacity={0.6} accessibilityLabel="Open navigation menu" accessibilityRole="button">
          <View style={styles.hLine} />
          <View style={styles.hLine} />
          <View style={styles.hLine} />
        </TouchableOpacity>

        <Text style={styles.topTitle}>IsangDiwa</Text>

        {showNotificationBell ? (
          <TouchableOpacity onPress={handleNotificationPress} style={styles.notificationBtn} activeOpacity={0.6} accessibilityLabel="View notifications" accessibilityRole="button">
            <Image source={ICONS.notification} style={styles.notificationIcon} resizeMode="contain" />
            {notificationCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      {/* Screen content */}
      {children}

      {/* Floating draggable chat button */}
      <DraggableChatButton onPress={() => setChatbotOpen(true)} />

      {/* Chatbot Modal */}
      <ChatbotModal visible={chatbotOpen} onClose={() => setChatbotOpen(false)} />

      {/* Sign Out Confirmation Modal */}
      <Modal visible={showSignOutConfirm} transparent animationType="fade" onRequestClose={() => setShowSignOutConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <View style={styles.confirmIconContainer}>
              <Image source={ICONS.signout} style={styles.confirmIcon} resizeMode="contain" />
            </View>
            <Text style={styles.confirmTitle}>Sign Out</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to sign out of your account?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmBtnCancel} activeOpacity={0.7} onPress={() => setShowSignOutConfirm(false)}>
                <Text style={styles.confirmBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtnSignOut} activeOpacity={0.7} onPress={handleSignOut}>
                <Text style={styles.confirmBtnSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.tabBg }]}>
        <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: indicatorPosition }] }]} />
        {TAB_ITEMS.map((tab, index) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key !== initialTab) navWithEmail(tab.key);
              }}
              activeOpacity={0.7}
            >
              <Animated.View style={[styles.tabBgCircle, { opacity: tabAnimations[index].bgOpacity }]} />
              <Animated.View style={{ transform: [{ scale: tabAnimations[index].scale }] }}>
                <Image
                  source={tab.icon}
                  style={[styles.tabIcon, { tintColor: isActive ? "#0D1F45" : colors.tabInactive, opacity: isActive ? 1 : 0.6 }]}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={[styles.tabLabel, { color: isActive ? "#0D1F45" : colors.tabInactive, fontWeight: isActive ? "700" : "500", fontSize: isActive ? 11 : 10, opacity: isActive ? 1 : 0.7 }]}>
                {tab.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sidebar overlay */}
      {sidebarOpen && <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSidebar} />}

      {/* Sidebar drawer */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideX }] }]}>
        <View style={styles.sidebarHeader}>
          <Image source={LOGO} style={styles.sidebarLogo} resizeMode="contain" />
          <View>
            <Text style={styles.sidebarTitle}>IsangDiwa</Text>
          </View>
        </View>

        <View style={styles.sidebarNav}>
          {SIDEBAR_ITEMS.map((item) => {
            const isItemActive = activeTab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.sidebarItem, isItemActive && styles.sidebarItemActive]}
                onPress={() => {
                  setActiveTab(item.key);
                  closeSidebar();
                  navWithEmail(item.key);
                }}
                activeOpacity={0.6}
                accessibilityLabel={`Go to ${item.key}`}
                accessibilityRole="menuitem"
              >
                <Image
                  source={item.icon}
                  style={[styles.sidebarIcon, { tintColor: isItemActive ? "#FFFFFF" : "rgba(255,255,255,0.5)" }]}
                  resizeMode="contain"
                />
                <Text style={[styles.sidebarItemText, isItemActive && styles.sidebarItemTextActive]}>{item.key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sidebarFooter}>
          <View style={styles.sidebarUserRow}>
            <View style={styles.sidebarAvatar}>
              <Image source={ICONS.person} style={styles.sidebarAvatarIcon} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sidebarUserName}>
                {userRole === "officer" && userPosition ? userPosition : "Member"}
              </Text>
              <Text style={styles.sidebarUserEmail} numberOfLines={1} ellipsizeMode="tail">
                {userEmail || "No email loaded"}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.signOutRow} activeOpacity={0.6} onPress={() => setShowSignOutConfirm(true)} accessibilityLabel="Sign out of your account" accessibilityRole="button">
            <Image source={ICONS.signout} style={styles.signOutIcon} resizeMode="contain" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 56 : 42,
    paddingBottom: 14,
  },
  hamburgerBtn: { padding: 4, justifyContent: "center", gap: 5 },
  hLine: { width: 25, height: 3, backgroundColor: C.hamburgerColor, borderRadius: 1.2 },
  topTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "600", color: C.topTitleColor },
  notificationBtn: { padding: 4, position: "relative" },
  notificationIcon: { width: 24, height: 24, tintColor: C.notifIconColor },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E74C3C",
    borderWidth: 1.5,
    borderColor: "#0D1F45",
    zIndex: 10,
  },

  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(100,140,200,0.2)",
    paddingVertical: 15,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    position: "relative",
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, position: "relative" },
  tabBgCircle: {
    position: "absolute",
    width: 75,
    height: 62,
    borderRadius: 15,
    backgroundColor: "rgba(46,107,240,0.15)",
    top: -8,
  },
  tabIcon: { width: 26, height: 26 },
  tabLabel: { fontSize: 10 },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: TAB_WIDTH,
    height: 3,
    backgroundColor: "#0D1F45",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 998,
    elevation: 998,
  },

  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    backgroundColor: C.sidebarBg,
    zIndex: 1000,
    elevation: 1000,
    flexDirection: "column",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: Platform.OS === "ios" ? 58 : 44,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  sidebarLogo: { width: 46, height: 46, borderRadius: 45 },
  sidebarTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  sidebarNav: { flex: 1, paddingHorizontal: 12 },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  sidebarItemActive: { backgroundColor: "rgba(46,107,240,0.05)" },
  sidebarIcon: { width: 20, height: 20, tintColor: C.sidebarIconDefault },
  sidebarItemText: { fontSize: 15, color: C.sidebarIconDefault, fontWeight: "600" },
  sidebarItemTextActive: { color: C.sidebarTextActive },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(60,90,150,0.25)",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 18,
  },
  sidebarUserRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sidebarAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(31, 102, 255, 0.93)",
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarAvatarIcon: { width: 18, height: 18, tintColor: "#FFFFFF" },
  sidebarUserName: { fontSize: 14, fontWeight: "700", color: C.sidebarTextDefault },
  sidebarUserEmail: { fontSize: 11, color: C.sidebarIconDefault, marginTop: 1 },
  signOutRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  signOutIcon: { width: 30, height: 40, tintColor: "#E74C3C" },
  signOutText: { fontSize: 14, color: "#E74C3C", fontWeight: "700" },

  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmDialog: {
    backgroundColor: C.modalBg,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  confirmIcon: { width: 32, height: 32, tintColor: "#E74C3C" },
  confirmTitle: { fontSize: 22, fontWeight: "800", color: C.textDark, marginBottom: 12, textAlign: "center" },
  confirmMessage: { fontSize: 15, color: C.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  confirmButtons: { flexDirection: "row", gap: 12, width: "100%" },
  confirmBtnCancel: { flex: 1, backgroundColor: C.modalCancelBg, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  confirmBtnCancelText: { fontSize: 15, fontWeight: "700", color: C.modalCancelText },
  confirmBtnSignOut: { flex: 1, backgroundColor: "#E74C3C", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  confirmBtnSignOutText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
