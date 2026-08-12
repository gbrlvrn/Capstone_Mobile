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
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import { useTheme } from "../components/ThemeContext";
import { getEvents, rsvpEvent, seedEvents } from "../services/AuthService";
import * as Haptics from "expo-haptics";
import * as Calendar from "expo-calendar";
import { useToast } from "../components/ToastContext";
import OfflineBanner from "../components/OfflineBanner";
import { SkeletonBlock, SkeletonLine } from "../components/SkeletonLoader";

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
  calendar: require("../assets/icons/calendar.png"),
  clock: require("../assets/icons/clock.png"),
  location: require("../assets/icons/location.png"),
  people: require("../assets/icons/people.png"),
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

const EVENT_COLORS = [
  { bg: C.blueLight, color: C.blue },
  { bg: C.greenLight, color: C.green },
  { bg: C.goldLight, color: C.gold },
  { bg: C.purpleLight, color: C.purple },
];


function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function formatEventDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

export default function EventsScreen({ navigation, route }) {
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpedEvents, setRsvpedEvents] = useState({});

  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const tabAnimations = useRef(ALL_TAB_ITEMS.map(() => ({ scale: new Animated.Value(1), bgOpacity: new Animated.Value(0) }))).current;

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

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      // Try to seed events first (idempotent)
      try { await seedEvents(); } catch {}
      const data = await getEvents();
      if (data?.events) {
        setEvents(data.events);
        // Check which events user already RSVP'd
        const rsvped = {};
        data.events.forEach((e) => {
          if (e.rsvps?.some((r) => r.email === userEmail)) {
            rsvped[e._id] = true;
          }
        });
        setRsvpedEvents(rsvped);
      }
    } catch (err) {
      console.log("Events load error:", err);
      // Use local fallback data
      setEvents([
        { _id: "1", title: "Sunday Worship Service", description: "Join us for weekly worship.", date: new Date(Date.now() + 3 * 86400000).toISOString(), time: "8:00 AM - 10:00 AM", location: "Main Chapel", branch: "General", rsvpCount: 45 },
        { _id: "2", title: "Youth Fellowship Night", description: "An evening of worship and games.", date: new Date(Date.now() + 5 * 86400000).toISOString(), time: "6:00 PM - 9:00 PM", location: "Fellowship Hall", branch: "Youth Ministry", rsvpCount: 23 },
        { _id: "3", title: "Prayer & Fasting Week", description: "A week-long prayer and fasting event.", date: new Date(Date.now() + 10 * 86400000).toISOString(), time: "5:00 AM - 6:00 AM", location: "Prayer Room", branch: "General", rsvpCount: 30 },
        { _id: "4", title: "Community Outreach", description: "Distribute food and supplies.", date: new Date(Date.now() + 14 * 86400000).toISOString(), time: "7:00 AM - 12:00 PM", location: "Community Center", branch: "Mission Fund", rsvpCount: 15 },
      ]);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

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

  const handleRSVP = async (eventId) => {
    if (!userEmail) return;
    try {
      await rsvpEvent(eventId, userEmail);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRsvpedEvents((prev) => ({ ...prev, [eventId]: true }));
      // Update the event's rsvpCount
      setEvents((prev) => prev.map((e) => e._id === eventId ? { ...e, rsvpCount: (e.rsvpCount || 0) + 1 } : e));
    } catch {
      // Fallback for offline
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRsvpedEvents((prev) => ({ ...prev, [eventId]: true }));
      setEvents((prev) => prev.map((e) => e._id === eventId ? { ...e, rsvpCount: (e.rsvpCount || 0) + 1 } : e));
    }
  };

  const handleAddToCalendar = async (event) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        showToast("Calendar access is needed to add events.", "error");
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writableCalendars = calendars.filter((c) => c.allowsModifications);
      const defaultCal = writableCalendars.find((c) => c.isPrimary) || writableCalendars[0];
      if (!defaultCal) {
        showToast("No writable calendar found on this device.", "error");
        return;
      }
      const eventDate = new Date(event.date);
      await Calendar.createEventAsync(defaultCal.id, {
        title: event.title,
        notes: event.description,
        location: event.location,
        startDate: eventDate,
        endDate: new Date(eventDate.getTime() + 2 * 60 * 60 * 1000),
        timeZone: "Asia/Manila",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Event added to your calendar!", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to add to calendar.", "error");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

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
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Church Events</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Upcoming events and activities
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.textDark }]}>{events.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Upcoming</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statValue, { color: colors.textDark }]}>{Object.keys(rsvpedEvents).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>My RSVPs</Text>
          </View>
        </View>

        {/* Events List */}
        {loading ? (
          <View style={styles.eventsList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.eventCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <SkeletonBlock width={80} height={24} borderRadius={8} style={{ marginBottom: 12 }} />
                <SkeletonLine width="70%" height={18} style={{ marginBottom: 8 }} />
                <SkeletonLine width="95%" height={13} style={{ marginBottom: 4 }} />
                <SkeletonLine width="60%" height={13} style={{ marginBottom: 16 }} />
                <SkeletonLine width="50%" height={12} style={{ marginBottom: 6 }} />
                <SkeletonLine width="45%" height={12} style={{ marginBottom: 6 }} />
                <SkeletonLine width="55%" height={12} style={{ marginBottom: 16 }} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <SkeletonBlock width="48%" height={40} borderRadius={12} />
                  <SkeletonBlock width="48%" height={40} borderRadius={12} />
                </View>
              </View>
            ))}
          </View>
        ) : events.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Image source={ICONS.calendar} style={{width: s(48), height: s(48), tintColor: colors.textMuted, marginBottom: s(12), opacity: 0.5}} resizeMode="contain"/>
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No Upcoming Events</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Check back later for new events.</Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event, idx) => {
              const colorScheme = EVENT_COLORS[idx % EVENT_COLORS.length];
              const isRsvped = rsvpedEvents[event._id];
              return (
                <View key={event._id || idx} style={[styles.eventCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  {/* Date badge */}
                  <View style={[styles.dateBadge, { backgroundColor: colorScheme.bg }]}>
                    <Text style={[styles.dateBadgeText, { color: colorScheme.color }]}>{daysUntil(event.date)}</Text>
                  </View>

                  <Text style={[styles.eventTitle, { color: colors.textDark }]}>{event.title}</Text>
                  <Text style={[styles.eventDesc, { color: colors.textMuted }]} numberOfLines={2}>{event.description}</Text>

                  <View style={styles.eventDetails}>
                    <View style={styles.detailRow}>
                      <Image source={ICONS.calendar} style={[styles.detailIcon, { tintColor: colors.textMuted }]} resizeMode="contain" />
                      <Text style={[styles.detailText, { color: colors.textMuted }]}>{formatEventDate(event.date)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Image source={ICONS.clock} style={[styles.detailIcon, { tintColor: colors.textMuted }]} resizeMode="contain" />
                      <Text style={[styles.detailText, { color: colors.textMuted }]}>{event.time}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Image source={ICONS.location} style={[styles.detailIcon, { tintColor: colors.textMuted }]} resizeMode="contain" />
                      <Text style={[styles.detailText, { color: colors.textMuted }]}>{event.location}</Text>
                    </View>
                  </View>

                  {/* RSVP count */}
                  <View style={styles.rsvpRow}>
                    <View style={styles.attendeesInfo}>
                      <Image source={ICONS.people} style={[styles.attendeesIcon, { tintColor: C.blue }]} resizeMode="contain" />
                      <Text style={[styles.attendeesText, { color: C.blue }]}>{event.rsvpCount || 0} attending</Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.eventActions}>
                    <TouchableOpacity
                      style={[styles.rsvpBtn, isRsvped && styles.rsvpBtnDone]}
                      onPress={() => !isRsvped && handleRSVP(event._id)}
                      activeOpacity={0.7}
                      disabled={isRsvped}
                    >
                      <Text style={[styles.rsvpBtnText, isRsvped && styles.rsvpBtnTextDone]}>
                        {isRsvped ? "âœ“ RSVP'd" : "RSVP"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.calendarBtn}
                      onPress={() => handleAddToCalendar(event)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.calendarBtnText}>+ Calendar</Text>
                    </TouchableOpacity>
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

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.tabBg }]}>
        <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: indicatorPosition }] }]} />
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
  statCard: { flex: 1, borderRadius: s(16), padding: s(18), borderWidth: 1, alignItems: "center" },
  statValue: { fontSize: fs(28), fontWeight: "700", marginBottom: 4 },
  statLabel: { fontSize: fs(13), fontWeight: "600" },

  // Events
  eventsList: { paddingHorizontal: s(18), gap: 16 },
  eventCard: { borderRadius: s(18), padding: s(20), borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  dateBadge: { alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: s(12), borderRadius: s(8), marginBottom: 12 },
  dateBadgeText: { fontSize: fs(12), fontWeight: "700" },
  eventTitle: { fontSize: fs(18), fontWeight: "700", marginBottom: 6 },
  eventDesc: { fontSize: fs(14), lineHeight: fs(20), marginBottom: 14 },
  eventDetails: { gap: 8, marginBottom: 14 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIcon: { width: 16, height: 16 },
  detailText: { fontSize: fs(13), fontWeight: "500" },
  rsvpRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  attendeesInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  attendeesIcon: { width: 16, height: 16 },
  attendeesText: { fontSize: fs(13), fontWeight: "600" },
  eventActions: { flexDirection: "row", gap: 12 },
  rsvpBtn: { flex: 1, backgroundColor: C.blue, paddingVertical: s(12), borderRadius: s(12), alignItems: "center" },
  rsvpBtnDone: { backgroundColor: C.greenLight },
  rsvpBtnText: { color: "#FFF", fontSize: fs(14), fontWeight: "700" },
  rsvpBtnTextDone: { color: C.green },
  calendarBtn: { flex: 1, backgroundColor: C.blueLight, paddingVertical: s(12), borderRadius: s(12), alignItems: "center" },
  calendarBtnText: { color: C.blue, fontSize: fs(14), fontWeight: "700" },
  loadingText: { marginTop: s(12), fontSize: 14 },
  emptyCard: { marginHorizontal: s(18), borderRadius: s(18), padding: s(40), borderWidth: 1, alignItems: "center" },
  emptyTitle: { fontSize: fs(16), fontWeight: "700", marginBottom: 4 },
  emptySub: { fontSize: fs(14), textAlign: "center" },
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




