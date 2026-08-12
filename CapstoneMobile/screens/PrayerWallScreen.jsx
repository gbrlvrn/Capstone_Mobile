import { Ionicons } from "@expo/vector-icons";
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
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
  KeyboardAvoidingView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import FloatingNavBar from "../components/FloatingNavBar";
import { useTheme } from "../components/ThemeContext";
import { getPrayerRequests, createPrayerRequest, prayForRequest } from "../services/AuthService";
import * as Haptics from "expo-haptics";
import OfflineBanner from "../components/OfflineBanner";
import { SkeletonPrayerCard } from "../components/SkeletonLoader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));
const SIDEBAR_WIDTH = s(260);

const LOGO = require("../assets/puac_logo.png");

const ICONS = {
  home: require("../assets/icons/home-v3.png"),
  loans: require("../assets/icons/loans.png"),
  donations: require("../assets/icons/donations.png"),
  attendance: require("../assets/icons/attendance.png"),
  branches: require("../assets/icons/branches.png"),
  profile: require("../assets/icons/profile.png"),
  settings: require("../assets/icons/settings.png"),
  person: require("../assets/icons/person.png"),
  signout: require("../assets/icons/signout.png"),
  heart: require("../assets/icons/heart.png"),
  send: require("../assets/icons/send.png"),
  close: require("../assets/icons/close.png"),
  wallet: require("../assets/icons/wallet.png"),
  document: require("../assets/icons/document.png"),
  notification: require("../assets/icons/bell.png"),
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
  overlay: "rgba(0,0,0,0.45)",
};

const ALL_TAB_ITEMS = [
  { key: "Home", icon: ICONS.home },
  { key: "Loans", icon: ICONS.loans },
  { key: "Donations", icon: ICONS.donations },
  { key: "Attendance", icon: ICONS.attendance },
  { key: "Branches", icon: ICONS.branches },
];

const SIDEBAR_ITEMS = [
  { key: "Announcements", icon: ICONS.notification },
  { key: "Savings", icon: ICONS.wallet },
  { key: "Profile", icon: ICONS.profile },
  { key: "Settings", icon: ICONS.settings },
];

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PrayerWallScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [activeTab, setActiveTab] = useState("Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prayedSet, setPrayedSet] = useState(new Set());

  // New request modal
  const [modalOpen, setModalOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const tabAnimations = useRef(ALL_TAB_ITEMS.map(() => ({ scale: new Animated.Value(1), bgOpacity: new Animated.Value(0) }))).current;
  const modalSlide = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Card entrance animations
  const cardAnims = useRef([]).current;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const emailFromParams = cleanEmail(route?.params?.email);
        if (emailFromParams) {
          if (mounted) setUserEmail(emailFromParams);
          const old = await AsyncStorage.getItem("faithly_user");
          const parsed = old ? JSON.parse(old) : {};
          await AsyncStorage.setItem("faithly_user", JSON.stringify({ ...parsed, email: emailFromParams }));
          if (parsed?.role && mounted) setUserRole(parsed.role);
          if (parsed?.position && mounted) setUserPosition(parsed.position);
          return;
        }
        const cached = await AsyncStorage.getItem("faithly_user");
        const cachedData = JSON.parse(cached || "{}");
        if (mounted) {
          setUserEmail(cleanEmail(cachedData?.email));
          if (cachedData?.role) setUserRole(cachedData.role);
          if (cachedData?.position) setUserPosition(cachedData.position);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [route?.params?.email]);

  // Load prayers
  const loadPrayers = useCallback(async () => {
    try {
      const data = await getPrayerRequests(50, 0);
      if (data?.requests) {
        setPrayers(data.requests);
        // Which ones did user already pray for
        const prayed = new Set();
        data.requests.forEach((p) => {
          if (p.prayedBy?.includes(userEmail)) prayed.add(p._id);
        });
        setPrayedSet(prayed);
      }
    } catch (err) {
      console.log("Prayer load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => { if (userEmail) loadPrayers(); }, [loadPrayers, userEmail]);

  const navWithEmail = useCallback(
    (screen) => navigation.replace(screen, { email: userEmail }),
    [navigation, userEmail]
  );

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    Animated.timing(slideX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideX]);

  const closeSidebar = useCallback(() => {
    Animated.timing(slideX, { toValue: -SIDEBAR_WIDTH, duration: 250, useNativeDriver: true }).start(() => setSidebarOpen(false));
  }, [slideX]);

  useEffect(() => {
    const filteredTabs = userRole !== "officer" ? ALL_TAB_ITEMS.filter(t => t.key !== "Loans") : ALL_TAB_ITEMS;
    const tabWidth = SCREEN_WIDTH / filteredTabs.length;
    const index = filteredTabs.findIndex((t) => t.key === activeTab);
    const safeIndex = index === -1 ? 0 : index;
    Animated.spring(indicatorPosition, { toValue: safeIndex * tabWidth, tension: 80, friction: 10, useNativeDriver: true }).start();
    filteredTabs.forEach((tab, vi) => {
      const ai = ALL_TAB_ITEMS.findIndex(t => t.key === tab.key);
      if (ai === -1) return;
      const isActive = vi === safeIndex;
      Animated.parallel([
        Animated.spring(tabAnimations[ai].scale, { toValue: isActive ? 1.2 : 1, tension: 100, friction: 6, useNativeDriver: true }),
        Animated.timing(tabAnimations[ai].bgOpacity, { toValue: isActive ? 1 : 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }, [activeTab, indicatorPosition, tabAnimations, userRole]);

  const openModal = () => {
    setModalOpen(true);
    Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const closeModal = () => {
    Animated.timing(modalSlide, { toValue: SCREEN_WIDTH, duration: 250, useNativeDriver: true }).start(() => {
      setModalOpen(false);
      setRequestText("");
      setIsAnonymous(false);
    });
  };

  const handleSubmit = async () => {
    if (!requestText.trim()) {
      showAlert("Error", "Please enter your prayer request before submitting.");
      return;
    }
    if (requestText.length > 300) {
      showAlert("Error", "Prayer requests cannot exceed 300 characters.");
      return;
    }
    if (!userEmail) {
      showAlert("Error", "Account email not found. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      await createPrayerRequest({
        email: userEmail,
        displayName: isAnonymous ? "Anonymous" : (userPosition || "A Member"),
        isAnonymous,
        request: requestText.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      await loadPrayers();
      showAlert("Submitted", "Your prayer request has been posted.");
    } catch (err) {
      console.log("Submit prayer error:", err);
      showAlert("Error", "Failed to submit prayer request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePray = async (prayerId) => {
    if (!userEmail || prayedSet.has(prayerId)) return;
    try {
      await prayForRequest(prayerId, userEmail);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPrayedSet((prev) => new Set([...prev, prayerId]));
      setPrayers((prev) => prev.map((p) => p._id === prayerId ? { ...p, prayerCount: (p.prayerCount || 0) + 1 } : p));
    } catch {
      // Optimistic update
      setPrayedSet((prev) => new Set([...prev, prayerId]));
      setPrayers((prev) => prev.map((p) => p._id === prayerId ? { ...p, prayerCount: (p.prayerCount || 0) + 1 } : p));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrayers();
    setRefreshing(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      <View style={[styles.topBar, { backgroundColor: "transparent" }]}>
                <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Home', { email: userEmail })} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: s(36), height: 36, borderRadius: 18 }} resizeMode="cover" /></View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications", { email: userEmail })} style={{ padding: 4 }} activeOpacity={0.6}><Image source={ICONS.notification} style={{ width: s(22), height: s(22), tintColor: colors.textDark }} resizeMode="contain" /></TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D1F45" colors={["#0D1F45"]} />}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Prayer Wall</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Share your prayer requests and lift each other up
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{width: s(40), height: s(40), borderRadius: s(20), backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8}}>
               <Image source={ICONS.document} style={{width: s(20), height: s(20), tintColor: C.blue}} resizeMode="contain" />
            </View>
            <Text style={[styles.statValue, { color: colors.textDark }]}>{prayers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Requests</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{width: s(40), height: s(40), borderRadius: s(20), backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8}}>
               <Image source={ICONS.heart} style={{width: s(20), height: s(20), tintColor: C.purple}} resizeMode="contain" />
            </View>
            <Text style={[styles.statValue, { color: colors.textDark }]}>{prayers.reduce((s, p) => s + (p.prayerCount || 0), 0)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Prayers Lifted</Text>
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity style={styles.submitBtn} onPress={openModal} activeOpacity={0.85}>
          <Image source={ICONS.send} style={{width: s(18), height: s(18), tintColor: '#FFF'}} resizeMode="contain" />
          <Text style={styles.submitBtnText}>Share a Prayer Request</Text>
        </TouchableOpacity>

        {/* Prayer list */}
        {loading ? (
          <View>
            <SkeletonPrayerCard />
            <SkeletonPrayerCard />
            <SkeletonPrayerCard />
          </View>
        ) : prayers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Image source={ICONS.document} style={{width: s(48), height: s(48), tintColor: colors.textMuted, marginBottom: s(12), opacity: 0.5}} resizeMode="contain"/>
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No Prayer Requests Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Be the first to share a prayer request
            </Text>
          </View>
        ) : (
          <View style={styles.prayerList}>
            {prayers.map((prayer, idx) => {
              const hasPrayed = prayedSet.has(prayer._id);
              return (
                <View key={prayer._id || idx} style={[styles.prayerCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.prayerHeader}>
                    <View style={styles.prayerUser}>
                      <View style={[styles.prayerAvatar, { backgroundColor: C.blueLight }]}>
                        <Image source={ICONS.person} style={{width: 16, height: 16, tintColor: C.blue}} resizeMode="contain"/>
                      </View>
                      <View>
                        <Text style={[styles.prayerName, { color: colors.textDark }]}>
                          {prayer.isAnonymous ? "Anonymous" : prayer.displayName}
                        </Text>
                        <Text style={[styles.prayerTime, { color: colors.textMuted }]}>{timeAgo(prayer.createdAt)}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.prayerText, { color: colors.textDark }]}>{prayer.request}</Text>

                  {/* Pray button */}
                  <View style={styles.prayerActions}>
                    <TouchableOpacity
                      style={[styles.prayBtn, hasPrayed && styles.prayBtnActive]}
                      onPress={() => handlePray(prayer._id)}
                      activeOpacity={0.7}
                      disabled={hasPrayed}
                    >
                      <Image source={ICONS.heart} style={{width: 14, height: 14, tintColor: hasPrayed ? C.green : colors.textMuted}} resizeMode="contain"/>
                      <Text style={[styles.prayBtnText, hasPrayed && styles.prayBtnTextActive]}>
                        {hasPrayed ? "Prayed" : "Pray"}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.prayCount, { color: colors.textMuted }]}>
                      {prayer.prayerCount || 0} {(prayer.prayerCount || 0) === 1 ? "prayer" : "prayers"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <DraggableChatButton onPress={() => setChatbotOpen(true)} />
      <ChatbotModal visible={chatbotOpen} onClose={() => setChatbotOpen(false)} />

      {/* New Prayer Request Modal */}
      {modalOpen && (
        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateX: modalSlide }] }]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <View style={[styles.modalTopBar, { backgroundColor: "transparent" }]}>
              <TouchableOpacity onPress={closeModal} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: fs(14), fontWeight: '700' }}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Prayer Request</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView style={[styles.modalBody, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.modalLabel, { color: colors.textDark }]}>Your Prayer Request</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.textDark, borderColor: colors.cardBorder }]}
                    placeholder="Share what's on your heart..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={6}
                    maxLength={300}
                    textAlignVertical="top"
                    value={requestText}
                    onChangeText={setRequestText}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6, marginBottom: 12 }}>
                    <Text style={{ fontSize: fs(12), color: requestText.length >= 300 ? '#E74C3C' : colors.textMuted, fontWeight: '600' }}>
                      {requestText.length}/300 characters
                    </Text>
                  </View>

                  <View style={styles.anonymousRow}>
                    <View>
                      <Text style={[styles.anonymousLabel, { color: colors.textDark }]}>Post Anonymously</Text>
                      <Text style={[styles.anonymousSub, { color: colors.textMuted }]}>Your name will be hidden</Text>
                    </View>
                    <Switch
                      value={isAnonymous}
                      onValueChange={setIsAnonymous}
                      trackColor={{ false: "#D1D5DB", true: C.purple }}
                      thumbColor="#FFF"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: s(10), marginTop: s(16), marginBottom: s(24) }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: colors.cardBg,
                      borderWidth: 1.5,
                      borderColor: colors.cardBorder,
                      borderRadius: s(12),
                      paddingVertical: s(14),
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                    onPress={closeModal}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={18} color={colors.textDark} />
                    <Text style={{ fontSize: fs(15), fontWeight: '700', color: colors.textDark }}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalSubmitBtn,
                      { flex: 1.6, marginTop: 0 },
                      (!requestText.trim() || submitting) && { opacity: 0.5 }
                    ]}
                    onPress={handleSubmit}
                    activeOpacity={0.85}
                    disabled={!requestText.trim() || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Submit Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Floating Bottom Tab Bar */}
      <FloatingNavBar
        activeTab="Prayer Wall"
        navigation={navigation}
        userEmail={userEmail}
        userRole={userRole}
      />

      {/* Sidebar overlay */}
      {sidebarOpen && <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSidebar} />}

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideX }] }]}>
        <View style={styles.sidebarHeader}>
          <Image source={LOGO} style={styles.sidebarLogo} resizeMode="contain" />
          <Image source={LOGO} style={{ width: s(40), height: s(40), tintColor: "#fff" }} resizeMode="contain" />
        </View>
        <View style={styles.sidebarNav}>
          {SIDEBAR_ITEMS.map((item) => (
            <TouchableOpacity key={item.key} style={styles.sidebarItem} onPress={() => { closeSidebar(); navWithEmail(item.key); }} activeOpacity={0.6}>
              <Image source={item.icon} style={[styles.sidebarIcon, { tintColor: "rgba(255,255,255,0.5)" }]} resizeMode="contain" />
              <Text style={styles.sidebarItemText}>{item.key}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.sidebarFooter}>
          <View style={styles.sidebarUserRow}>
            <View style={styles.sidebarAvatar}>
              <Image source={ICONS.person} style={styles.sidebarAvatarIcon} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sidebarUserName}>{userRole === "officer" && userPosition ? userPosition : "Member"}</Text>
              <Text style={styles.sidebarUserEmail} numberOfLines={1}>{userEmail || "No email loaded"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.signOutRow} activeOpacity={0.6} onPress={async () => {
            closeSidebar();
            try { await AsyncStorage.removeItem("faithly_user"); await AsyncStorage.removeItem("@faithly_session"); } catch {}
            setTimeout(() => navigation.reset({ index: 0, routes: [{ name: "Splash" }] }), 300);
          }}>
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
  topBar: { backgroundColor: C.navBg, flexDirection: "row", alignItems: "center", paddingHorizontal: s(18), paddingTop: Platform.OS === "ios" ? s(56) : s(42), paddingBottom: 14 },
  menuBtn: { padding: 4, justifyContent: "center", gap: 5 },
  menuLine: { width: s(22), height: 2.2, backgroundColor: C.textDark, borderRadius: 1.2 },
  topTitle: { flex: 1, textAlign: "center", fontSize: fs(20), fontWeight: "600", color: C.textDark },
  topSpacer: { width: 28 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: s(18), paddingTop: s(20), paddingBottom: 16 },
  headerTitle: { fontSize: fs(26), fontWeight: "700", marginBottom: 4 },
  headerSubtitle: { fontSize: fs(14), lineHeight: 20 },

  // Stats
  statsRow: { flexDirection: "row", paddingHorizontal: s(18), gap: s(12), marginBottom: 20 },
  statCard: { flex: 1, borderRadius: s(16), padding: s(16), borderWidth: 1, alignItems: "center" },
  statValue: { fontSize: fs(24), fontWeight: "700", marginBottom: 2 },
  statLabel: { fontSize: fs(12), fontWeight: "600" },

  // Submit button
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: s(10), marginHorizontal: s(18), backgroundColor: C.blue, paddingVertical: s(16), borderRadius: s(14), marginBottom: s(20), shadowColor: C.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  submitBtnEmoji: { fontSize: 18 },
  submitBtnText: { color: "#FFF", fontSize: fs(16), fontWeight: "700" },

  // Prayer list
  prayerList: { paddingHorizontal: s(18), gap: 14 },
  prayerCard: { borderRadius: s(16), padding: s(18), borderWidth: 1 },
  prayerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  prayerUser: { flexDirection: "row", alignItems: "center", gap: 10 },
  prayerAvatar: { width: s(36), height: s(36), borderRadius: s(18), alignItems: "center", justifyContent: "center" },
  prayerName: { fontSize: fs(14), fontWeight: "700" },
  prayerTime: { fontSize: fs(11), marginTop: 2 },
  prayerText: { fontSize: fs(15), lineHeight: fs(22), marginBottom: 14 },
  prayerActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  prayBtn: { flexDirection: "row", alignItems: "center", gap: s(6), paddingVertical: s(8), paddingHorizontal: s(16), borderRadius: s(10), backgroundColor: C.bg },
  prayBtnActive: { backgroundColor: C.greenLight },
  prayBtnText: { fontSize: fs(13), fontWeight: "600", color: C.textMuted },
  prayBtnTextActive: { color: C.green, fontWeight: "700" },
  prayCount: { fontSize: fs(13), fontWeight: "600" },

  // Loading / empty
  loadingText: { marginTop: s(12), fontSize: 14 },
  emptyCard: { marginHorizontal: s(18), borderRadius: s(18), padding: s(40), borderWidth: 1, alignItems: "center" },
  emptyTitle: { fontSize: fs(16), fontWeight: "700", marginBottom: 4 },
  emptySub: { fontSize: fs(14), textAlign: "center" },
  bottomPad: { height: 110 },

  // Modal
  modalContainer: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: "#FFF",
  },
  modalTopBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: s(18), paddingTop: Platform.OS === "ios" ? s(56) : s(42), paddingBottom: 14 },
  modalBackBtn: { padding: 4 },
  modalBackText: { fontSize: fs(24), color: "#FFF", fontWeight: "600" },
  modalTitle: { flex: 1, textAlign: "center", fontSize: fs(18), fontWeight: "600", color: "#FFF" },
  modalBody: { flex: 1 },
  modalContent: { padding: 18 },
  modalCard: { borderRadius: s(16), padding: s(20), borderWidth: 1, marginBottom: 20 },
  modalLabel: { fontSize: fs(16), fontWeight: "700", marginBottom: 14 },
  modalInput: { borderWidth: 1, borderRadius: s(12), padding: s(14), fontSize: fs(15), lineHeight: fs(22), minHeight: 140, marginBottom: 18 },
  anonymousRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  anonymousLabel: { fontSize: fs(15), fontWeight: "600", marginBottom: 3 },
  anonymousSub: { fontSize: 12 },
  modalSubmitBtn: { backgroundColor: C.blue, paddingVertical: s(16), borderRadius: s(14), alignItems: "center" },
  modalSubmitText: { color: "#FFF", fontSize: fs(16), fontWeight: "700" },

  // Tab bar
  tabBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", backgroundColor: C.tabBg, borderTopWidth: 1, borderTopColor: "rgba(100,140,200,0.2)", paddingVertical: s(15), paddingBottom: Platform.OS === "ios" ? 30 : 10 },
  tabIndicator: { position: "absolute", bottom: 0, width: SCREEN_WIDTH / 5, height: s(3), backgroundColor: C.tabActive, borderRadius: 2 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, position: "relative" },
  tabBgCircle: { position: "absolute", width: 75, height: 62, borderRadius: 15, backgroundColor: "rgba(46,107,240,0.15)", top: -14 },
  tabIcon: { width: s(26), height: 26 },
  tabLabel: { fontSize: 10 },

  // Sidebar
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.overlay, zIndex: 998, elevation: 998 },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: C.sidebarBg, zIndex: 1000, elevation: 1000, paddingTop: Platform.OS === "ios" ? s(60) : s(44), paddingHorizontal: s(18), justifyContent: "space-between" },
  sidebarHeader: { flexDirection: "row", alignItems: "center", gap: s(14), marginBottom: 30 },
  sidebarLogo: { width: s(40), height: s(40), borderRadius: 20 },
  sidebarTitle: { fontSize: fs(20), fontWeight: "700", color: "#FFF" },
  sidebarNav: { flex: 1, gap: 4 },
  sidebarItem: { flexDirection: "row", alignItems: "center", gap: s(14), paddingVertical: s(12), paddingHorizontal: s(12), borderRadius: 12 },
  sidebarIcon: { width: s(20), height: 20 },
  sidebarItemText: { fontSize: fs(15), color: C.textMuted, fontWeight: "600" },
  sidebarFooter: { paddingBottom: Platform.OS === "ios" ? s(30) : s(16), borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 16 },
  sidebarUserRow: { flexDirection: "row", alignItems: "center", gap: s(12), marginBottom: 16 },
  sidebarAvatar: { width: s(36), height: s(36), borderRadius: s(18), backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  sidebarAvatarIcon: { width: s(18), height: s(18), tintColor: "#FFF" },
  sidebarUserName: { fontSize: fs(14), fontWeight: "600", color: "#FFF" },
  sidebarUserEmail: { fontSize: fs(12), color: "rgba(255,255,255,0.5)" },
  signOutRow: { flexDirection: "row", alignItems: "center", gap: s(12), paddingVertical: 10 },
  signOutIcon: { width: s(18), height: s(18), tintColor: "#E74C3C" },
  signOutText: { fontSize: fs(14), fontWeight: "500", color: "#E74C3C" },
});
