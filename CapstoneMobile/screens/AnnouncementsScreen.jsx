import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Platform, Dimensions, Animated, RefreshControl, ActivityIndicator, Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import { useTheme } from "../components/ThemeContext";
import { getAnnouncements } from "../services/AuthService";
import { useToast } from "../components/ToastContext";
import { API_CONFIG } from "../services/config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
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
  calendar: require("../assets/icons/calendar.png"),
  clock: require("../assets/icons/clock.png"),
  location: require("../assets/icons/location.png"),
  wallet: require("../assets/icons/wallet.png"),
  notification: require("../assets/icons/bell.png"),
};

const C = {
  bg: "#F0F2F5", navBg: "#0D1F45", cardBg: "#FFFFFF", cardBorder: "#E8ECF0",
  textDark: "#1A2744", textMuted: "#6B7FA3", blue: "#0D1F45",
  blueLight: "rgba(46,107,240,0.1)", green: "#34C759", greenLight: "rgba(52,199,89,0.1)",
  gold: "#F5A623", goldLight: "rgba(245,166,35,0.1)", purple: "#AF52DE",
  purpleLight: "rgba(175,82,222,0.1)", red: "#E74C3C",
  tabBg: "rgb(13, 31, 69)", tabActive: "#0D1F45", tabInactive: "#e3ecf9",
  overlay: "rgba(0,0,0,0.45)",
};

const ALL_TAB_ITEMS = [
  { key: "Home", icon: ICONS.home }, { key: "Loans", icon: ICONS.loans },
  { key: "Donations", icon: ICONS.donations }, { key: "Attendance", icon: ICONS.attendance },
  { key: "Branches", icon: ICONS.branches },
];

const SIDEBAR_ITEMS = [
  { key: "Announcements", icon: ICONS.notification },
  { key: "Savings", icon: ICONS.wallet },
  { key: "Profile", icon: ICONS.profile },
  { key: "Settings", icon: ICONS.settings },
];

const CATEGORY_COLORS = [
  { bg: C.blueLight, color: C.blue }, { bg: C.greenLight, color: C.green },
  { bg: C.goldLight, color: C.gold }, { bg: C.purpleLight, color: C.purple },
];

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatDay(dateStr) {
  if (!dateStr) return { day: "", month: "" };
  const d = new Date(dateStr);
  return { day: d.getDate().toString(), month: d.toLocaleString("en-US", { month: "short" }).toUpperCase() };
}

function cleanEmail(v) { return typeof v === "string" ? v.trim().toLowerCase() : ""; }

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = API_CONFIG.CUSTOM_BACKEND.BASE_URL.replace(/\/api$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

const FILTERS = ["All", "Upcoming", "Past"];

export default function AnnouncementsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-260)).current;
  const tabAnimations = useRef(ALL_TAB_ITEMS.map(() => ({ scale: new Animated.Value(1), bgOpacity: new Animated.Value(0) }))).current;

  const now = new Date();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("faithly_user");
        let u = {};
        if (stored) {
          u = JSON.parse(stored);
        }
        
        if (mounted) {
          const emailFromParams = cleanEmail(route?.params?.email);
          setUserEmail(emailFromParams || cleanEmail(u.email));
          setUserRole(u.role || "member");
          setUserPosition(u.position || "");
        }
      } catch (err) {
        console.log("Error loading user in Announcements:", err);
      }
    })();
    return () => { mounted = false; };
  }, [route?.params?.email]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const fetched = await getAnnouncements();
      const validAnns = (fetched || []).filter(a => a.isActive !== false);
      setAnnouncements(validAnns);
    } catch (err) {
      console.log("Announcements load error:", err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnnouncements();
    showToast("Announcements refreshed", "success");
  }, [loadAnnouncements, showToast]);

  const filteredAnnouncements = announcements.filter((a) => {
    if (activeFilter === "All") return true;
    const annDate = a.date ? new Date(a.date) : null;
    if (activeFilter === "Upcoming") return annDate && annDate >= now;
    if (activeFilter === "Past") return annDate && annDate < now;
    return true;
  });

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.timing(slideX, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closeSidebar = () => {
    Animated.timing(slideX, { toValue: -260, duration: 250, useNativeDriver: true }).start(() => setSidebarOpen(false));
  };

  const navWithEmail = (screen) => {
    navigation.replace(screen, { email: userEmail });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuBtn} onPress={openSidebar} activeOpacity={0.6}>
          <View style={{ width: 22, height: 2, backgroundColor: colors.textDark, borderRadius: 2 }} />
          <View style={{ width: 16, height: 2, backgroundColor: colors.textDark, borderRadius: 2 }} />
          <View style={{ width: 22, height: 2, backgroundColor: colors.textDark, borderRadius: 2 }} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: 36, height: 36 }} resizeMode="contain" /></View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications", { email: userEmail })} style={{ padding: 4 }} activeOpacity={0.6}><Image source={ICONS.notification} style={{ width: 22, height: 22, tintColor: colors.textDark }} resizeMode="contain" /></TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Announcements</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Stay updated with the latest church events and news.</Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterPill, activeFilter === f && styles.filterPillActive]} 
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.textDark }]}>{announcements.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.textDark }]}>
              {announcements.filter(a => a.date && new Date(a.date) >= now).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Upcoming</Text>
          </View>
        </View>

        {/* Announcements List */}
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={C.blue} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading announcements...</Text>
          </View>
        ) : filteredAnnouncements.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Image source={ICONS.notification} style={{ width: 48, height: 48, tintColor: colors.textMuted, marginBottom: 12, opacity: 0.5 }} resizeMode="contain" />
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No Announcements</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {activeFilter === "All" ? "Check back later for new announcements." : `No ${activeFilter.toLowerCase()} announcements found.`}
            </Text>
          </View>
        ) : (
          <View style={styles.annList}>
            {filteredAnnouncements.map((ann, idx) => {
              const colorScheme = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              const dateInfo = formatDay(ann.date);
              return (
                <TouchableOpacity 
                  key={ann.id || ann._id || idx} 
                  activeOpacity={0.8} 
                  onPress={() => setSelectedAnnouncement(ann)}
                  style={[styles.annCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                >
                  {/* Top Image */}
                  {ann.image ? (
                    <View style={styles.annImageWrap}>
                      <Image source={{ uri: getImageUrl(ann.image) }} style={styles.annImage} resizeMode="cover" />
                    </View>
                  ) : null}

                  <View style={{ padding: 20, paddingTop: ann.image ? 16 : 20 }}>
                    {/* Category badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: colorScheme.bg }]}>
                      <Text style={[styles.categoryText, { color: colorScheme.color }]} numberOfLines={1}>
                        {(ann.category || "General").toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "column" }}>
                      {/* Date */}
                      {dateInfo.day ? (
                        <View style={styles.dateBlock}>
                          <Text style={[styles.dateDay, { color: colors.textDark }]}>{dateInfo.day}</Text>
                          <Text style={[styles.dateMonth, { color: colors.textMuted }]}>{dateInfo.month}</Text>
                        </View>
                      ) : null}

                      <Text style={[styles.annTitle, { color: colors.textDark }]} numberOfLines={2}>{ann.title}</Text>
                      <Text style={[styles.annDesc, { color: colors.textMuted }]} numberOfLines={2}>{ann.description || ann.message}</Text>
                      
                      <View style={styles.annMeta}>
                        {ann.time && (
                          <View style={styles.metaRow}>
                            <Image source={ICONS.clock} style={[styles.metaIcon, { tintColor: colors.textMuted }]} resizeMode="contain" />
                            <Text style={[styles.metaText, { color: colors.textMuted }]}>{ann.time}</Text>
                          </View>
                        )}
                        {ann.location && (
                          <View style={styles.metaRow}>
                            <Image source={ICONS.location} style={[styles.metaIcon, { tintColor: colors.textMuted }]} resizeMode="contain" />
                            <Text style={[styles.metaText, { color: colors.textMuted }]}>{ann.location}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Announcement Detail Modal */}
      <Modal
        visible={!!selectedAnnouncement}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {selectedAnnouncement?.image ? (
                <Image
                  source={{ uri: getImageUrl(selectedAnnouncement.image) }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : null}
              
              <View style={styles.modalBody}>
                <View style={[styles.categoryBadge, { backgroundColor: C.blueLight, alignSelf: "flex-start", marginBottom: 10 }]}>
                  <Text style={[styles.categoryText, { color: C.blue }]}>
                    {(selectedAnnouncement?.category || "General").toUpperCase()}
                  </Text>
                </View>

                <Text style={[styles.modalTitle, { color: colors.textDark }]}>{selectedAnnouncement?.title}</Text>
                
                {selectedAnnouncement?.date && (
                  <View style={styles.modalMetaRow}>
                    <Image source={ICONS.calendar} style={[styles.modalMetaIcon, { tintColor: colors.textMuted }]} resizeMode="contain" />
                    <Text style={[styles.modalMetaText, { color: colors.textMuted }]}>{formatDate(selectedAnnouncement.date)}</Text>
                  </View>
                )}
                {selectedAnnouncement?.time && (
                  <View style={styles.modalMetaRow}>
                    <Image source={ICONS.clock} style={[styles.modalMetaIcon, { tintColor: colors.textMuted }]} resizeMode="contain" />
                    <Text style={[styles.modalMetaText, { color: colors.textMuted }]}>{selectedAnnouncement.time}</Text>
                  </View>
                )}
                {selectedAnnouncement?.location && (
                  <View style={styles.modalMetaRow}>
                    <Image source={ICONS.location} style={[styles.modalMetaIcon, { tintColor: colors.textMuted }]} resizeMode="contain" />
                    <Text style={[styles.modalMetaText, { color: colors.textMuted }]}>{selectedAnnouncement.location}</Text>
                  </View>
                )}

                <Text style={[styles.modalDesc, { color: colors.textDark }]}>
                  {selectedAnnouncement?.description || selectedAnnouncement?.message}
                </Text>
              </View>
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setSelectedAnnouncement(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DraggableChatButton onPress={() => setChatbotOpen(true)} />
      <ChatbotModal visible={chatbotOpen} onClose={() => setChatbotOpen(false)} />

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.tabBg }]}>
        <Animated.View style={[styles.tabIndicator, { width: SCREEN_WIDTH / (userRole !== "officer" ? 4 : 5), transform: [{ translateX: indicatorPosition }] }]} />
        {(userRole !== "officer" ? ALL_TAB_ITEMS.filter(t => t.key !== "Loans") : ALL_TAB_ITEMS).map((tab) => {
          const isActive = activeTab === tab.key;
          const ai = ALL_TAB_ITEMS.findIndex(t => t.key === tab.key);
          return (
            <TouchableOpacity key={tab.key} style={styles.tabItem} onPress={() => { setActiveTab(tab.key); navWithEmail(tab.key); }} activeOpacity={0.7}>
              <Animated.View style={[styles.tabBgCircle, { opacity: tabAnimations[ai].bgOpacity }]} />
              <Animated.View style={{ transform: [{ scale: tabAnimations[ai].scale }] }}>
                <Image source={tab.icon} style={[styles.tabIcon, { tintColor: isActive ? C.tabActive : colors.tabInactive, opacity: isActive ? 1 : 0.6 }]} resizeMode="contain" />
              </Animated.View>
              <Text style={[styles.tabLabel, { color: isActive ? C.tabActive : colors.tabInactive, fontWeight: isActive ? "700" : "500", fontSize: isActive ? 11 : 10, opacity: isActive ? 1 : 0.7 }]}>{tab.key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sidebar */}
      {sidebarOpen && <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSidebar} />}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideX }] }]}>
        <View style={styles.sidebarHeader}>
          <Image source={LOGO} style={styles.sidebarLogo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.sidebarTitle}>IsangDiwa</Text>
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "500" }}>Apostolic Church</Text>
          </View>
        </View>
        <View style={styles.sidebarNav}>
          {SIDEBAR_ITEMS.map((item) => {
            const isItemActive = item.key === "Announcements";
            return (
              <TouchableOpacity key={item.key} style={[styles.sidebarItem, isItemActive && styles.sidebarItemActive]} onPress={() => { closeSidebar(); if (item.key !== "Announcements") navWithEmail(item.key); }} activeOpacity={0.6}>
                <Image source={item.icon} style={[styles.sidebarIcon, { tintColor: isItemActive ? "#FFFFFF" : "rgba(255,255,255,0.5)" }]} resizeMode="contain" />
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
  root: { flex: 1 },
  circleTopRight: { position: "absolute", top: -120, right: -120, width: 350, height: 350, borderRadius: 175, backgroundColor: "#0D1F45", opacity: 0.04, zIndex: 0 },
  circleBottomLeft: { position: "absolute", bottom: -150, left: -150, width: 450, height: 450, borderRadius: 225, backgroundColor: "#00C3FF", opacity: 0.04, zIndex: 0 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: Platform.OS === "ios" ? 56 : 42, paddingBottom: 14 },
  menuBtn: { padding: 4, justifyContent: "center", gap: 5 },
  topTitle: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "600" },
  topSpacer: { width: 28 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, lineHeight: 20 },

  // Filter tabs
  filterRow: { flexDirection: "row", paddingHorizontal: 18, gap: 10, marginBottom: 16, marginTop: 8 },
  filterPill: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, backgroundColor: "rgba(46,107,240,0.08)" },
  filterPillActive: { backgroundColor: C.blue },
  filterText: { fontSize: 13, fontWeight: "600", color: C.blue },
  filterTextActive: { color: "#FFFFFF" },

  // Stats
  statsRow: { flexDirection: "row", paddingHorizontal: 18, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, padding: 18, borderWidth: 1, alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: "600" },

  // Announcements list
  annList: { paddingHorizontal: 18, gap: 16 },
  annCard: { borderRadius: 18, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, overflow: "hidden" },
  categoryBadge: { alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12 },
  categoryText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  annCardBody: { flexDirection: "row" },
  annCardLeft: { flex: 1, paddingRight: 12 },
  dateBlock: { flexDirection: "row", alignItems: "baseline", marginBottom: 6, gap: 6 },
  dateDay: { fontSize: 32, fontWeight: "800" },
  dateMonth: { fontSize: 14, fontWeight: "700", textTransform: "uppercase" },
  annTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  annDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  annMeta: { gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaIcon: { width: 14, height: 14 },
  metaText: { fontSize: 12, fontWeight: "500" },
  annImageWrap: { width: "100%", height: 160, backgroundColor: "rgba(46,107,240,0.05)" },
  annImage: { width: "100%", height: "100%" },

  loadingText: { marginTop: 12, fontSize: 14 },
  emptyCard: { marginHorizontal: 18, borderRadius: 18, padding: 40, borderWidth: 1, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emptySub: { fontSize: 14, textAlign: "center" },
  bottomPad: { height: 100 },

  // Tab bar
  tabBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(100,140,200,0.2)", paddingVertical: 15, paddingBottom: Platform.OS === "ios" ? 30 : 10 },
  tabIndicator: { position: "absolute", bottom: 0, height: 3, backgroundColor: C.tabActive, borderRadius: 2 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, position: "relative" },
  tabBgCircle: { position: "absolute", width: 75, height: 62, borderRadius: 15, backgroundColor: "rgba(46,107,240,0.15)", top: -14 },
  tabIcon: { width: 26, height: 26 },
  tabLabel: { fontSize: 10 },

  // Sidebar
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.overlay, zIndex: 10 },
  sidebar: { position: "absolute", top: 0, left: 0, bottom: 0, width: 260, backgroundColor: "#0D1F45", zIndex: 20, paddingTop: Platform.OS === "ios" ? 60 : 44, paddingHorizontal: 18, justifyContent: "space-between" },
  sidebarHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 30 },
  sidebarLogo: { width: 40, height: 40, borderRadius: 20 },
  sidebarTitle: { fontSize: 20, fontWeight: "700", color: "#FFF" },
  sidebarNav: { flex: 1, gap: 4 },
  sidebarItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, marginBottom: 6 },
  sidebarItemActive: { backgroundColor: "#0D1F45" },
  sidebarIcon: { width: 20, height: 20 },
  sidebarItemText: { fontSize: 15, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
  sidebarItemTextActive: { color: "#FFF" },
  sidebarFooter: { paddingBottom: Platform.OS === "ios" ? 30 : 16, borderTopWidth: 1, borderTopColor: "rgba(60,90,150,0.25)", paddingTop: 16 },
  sidebarUserRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sidebarAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(31,102,255,0.93)", alignItems: "center", justifyContent: "center" },
  sidebarAvatarIcon: { width: 18, height: 18, tintColor: "#FFF" },
  sidebarUserName: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  sidebarUserEmail: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
  signOutRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  signOutIcon: { width: 18, height: 18, tintColor: "#E74C3C" },
  signOutText: { fontSize: 14, fontWeight: "500", color: "#E74C3C" },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxHeight: "85%", borderRadius: 20, overflow: "hidden" },
  modalImage: { width: "100%", height: 220, backgroundColor: "#E8ECF0" },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 12, lineHeight: 28 },
  modalMetaRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  modalMetaIcon: { width: 16, height: 16 },
  modalMetaText: { fontSize: 14, fontWeight: "500" },
  modalDesc: { fontSize: 15, lineHeight: 24, marginTop: 12 },
  modalCloseBtn: { padding: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", alignItems: "center" },
  modalCloseText: { fontSize: 16, fontWeight: "700", color: C.blue },
});




