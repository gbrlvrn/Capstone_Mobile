// SettingsScreen.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  Animated,
  Switch,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../components/ThemeContext";
import { useAlert } from "../components/AlertContext";
import { useNetwork } from "../components/NetworkContext";
import { requestPasswordReset, changePassword } from "../services/AuthService";
import OfflineBanner from "../components/OfflineBanner";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));

const LOGO = require("../assets/puac_logo.png");

const ICONS = {
  heart: require("../assets/icons/heart.png"),
  wallet: require("../assets/icons/wallet.png"),
  document: require("../assets/icons/document.png"),
  home: require("../assets/icons/home-v3.png"),
  loans: require("../assets/icons/loans.png"),
  donations: require("../assets/icons/donations.png"),
  attendance: require("../assets/icons/attendance.png"),
  branches: require("../assets/icons/branches.png"),
  profile: require("../assets/icons/profile.png"),
  settings: require("../assets/icons/settings.png"),
  person: require("../assets/icons/person.png"),
  signout: require("../assets/icons/signout.png"),
  chat: require("../assets/icons/chat.png"),
  bell: require("../assets/icons/bell.png"),
  shield: require("../assets/icons/shield.png"),
  lock: require("../assets/icons/lock.png"),
  eye: require("../assets/icons/eye.png"),
};

const C = {
  bg: "#F0F2F5",
  navBg: "#0D1F45",
  cardBg: "#FFFFFF",
  cardBorder: "#E8ECF0",
  textDark: "#1A2744",
  textMuted: "#6B7FA3",
  blue: "#0D1F45",
  blueLight: "rgba(46,107,240,0.1)",
  green: "#34C759",
  greenLight: "rgba(52,199,89,0.1)",
  gold: "#F5A623",
  goldLight: "rgba(245,166,35,0.1)",
  purple: "#AF52DE",
  purpleLight: "rgba(175,82,222,0.1)",
  red: "#E74C3C",
  tabBg: "rgb(13, 31, 69)",
  tabActive: "#0D1F45",
  tabInactive: "#e3ecf9",
  sidebarBg: "#0D1F45",
  sidebarActive: "#0D1F45",
  overlay: "rgba(0,0,0,0.45)",
  navBorder: "rgba(60,90,150,0.25)",
};

const ALL_TAB_ITEMS = [
  { key: "Home", icon: ICONS.home },
  { key: "Loans", icon: ICONS.loans },
  { key: "Donations", icon: ICONS.donations },
  { key: "Attendance", icon: ICONS.attendance },
  { key: "Branches", icon: ICONS.branches },
];

const SIDEBAR_ITEMS = [
  { key: "Announcements", icon: ICONS.bell },
  { key: "Savings", icon: ICONS.wallet },
  { key: "Profile", icon: ICONS.profile },
  { key: "Settings", icon: ICONS.settings },
];

const NOTIFICATION_PREFERENCES = [
  "Loan application updates",
  "Payment reminders",
  "Upcoming services",
  "Church announcements",
];

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export default function SettingsScreen({ navigation, route }) {
  const { colors, isDark, toggleDarkMode } = useTheme();
  const [wifiOnlySync, setWifiOnlySync] = useState(true);
  const [cacheSize, setCacheSize] = useState("14.2 MB");
  const [isClearingCache, setIsClearingCache] = useState(false);
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const { showAlert } = useAlert();
  const { isOnline } = useNetwork();
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const [activeTab, setActiveTab] = useState("Settings");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState({
    Loans: true, Payments: true, Savings: true,
    Announcements: true, Attendance: true, Donations: true
  });
  const [chatbotOpen, setChatbotOpen] = useState(false);

  // Legal document modal state — { title, content } or null
  const [docModal, setDocModal] = useState(null);

  // Password editing states
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.includes("cache") || k.includes("temp") || k.includes("devotional") || k.includes("prayers"));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      setCacheSize("0.0 KB");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showAlert("Cache Cleared", "Temporary offline files and response caches have been cleared successfully.");
    } catch (err) {
      showAlert("Error", "Failed to clear cache. Please try again.");
    } finally {
      setIsClearingCache(false);
    }
  };

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const deselectAll = () => {
    setSelectedCategories({
      Loans: false, Payments: false, Savings: false,
      Announcements: false, Attendance: false, Donations: false
    });
  };
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const emailFromParams = cleanEmail(route?.params?.email);

        if (emailFromParams) {
          if (mounted) setUserEmail(emailFromParams);

          const old = await AsyncStorage.getItem("faithly_user");
          const parsed = old ? JSON.parse(old) : {};
          const merged = { ...parsed, email: emailFromParams };
          await AsyncStorage.setItem("faithly_user", JSON.stringify(merged));
          if (parsed?.role && mounted) setUserRole(parsed.role);
          if (parsed?.position && mounted) setUserPosition(parsed.position);
          return;
        }

        const cached = await AsyncStorage.getItem("faithly_user");
        const cachedData = JSON.parse(cached || "{}");
        const cachedEmail = cleanEmail(cachedData?.email);
        if (mounted) {
          setUserEmail(cachedEmail);
          if (cachedData?.role) setUserRole(cachedData.role);
          if (cachedData?.position) setUserPosition(cachedData.position);
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [route?.params?.email]);


  // always navigate with email
  const navWithEmail = useCallback(
    (screen) => navigation.replace(screen, { email: userEmail }),
    [navigation, userEmail],
  );

  // Start indicator at Home (index 0). Settings is NOT in bottom tabs.
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-260)).current;

  const tabAnimations = useRef(
    ALL_TAB_ITEMS.map(() => ({
      scale: new Animated.Value(1),
      bgOpacity: new Animated.Value(0),
    })),
  ).current;

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    Animated.timing(slideX, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [slideX]);

  const closeSidebar = useCallback(() => {
    Animated.timing(slideX, {
      toValue: -260,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSidebarOpen(false));
  }, [slideX]);

  useEffect(() => {
    const filteredTabs = userRole !== "officer"
      ? ALL_TAB_ITEMS.filter(t => t.key !== "Loans")
      : ALL_TAB_ITEMS;
    const tabWidth = SCREEN_WIDTH / filteredTabs.length;
    const index = filteredTabs.findIndex((t) => t.key === activeTab);
    const safeIndex = index === -1 ? 0 : index;

    Animated.spring(indicatorPosition, {
      toValue: safeIndex * tabWidth,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    filteredTabs.forEach((tab, vi) => {
      const ai = ALL_TAB_ITEMS.findIndex(t => t.key === tab.key);
      if (ai === -1) return;
      if (vi === safeIndex) {
        Animated.parallel([
          Animated.spring(tabAnimations[ai].scale, {
            toValue: 1.2, tension: 100, friction: 6, useNativeDriver: true,
          }),
          Animated.timing(tabAnimations[ai].bgOpacity, {
            toValue: 1, duration: 250, useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(tabAnimations[ai].scale, {
            toValue: 1, tension: 100, friction: 6, useNativeDriver: true,
          }),
          Animated.timing(tabAnimations[ai].bgOpacity, {
            toValue: 0, duration: 250, useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [activeTab, indicatorPosition, tabAnimations, userRole]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: "transparent" }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Home', { email: userEmail })} activeOpacity={0.6}>
          <Text style={{ color: colors.textDark, fontSize: fs(26), fontWeight: '700', paddingHorizontal: 4 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" /></View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications", { email: userEmail })} style={{ padding: 4 }} activeOpacity={0.6}><Image source={ICONS.bell} style={{ width: 22, height: 22, tintColor: colors.textDark }} resizeMode="contain" /></TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Manage your account preferences
          </Text>
        </View>

        {/* Appearance / Theme Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: colors.purpleLight || "rgba(175,82,222,0.12)" }]}>
              <Ionicons name="moon-outline" size={20} color={colors.purple || "#AF52DE"} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Appearance</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Customize application visual theme</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardBg, padding: 20 }]}>
            <View style={styles.channelBox}>
              <View style={styles.settingLeft}>
                <Text style={[styles.settingLabel, { color: colors.textDark }]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>Switch between light and dark themes</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleDarkMode}
                trackColor={{ false: "#D1D5DB", true: colors.purple || "#AF52DE" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Image source={ICONS.bell} style={styles.sectionIcon} resizeMode="contain" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <Text style={styles.sectionSubtitle}>Manage how you receive updates</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardBg, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 20 }}>
              <Text style={[styles.subSectionTitle, { color: colors.textDark }]}>Communication channels</Text>
              
              <View style={styles.channelBox}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.textDark }]}>Email notifications</Text>
                  <Text style={[styles.settingDescription, { color: colors.textMuted }]}>{userEmail || "email@example.com"}</Text>
                </View>
                <Switch value={emailNotifications} onValueChange={setEmailNotifications} trackColor={{ false: "#D1D5DB", true: C.blue }} thumbColor="#FFFFFF" />
              </View>

              <View style={styles.channelBox}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.textDark }]}>Push notifications</Text>
                  <Text style={[styles.settingDescription, { color: colors.textMuted }]}>Browser & mobile alerts</Text>
                </View>
                <Switch value={pushNotifications} onValueChange={setPushNotifications} trackColor={{ false: "#D1D5DB", true: C.blue }} thumbColor="#FFFFFF" />
              </View>

              <View style={styles.channelBox}>
                <View style={styles.settingLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.settingLabel, { color: colors.textDark, marginBottom: 0 }]}>SMS</Text>
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Coming soon</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingDescription, { color: colors.textMuted, marginTop: 4 }]}>Text message alerts</Text>
                </View>
                <Switch value={false} disabled trackColor={{ false: "#F0F2F5", true: C.blue }} thumbColor="#FFFFFF" />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.subSectionTitle, { color: colors.textDark, marginBottom: 2 }]}>Notification categories</Text>
                  <Text style={[styles.settingDescription, { color: colors.textMuted }]}>Choose which activity you want to be notified about.</Text>
                </View>
                <TouchableOpacity onPress={deselectAll} style={{ marginTop: 2 }}>
                  <Text style={{ color: C.blue, fontSize: 12, fontWeight: '600' }}>Deselect all</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.categoryGroupTitle}>FINANCIAL</Text>
              <View style={styles.pillContainer}>
                {["Loans", "Payments", "Savings"].map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.pill, selectedCategories[cat] && styles.pillSelected]} 
                    onPress={() => toggleCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pillDot, selectedCategories[cat] && styles.pillDotSelected]} />
                    <Text style={[styles.pillText, selectedCategories[cat] && styles.pillTextSelected]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.categoryGroupTitle}>COMMUNITY</Text>
              <View style={styles.pillContainer}>
                {["Announcements", "Attendance", "Donations"].map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.pill, selectedCategories[cat] && styles.pillSelected]} 
                    onPress={() => toggleCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pillDot, selectedCategories[cat] && styles.pillDotSelected]} />
                    <Text style={[styles.pillText, selectedCategories[cat] && styles.pillTextSelected]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: C.blueLight }]}>
              <Ionicons name="lock-closed-outline" size={24} color={C.blue} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Security & Password</Text>
              <Text style={styles.sectionSubtitle}>
                Manage your password and account security
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardBg, padding: 20 }]}>
            <Text style={[styles.subSectionTitle, { color: colors.textDark, marginBottom: 12, fontSize: 13 }]}>Update password</Text>
            
            {!isEditingPassword ? (
              <TouchableOpacity style={styles.changePasswordBtn} activeOpacity={0.7} onPress={() => setIsEditingPassword(true)}>
                <Ionicons name="lock-closed-outline" size={16} color={C.blue} style={{ marginRight: 6 }} />
                <Text style={styles.changePasswordBtnText}>Change password</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <Text style={styles.pwdLabel}>CURRENT PASSWORD</Text>
                <View style={styles.pwdInputBox}>
                  <TextInput
                    style={styles.pwdInput}
                    secureTextEntry={!showCurrentPwd}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPwd(!showCurrentPwd)} style={styles.pwdEyeBtn}>
                    <Ionicons name={showCurrentPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.pwdForgotRow}>
                  <Ionicons name="mail-outline" size={12} color={C.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.pwdForgotText}>Forgot your current password? </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!userEmail) {
                        showAlert("Error", "No account email found. Please log out and back in.");
                        return;
                      }
                      try {
                        await requestPasswordReset(userEmail);
                        setIsEditingPassword(false);
                        navigation.navigate("ForgotPassword", { email: userEmail });
                      } catch (e) {
                        showAlert("Error", e?.message || "Could not send reset email.");
                      }
                    }}
                  >
                    <Text style={styles.pwdResetLink}>Reset via email</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.pwdLabel}>NEW PASSWORD</Text>
                <View style={styles.pwdInputBox}>
                  <TextInput
                    style={styles.pwdInput}
                    secureTextEntry={!showNewPwd}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPwd(!showNewPwd)} style={styles.pwdEyeBtn}>
                    <Ionicons name={showNewPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.pwdLabel}>CONFIRM NEW PASSWORD</Text>
                <View style={styles.pwdInputBox}>
                  <TextInput
                    style={styles.pwdInput}
                    secureTextEntry={!showConfirmPwd}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPwd(!showConfirmPwd)} style={styles.pwdEyeBtn}>
                    <Ionicons name={showConfirmPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.pwdActionsRow}>
                  <TouchableOpacity 
                    style={styles.pwdCancelBtn} 
                    activeOpacity={0.7} 
                    onPress={() => {
                      setIsEditingPassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    <Text style={styles.pwdCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.pwdUpdateBtn, isPasswordSaving && { opacity: 0.6 }]} 
                    activeOpacity={0.7}
                    disabled={isPasswordSaving}
                    onPress={async () => {
                      if (!currentPassword || !newPassword || !confirmPassword) {
                        showAlert("Error", "Please fill in all fields.");
                        return;
                      }
                      if (newPassword.length < 8) {
                        showAlert("Error", "New password must be at least 8 characters.");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        showAlert("Error", "New passwords do not match.");
                        return;
                      }
                      if (!userEmail) {
                        showAlert("Error", "No account email found. Please log out and back in.");
                        return;
                      }
                      setIsPasswordSaving(true);
                      try {
                        await changePassword(currentPassword, newPassword);
                        showAlert("Success", "Password updated successfully!");
                        setIsEditingPassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      } catch (e) {
                        showAlert("Error", e?.message || "Failed to update password. Please check your current password.");
                      } finally {
                        setIsPasswordSaving(false);
                      }
                    }}
                  >
                    <Text style={styles.pwdUpdateBtnText}>
                      {isPasswordSaving ? "Updating..." : "Update password"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Storage & Data Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: colors.blueLight || "rgba(13,31,69,0.08)" }]}>
              <Ionicons name="server-outline" size={20} color={colors.blue || "#0D1F45"} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Data & Storage</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Manage cached content and data synchronization</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardBg, padding: 20 }]}>
            <View style={[styles.channelBox, { marginBottom: 16 }]}>
              <View style={styles.settingLeft}>
                <Text style={[styles.settingLabel, { color: colors.textDark }]}>Cached Offline Storage</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>{cacheSize} used for offline devotions & prayers</Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: isClearingCache ? 0.6 : 1,
                }}
                onPress={handleClearCache}
                disabled={isClearingCache}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: fs(12), fontWeight: "700", color: colors.blue }}>
                  {isClearingCache ? "Clearing..." : "Clear Cache"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={[styles.channelBox, { marginTop: 16 }]}>
              <View style={styles.settingLeft}>
                <Text style={[styles.settingLabel, { color: colors.textDark }]}>Sync over Wi-Fi Only</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>Reduce cellular data usage for background sync</Text>
              </View>
              <Switch
                value={wifiOnlySync}
                onValueChange={setWifiOnlySync}
                trackColor={{ false: "#D1D5DB", true: colors.blue || "#0D1F45" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* About & System Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: colors.greenLight || "rgba(52,199,89,0.1)" }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.green || "#34C759"} />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>About & System Status</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>App diagnostics and backend health</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardBg, padding: 20 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.textDark }]}>System Health</Text>
                <Text style={[styles.settingDescription, { color: colors.textMuted }]}>Real-time connection status</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isOnline ? "rgba(52,199,89,0.12)" : "rgba(231,76,60,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? "#34C759" : "#E74C3C" }} />
                <Text style={{ fontSize: fs(12), fontWeight: "700", color: isOnline ? "#34C759" : "#E74C3C" }}>{isOnline ? "Online \u2022 API Active" : "Offline \u2022 No Connection"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 14 }}>
              <Text style={[styles.settingLabel, { color: colors.textDark, marginBottom: 0 }]}>Application Version</Text>
              <Text style={{ fontSize: fs(13), fontWeight: "600", color: colors.textMuted }}>v{appVersion}</Text>
            </View>

            <View style={styles.divider} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setDocModal({
                  title: "Terms of Service",
                  content: "IsangDiwa Mobile Application\n\n1. ACCEPTANCE OF TERMS\nBy downloading, installing, or using the IsangDiwa app, you agree to these Terms of Service.\n\n2. ACCOUNT REGISTRATION\nYou must provide accurate, complete information during registration. You are responsible for safeguarding your password and for all activities under your account.\n\n3. USER CONDUCT\nYou agree not to misuse the app, attempt unauthorized access, or interfere with other users' experience.\n\n4. FINANCIAL TRANSACTIONS\nAll loan applications, donations, and savings deposits are subject to approval by authorized church administrators. Transaction records are maintained for accountability and transparency.\n\n5. INTELLECTUAL PROPERTY\nAll content, design, and code are the property of PUAC IsangDiwa. You may not copy, modify, or distribute any part of the app.\n\n6. LIMITATION OF LIABILITY\nThe app is provided 'as is'. We are not liable for any indirect or consequential damages arising from your use of the app.\n\n7. MODIFICATIONS\nWe reserve the right to modify these terms at any time. Continued use constitutes acceptance of updated terms.\n\n8. GOVERNING LAW\nThese terms are governed by the laws of the Republic of the Philippines.\n\n\u00a9 2026 PUAC IsangDiwa. All rights reserved."
                })}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: fs(13), fontWeight: "600", color: colors.blue }}>Terms</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDocModal({
                  title: "Privacy Policy",
                  content: "IsangDiwa Privacy Policy\n\nEffective Date: January 2026\n\n1. DATA WE COLLECT\n\u2022 Personal info: name, email, phone, date of birth, gender, and community/branch\n\u2022 Financial data: donation records, loan applications, savings goals, and payment proofs\n\u2022 Device data: push notification tokens and device identifiers\n\u2022 Usage data: attendance records, app interaction patterns\n\n2. HOW WE USE YOUR DATA\n\u2022 To provide and maintain the IsangDiwa services\n\u2022 To process financial transactions and maintain records\n\u2022 To send notifications about your account and church activities\n\u2022 To verify your identity and church membership\n\n3. DATA STORAGE & SECURITY\n\u2022 Authentication tokens are stored using device-native encryption (iOS Keychain / Android Keystore)\n\u2022 Passwords are hashed using bcrypt before storage\n\u2022 All API communications use HTTPS encryption\n\u2022 Server data is hosted on secure, access-controlled infrastructure\n\n4. DATA SHARING\nWe do not sell or rent your personal data. Data is shared only with:\n\u2022 Authorized church administrators for membership verification\n\u2022 Payment processors for financial transactions\n\n5. YOUR RIGHTS (RA 10173 - Data Privacy Act of 2012)\n\u2022 Right to access your personal data\n\u2022 Right to correct inaccurate data\n\u2022 Right to request deletion of your account and data\n\u2022 Right to object to processing of your data\n\n6. DATA RETENTION\nYour data is retained for the duration of your membership. Upon account deletion, personal data is removed within 30 days.\n\n7. CONTACT\nFor privacy concerns, contact: privacy@isangdiwa.org\n\n\u00a9 2026 PUAC IsangDiwa"
                })}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: fs(13), fontWeight: "600", color: colors.blue }}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDocModal({
                  title: "Church Support Desk",
                  content: "Need help?\n\n\ud83d\udce7 Email\nsupport@isangdiwa.org\n\n\ud83d\udcac In-App Chat\nUse the chatbot button (bottom-right corner) for instant AI assistance.\n\n\ud83d\udcf1 Phone\nContact your local community leader for direct support.\n\nSupport Hours\nMonday - Saturday\n8:00 AM - 5:00 PM (PHT)\n\nFor urgent matters outside support hours, please email us and we will respond within 24 hours."
                })}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: fs(13), fontWeight: "600", color: colors.blue }}>Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.85}
            onPress={async () => {
              try {
                await AsyncStorage.setItem("faithly_settings", JSON.stringify({
                  emailNotifications,
                  pushNotifications,
                  selectedCategories,
                  wifiOnlySync,
                  isDark,
                }));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                showAlert("Settings Saved", "Your preferences have been saved successfully.");
              } catch {
                showAlert("Error", "Failed to save settings. Please try again.");
              }
            }}
          >
            <Text style={styles.saveBtnText}>Save All Settings</Text>
          </TouchableOpacity>

          {/* Reset Test Data — only visible in development/Expo Go builds, hidden in production */}
          {__DEV__ && <TouchableOpacity 
            style={[styles.resetBtn, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }]} 
            activeOpacity={0.85}
            onPress={() => {
              showAlert(
                "Reset Testing Data",
                "This will permanently delete all mock data (Loans, Savings, Donations) for your local testing environment. Are you sure?",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Reset All", 
                    style: "destructive", 
                    onPress: async () => {
                      if (!userEmail) return;
                      try {
                        await AsyncStorage.multiRemove([
                          `faithly_loans_${userEmail}`,
                          `faithly_savings_${userEmail}`,
                          `faithly_savings_goals_${userEmail}`,
                          `faithly_donations_${userEmail}`
                        ]);
                        showAlert("Success", "All testing data has been wiped. Please refresh the app to see the changes.");
                      } catch(e) {
                         showAlert("Error", "Could not clear data.");
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={[styles.resetBtnText, { color: C.red }]}>Reset Test Data</Text>
          </TouchableOpacity>}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Legal Document Modal — scrollable full-screen overlay */}
      <Modal
        visible={!!docModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDocModal(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }}>
          <View style={{
            flex: 1,
            marginTop: Platform.OS === 'ios' ? 60 : 40,
            marginHorizontal: 0,
            backgroundColor: colors.cardBg || '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 20,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder || '#E8ECF0',
            }}>
              <Text style={{ fontSize: fs(18), fontWeight: '800', color: colors.textDark, flex: 1 }}>
                {docModal?.title}
              </Text>
              <TouchableOpacity
                onPress={() => setDocModal(null)}
                activeOpacity={0.6}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.bg || '#F0F2F5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12,
                }}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={{
                fontSize: fs(14),
                lineHeight: fs(22),
                color: colors.textMuted,
                letterSpacing: 0.1,
              }}>
                {docModal?.content}
              </Text>
            </ScrollView>

            {/* Close Button */}
            <View style={{ paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder || '#E8ECF0' }}>
              <TouchableOpacity
                style={{ backgroundColor: colors.blue || '#0D1F45', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                activeOpacity={0.85}
                onPress={() => setDocModal(null)}
              >
                <Text style={{ color: '#FFFFFF', fontSize: fs(15), fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating draggable chat button */}
      <DraggableChatButton onPress={() => setChatbotOpen(true)} />

      {/* Chatbot Modal */}
      <ChatbotModal
        visible={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />

      {/* Sidebar overlay */}
      {sidebarOpen ? (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSidebar}
        />
      ) : null}

      {/* Sidebar drawer */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideX }] }]}>
        <View style={styles.sidebarHeader}>
          <Image source={LOGO} style={styles.sidebarLogo} resizeMode="contain" />
          <Text style={styles.sidebarTitle}>IsangDiwa</Text>
        </View>

        <View style={styles.sidebarNav}>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => {
                  setActiveTab(item.key);
                  closeSidebar();
                  navWithEmail(item.key);
                }}
                activeOpacity={0.6}
              >
                <Image
                  source={item.icon}
                  style={[
                    styles.sidebarIcon,
                    { tintColor: isActive ? C.blue : C.textMuted },
                  ]}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.sidebarItemText,
                    isActive && styles.sidebarItemTextActive,
                  ]}
                >
                  {item.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sidebarFooter}>
          <View style={styles.sidebarUserRow}>
            <View style={styles.sidebarAvatar}>
              <Image
                source={ICONS.person}
                style={styles.sidebarAvatarIcon}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sidebarUserName}>
                {userRole === "officer" && userPosition ? userPosition : "Member"}
              </Text>
              <Text style={styles.sidebarUserEmail}
                numberOfLines={1}
                ellipsizeMode="tail">
                {userEmail || "No email loaded"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutRow}
            activeOpacity={0.6}
            onPress={async () => {
              closeSidebar();
              try {
                await AsyncStorage.removeItem("faithly_user");
                await AsyncStorage.removeItem("@faithly_session");
              } catch {}
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Splash" }],
                });
              }, 300);
            }}
          >
            <Image source={ICONS.signout} style={styles.signOutIcon} resizeMode="contain" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg  },
  circleTopRight: { position: 'absolute', top: -120, right: -120, width: 350, height: 350, borderRadius: 175, backgroundColor: '#0D1F45', opacity: 0.04, zIndex: 0 },
  circleBottomLeft: { position: 'absolute', bottom: -150, left: -150, width: 450, height: 450, borderRadius: 225, backgroundColor: '#00C3FF', opacity: 0.04, zIndex: 0 },

  // Top Bar
  topBar: {
    backgroundColor: C.navBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 56 : 42,
    paddingBottom: 14,
  },
  menuBtn: { padding: 4, justifyContent: "center", gap: 5 },
  menuLine: {
    width: 22,
    height: 2.2,
    backgroundColor: C.textDark,
    borderRadius: 1.2,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "500",
    color: C.textDark,
  },
  topSpacer: { width: 28 },

  scroll: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 20,
  },

  // Section
  section: {
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  sectionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIcon: {
    width: 24,
    height: 24,
    tintColor: C.blue,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: C.textMuted,
  },

  // Card
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  // Setting Row
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  settingLeft: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textDark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: C.textMuted,
  },

  // UI Styles for matching web layout
  subSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 16 },
  channelBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 10, padding: 14, marginBottom: 12 },
  comingSoonBadge: { backgroundColor: '#FFF5E6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  comingSoonText: { fontSize: 10, color: '#F5A623', fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.cardBorder, width: '100%' },
  categoryGroupTitle: { fontSize: 10, color: C.textMuted, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'transparent' },
  pillSelected: { borderColor: 'rgba(46,107,240,0.3)', backgroundColor: 'rgba(46,107,240,0.05)' },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cardBorder, marginRight: 6 },
  pillDotSelected: { backgroundColor: C.blue },
  pillText: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  pillTextSelected: { color: C.blue },
  changePasswordBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: C.cardBorder, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  changePasswordBtnText: { color: C.blue, fontSize: 13, fontWeight: '600' },

  passwordForm: { marginTop: 4 },
  pwdLabel: { fontSize: 11, color: C.textMuted, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  pwdInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 8, paddingHorizontal: 14, height: 46 },
  pwdInput: { flex: 1, fontSize: 14, color: C.textDark, height: '100%' },
  pwdEyeBtn: { padding: 4 },
  pwdForgotRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 8 },
  pwdForgotText: { fontSize: 11, color: C.textMuted },
  pwdResetLink: { fontSize: 11, color: C.blue, fontWeight: '600', textDecorationLine: 'underline' },
  pwdActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 },
  pwdCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 6, backgroundColor: 'transparent' },
  pwdCancelBtnText: { color: C.textDark, fontSize: 13, fontWeight: '600' },
  pwdUpdateBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: C.blue, borderRadius: 6 },
  pwdUpdateBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Action Buttons
  actionsContainer: {
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  resetBtn: {
    paddingHorizontal: 24,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.cardBg,
  },
  resetBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: C.textMuted,
  },

  bottomPad: { height: 24 },

  // Chat Button
  chatBtn: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 2,
  },
  chatIcon: { width: 24, height: 24, tintColor: "#FFFFFF" },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.tabBg,
    borderTopWidth: 1,
    borderTopColor: "rgba(100,140,200,0.2)",
    paddingVertical: 15,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH / 5,
    height: 3,
    backgroundColor: C.tabActive,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    position: "relative",
  },
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

  // Sidebar
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.overlay,
    zIndex: 10,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 260,
    backgroundColor: C.sidebarBg,
    zIndex: 11,
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
  sidebarRole: { fontSize: 12, color: "#FFF", marginTop: 1 },

  sidebarNav: { flex: 1, paddingHorizontal: 12 },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  sidebarItemActive: { backgroundColor: "rgba(46,107,240,0.1)" },
  sidebarIcon: { width: 20, height: 20 },
  sidebarItemText: { fontSize: 15, color: C.textMuted, fontWeight: "600" },
  sidebarItemTextActive: { color: C.blue },

  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 18,
  },
  sidebarUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sidebarAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(31, 102, 255, 0.93)",
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarAvatarIcon: { width: 18, height: 18, tintColor: "#FFFFFF" },
  sidebarUserName: { fontSize: 14, fontWeight: "600", color: "#FFF" },
  sidebarUserEmail: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  signOutIcon: { width: 30, height: 40, tintColor: C.red },
  signOutText: { fontSize: 14, color: C.red, fontWeight: "500" },
});




