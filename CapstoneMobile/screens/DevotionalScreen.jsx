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
  Modal,
  TextInput,
  RefreshControl,
  Share,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import { useTheme } from "../components/ThemeContext";
import { getDailyVerse, saveJournalEntry, getJournalEntry, getAllJournalEntries } from "../services/DevotionalService";
import OfflineBanner from "../components/OfflineBanner";
import { SkeletonDevotionalCard } from "../components/SkeletonLoader";

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
  document: require("../assets/icons/document.png"),
  wallet: require("../assets/icons/wallet.png"),
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
  gold: "#F5A623",
  goldLight: "rgba(245,166,35,0.1)",
  purple: "#AF52DE",
  purpleLight: "rgba(175,82,222,0.1)",
  green: "#34C759",
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

function getDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function DevotionalScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [activeTab, setActiveTab] = useState("Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Devotional state
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [journalText, setJournalText] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [pastEntries, setPastEntries] = useState([]);
  const [showPastEntries, setShowPastEntries] = useState(false);

  // Animations
  const verseAnim = useRef(new Animated.Value(0)).current;
  const journalAnim = useRef(new Animated.Value(0)).current;
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const tabAnimations = useRef(
    ALL_TAB_ITEMS.map(() => ({
      scale: new Animated.Value(1),
      bgOpacity: new Animated.Value(0),
    }))
  ).current;

  // Load user email
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

  // Load daily verse and journal
  useEffect(() => {
    (async () => {
      try {
        const v = await getDailyVerse();
        setVerse(v);
        const dateKey = getDateKey();
        const entry = await getJournalEntry(dateKey);
        if (entry) {
          setJournalText(entry);
          setJournalSaved(true);
        }
        const entries = await getAllJournalEntries();
        setPastEntries(entries);
      } catch (err) {
        console.log("Devotional load error:", err);
      } finally {
        setLoading(false);
        // Animate in
        Animated.stagger(150, [
          Animated.spring(verseAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.spring(journalAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();
      }
    })();
  }, []);

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

  const handleSaveJournal = async () => {
    if (!journalText.trim()) return;
    const dateKey = getDateKey();
    await saveJournalEntry(dateKey, journalText.trim());
    setJournalSaved(true);
    const entries = await getAllJournalEntries();
    setPastEntries(entries);
  };

  const handleShare = async () => {
    if (!verse) return;
    try {
      await Share.share({
        message: `"${verse.text}"\n\n— ${verse.reference} (${verse.translation})\n\nShared from PUAC`,
      });
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const v = await getDailyVerse();
      setVerse(v);
    } catch {}
    setRefreshing(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: "transparent" }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Home', { email: userEmail })} activeOpacity={0.6}>
          <Text style={{color: '#FFF', fontSize: fs(28), paddingHorizontal: 4}}>â†</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: s(36), height: 36, borderRadius: 18 }} resizeMode="cover" /></View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications", { email: userEmail })} style={{ padding: 4 }} activeOpacity={0.6}><Image source={ICONS.notification} style={{ width: s(22), height: s(22), tintColor: colors.textDark }} resizeMode="contain" /></TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D1F45" colors={["#0D1F45"]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Daily Devotional</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Reflect on God's word and journal your thoughts
          </Text>
        </View>

        {/* Verse Card */}
        {loading ? (
          <SkeletonDevotionalCard />
        ) : verse ? (
          <Animated.View
            style={[
              styles.verseCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              { opacity: verseAnim, transform: [{ translateY: verseAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
            ]}
          >
            <View style={styles.verseIconRow}>
              <View style={[styles.verseIconBox, { backgroundColor: C.goldLight }]}>
                <Image source={ICONS.document} style={{width: s(20), height: s(20), tintColor: C.gold}} resizeMode="contain"/>
              </View>
              <Text style={[styles.verseDate, { color: colors.textMuted }]}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </Text>
            </View>

            <Text style={[styles.verseText, { color: colors.textDark }]}>"{verse.text}"</Text>
            <Text style={[styles.verseReference, { color: C.blue }]}>— {verse.reference}</Text>
            <Text style={[styles.verseTranslation, { color: colors.textMuted }]}>{verse.translation}</Text>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
              <Text style={styles.shareBtnText}>Share Verse â†—</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Journal Section */}
        <Animated.View
          style={[
            styles.journalSection,
            { opacity: journalAnim, transform: [{ translateY: journalAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Reflect & Journal</Text>
          <View style={[styles.journalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <TextInput
              style={[styles.journalInput, { color: colors.textDark, borderColor: colors.cardBorder }]}
              placeholder="What did this verse speak to you today?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={journalText}
              onChangeText={(t) => {
                setJournalText(t);
                setJournalSaved(false);
              }}
            />
            <View style={styles.journalActions}>
              {journalSaved && <Text style={styles.savedLabel}>âœ“ Saved</Text>}
              <TouchableOpacity
                style={[styles.saveJournalBtn, journalSaved && { opacity: 0.5 }]}
                onPress={handleSaveJournal}
                activeOpacity={0.7}
                disabled={journalSaved}
              >
                <Text style={styles.saveJournalText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Past Entries */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.pastEntriesHeader}
            onPress={() => setShowPastEntries(!showPastEntries)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Past Reflections</Text>
            <Text style={{ color: C.blue, fontSize: fs(14), fontWeight: "600" }}>
              {showPastEntries ? "Hide" : `View (${pastEntries.length})`}
            </Text>
          </TouchableOpacity>

          {showPastEntries && (
            <View style={{ gap: 12 }}>
              {pastEntries.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <Image source={ICONS.document} style={{width: s(40), height: s(40), tintColor: colors.textMuted, marginBottom: s(12), opacity: 0.5}} resizeMode="contain"/>
                  <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No Reflections Yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                    Your journal entries will appear here
                  </Text>
                </View>
              ) : (
                pastEntries.map((entry, idx) => (
                  <View
                    key={idx}
                    style={[styles.entryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                  >
                    <Text style={[styles.entryDate, { color: colors.textMuted }]}>{entry.date}</Text>
                    <Text style={[styles.entryText, { color: colors.textDark }]} numberOfLines={3}>
                      {entry.text}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      <DraggableChatButton onPress={() => setChatbotOpen(true)} />
      <ChatbotModal visible={chatbotOpen} onClose={() => setChatbotOpen(false)} />

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.tabBg }]}>
        <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: indicatorPosition }] }]} />
        {(userRole !== "officer" ? ALL_TAB_ITEMS.filter(t => t.key !== "Loans") : ALL_TAB_ITEMS).map((tab) => {
          const isActive = activeTab === tab.key;
          const ai = ALL_TAB_ITEMS.findIndex(t => t.key === tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => { setActiveTab(tab.key); navWithEmail(tab.key); }}
              activeOpacity={0.7}
            >
              <Animated.View style={[styles.tabBgCircle, { opacity: tabAnimations[ai].bgOpacity }]} />
              <Animated.View style={{ transform: [{ scale: tabAnimations[ai].scale }] }}>
                <Image source={tab.icon} style={[styles.tabIcon, { tintColor: isActive ? C.tabActive : colors.tabInactive, opacity: isActive ? 1 : 0.6 }]} resizeMode="contain" />
              </Animated.View>
              <Text style={[styles.tabLabel, { color: isActive ? C.tabActive : colors.tabInactive, fontWeight: isActive ? "700" : "500", fontSize: isActive ? 11 : 10, opacity: isActive ? 1 : 0.7 }]}>{tab.key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
            <TouchableOpacity
              key={item.key}
              style={styles.sidebarItem}
              onPress={() => { closeSidebar(); navWithEmail(item.key); }}
              activeOpacity={0.6}
            >
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
          <TouchableOpacity
            style={styles.signOutRow}
            activeOpacity={0.6}
            onPress={async () => {
              closeSidebar();
              try {
                await AsyncStorage.removeItem("faithly_user");
                await AsyncStorage.removeItem("@faithly_session");
              } catch {}
              setTimeout(() => navigation.reset({ index: 0, routes: [{ name: "Splash" }] }), 300);
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
  topBar: { backgroundColor: C.navBg, flexDirection: "row", alignItems: "center", paddingHorizontal: s(18), paddingTop: Platform.OS === "ios" ? s(56) : s(42), paddingBottom: 14 },
  menuBtn: { padding: 4, justifyContent: "center", gap: 5 },
  menuLine: { width: s(22), height: 2.2, backgroundColor: C.textDark, borderRadius: 1.2 },
  topTitle: { flex: 1, textAlign: "center", fontSize: fs(20), fontWeight: "600", color: C.textDark },
  topSpacer: { width: 28 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: s(18), paddingTop: s(20), paddingBottom: 16 },
  headerTitle: { fontSize: fs(26), fontWeight: "700", color: C.textDark, marginBottom: 4 },
  headerSubtitle: { fontSize: fs(14), color: C.textMuted, lineHeight: 20 },

  // Verse Card
  verseCard: { marginHorizontal: s(18), borderRadius: s(20), padding: s(24), borderWidth: 1, marginBottom: s(20), shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  verseIconRow: { flexDirection: "row", alignItems: "center", gap: s(12), marginBottom: 20 },
  verseIconBox: { width: s(44), height: s(44), borderRadius: s(14), alignItems: "center", justifyContent: "center" },
  verseDate: { fontSize: fs(13), fontWeight: "600" },
  verseText: { fontSize: fs(18), fontWeight: "500", lineHeight: 28, fontStyle: "italic", marginBottom: 16 },
  verseReference: { fontSize: fs(15), fontWeight: "700", marginBottom: 4 },
  verseTranslation: { fontSize: fs(12), marginBottom: 16 },
  shareBtn: { alignSelf: "flex-start", backgroundColor: C.blueLight, paddingVertical: s(10), paddingHorizontal: s(18), borderRadius: 10 },
  shareBtnText: { color: C.blue, fontSize: fs(14), fontWeight: "600" },
  loadingText: { marginTop: s(12), fontSize: fs(14), textAlign: "center" },

  // Journal
  journalSection: { paddingHorizontal: s(18), marginBottom: 20 },
  sectionTitle: { fontSize: fs(18), fontWeight: "700", marginBottom: 14 },
  journalCard: { borderRadius: s(16), padding: s(18), borderWidth: 1 },
  journalInput: { borderWidth: 1, borderRadius: s(12), padding: s(14), fontSize: fs(15), lineHeight: fs(22), minHeight: 120, marginBottom: 12 },
  journalActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12 },
  savedLabel: { fontSize: fs(13), color: C.green, fontWeight: "600" },
  saveJournalBtn: { backgroundColor: C.blue, paddingVertical: s(10), paddingHorizontal: s(20), borderRadius: 10 },
  saveJournalText: { color: "#FFF", fontSize: fs(14), fontWeight: "600" },

  // Past entries
  section: { paddingHorizontal: s(18), marginBottom: 20 },
  pastEntriesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  entryCard: { borderRadius: s(14), padding: s(16), borderWidth: 1 },
  entryDate: { fontSize: fs(12), fontWeight: "600", marginBottom: 6 },
  entryText: { fontSize: fs(14), lineHeight: 20 },
  emptyCard: { borderRadius: s(14), padding: 30, borderWidth: 1, alignItems: "center" },
  emptyTitle: { fontSize: fs(15), fontWeight: "600", marginBottom: 4 },
  emptySub: { fontSize: fs(13), textAlign: "center" },

  bottomPad: { height: 110 },

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




