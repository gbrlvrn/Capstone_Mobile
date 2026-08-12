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
  Modal,
  RefreshControl,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import { SkeletonStatCard } from "../components/SkeletonLoader";
import { useTheme } from "../components/ThemeContext";
import { useToast } from "../components/ToastContext";
import FloatingNavBar from "../components/FloatingNavBar";
import OfflineBanner from "../components/OfflineBanner";
import { scanQRAttendance, getAttendanceHistory, getAttendanceStats } from "../services/AuthService";


const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  calendar: require("../assets/icons/calendar.png"),
  check: require("../assets/icons/check.png"),
  qrcode: require("../assets/icons/qrcode.png"),
  camera: require("../assets/icons/camera.png"),
  clock: require("../assets/icons/clock.png"),
  location: require("../assets/icons/location.png"),
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

// ✅ Sidebar only for non-tab pages (clean like your Donations screen)
const SIDEBAR_ITEMS = [
  { key: "Announcements", icon: ICONS.notification },
  { key: "Savings", icon: ICONS.wallet },
  { key: "Profile", icon: ICONS.profile },
  { key: "Settings", icon: ICONS.settings },
];



// Attendance history and stats are fetched from the backend

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export default function AttendanceScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [activeTab, setActiveTab] = useState("Attendance");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ── Live attendance data from backend ──
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState({ totalCheckIns: 0, currentStreak: 0, thisMonthCount: 0 });

  // Staggered entrance animations for 2 stat cards
  const statAnims = useRef([0, 1].map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(18),
  }))).current;

  // Filtered tabs based on role (members don't see Loans)
  const TAB_ITEMS = userRole !== "officer"
    ? ALL_TAB_ITEMS.filter(t => t.key !== "Loans")
    : ALL_TAB_ITEMS;
  const TAB_WIDTH = SCREEN_WIDTH / TAB_ITEMS.length;

  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-260)).current;

  const tabAnimations = useRef(
    ALL_TAB_ITEMS.map(() => ({
      scale: new Animated.Value(1),
      bgOpacity: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const emailFromParams = cleanEmail(route?.params?.email);

        // use route param if available and cache it
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

        // fallback: from cache
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

  // ── Fetch attendance data from backend ──
  const fetchAttendanceData = useCallback(async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        getAttendanceHistory(50, 0),
        getAttendanceStats(),
      ]);
      if (historyRes?.records) setAttendanceHistory(historyRes.records);
      if (historyRes?.total != null) setTotalAttendance(historyRes.total);
      if (statsRes) setAttendanceStats(statsRes);
    } catch (err) {
      console.log("Failed to fetch attendance data:", err?.message);
    }
  }, []);

  // Loading + entrance animations + initial data fetch
  useEffect(() => {
    fetchAttendanceData();
    const timer = setTimeout(() => {
      setLoading(false);
      statAnims.forEach((anim, i) => {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1, duration: 350, delay: i * 100, useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0, duration: 350, delay: i * 100, useNativeDriver: true,
          }),
        ]).start();
      });
    }, 600);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // always navigate with email
  const navWithEmail = useCallback(
    (screen) => navigation.replace(screen, { email: userEmail }),
    [navigation, userEmail],
  );

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

  const handleSignOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("faithly_user");
      await AsyncStorage.removeItem("@faithly_session");
      setShowSignOutConfirm(false);
      closeSidebar();
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
      }, 300);
    } catch (err) {
      console.log("Sign out error:", err);
    }
  }, [navigation, closeSidebar]);

  useEffect(() => {
    const index = TAB_ITEMS.findIndex((t) => t.key === activeTab);

    Animated.spring(indicatorPosition, {
      toValue: index * TAB_WIDTH,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    TAB_ITEMS.forEach((tab, vi) => {
      const ai = ALL_TAB_ITEMS.findIndex(t => t.key === tab.key);
      if (ai === -1) return;
      if (vi === index) {
        Animated.parallel([
          Animated.spring(tabAnimations[ai].scale, {
            toValue: 1.2,
            tension: 100,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(tabAnimations[ai].bgOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(tabAnimations[ai].scale, {
            toValue: 1,
            tension: 100,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(tabAnimations[ai].bgOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [activeTab, indicatorPosition, tabAnimations, TAB_ITEMS, TAB_WIDTH]);

  const isScanningRef = useRef(false);
  const handleBarcodeScanned = useCallback(async ({ type, data }) => {
    if (isScanningRef.current) return;
    
    isScanningRef.current = true;
    setScanning(true);
    
    try {
      // The web admin QR code contains a plain text session ID (e.g. "SESS-2026-0001")
      // Always send it as { sessionId: "<scanned_value>" } to the scan-qr endpoint
      const sessionId = (data || "").trim();
      if (!sessionId) {
        showToast("error", "Invalid QR code. No session ID found.");
        isScanningRef.current = false;
        setScanning(false);
        return;
      }

      const result = await scanQRAttendance(sessionId);

      // Handle "already logged" response
      if (result?.alreadyLogged) {
        showToast("warning", result?.message || "You have already checked in for this session.");
      } else {
        showToast("success", result?.message || "Successfully checked in!");
      }
      setShowQRCode(false);
      // Refresh attendance data after successful check-in
      fetchAttendanceData();
    } catch (error) {
      console.log("Check-in error:", error);
      const msg = error?.message || "Failed to check in. Try again.";
      showToast("error", msg);
    } finally {
      setTimeout(() => {
        isScanningRef.current = false;
        setScanning(false);
      }, 2000); // Prevent duplicate scans
    }
  }, [showToast, fetchAttendanceData]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: "transparent" }]}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={openSidebar}
          activeOpacity={0.6}
        >
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" /></View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications", { email: userEmail })} style={{ padding: 4 }} activeOpacity={0.6}><Image source={ICONS.notification} style={{ width: 22, height: 22, tintColor: colors.textDark }} resizeMode="contain" /></TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await fetchAttendanceData();
            setRefreshing(false);
          }} tintColor="#0D1F45" colors={["#0D1F45"]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Attendance Tracking</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Check in to services and view your attendance history
          </Text>
        </View>

        {/* Stats Cards */}
        {loading ? (
          <View style={styles.statsContainer}>
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
        ) : (
        <View style={styles.statsContainer}>
          {/* Total Attendance */}
          <Animated.View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: statAnims[0].opacity, transform: [{ translateY: statAnims[0].translateY }] }]}>
            <View style={styles.statLeft}>
              <View style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[styles.statLabel, { color: colors.textMuted, marginBottom: 0, marginRight: 8 }]}>Total Attendance</Text>
                  <TouchableOpacity 
                    style={{ backgroundColor: colors.blueLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}
                    onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "600", color: colors.blue }}>
                      {monthNames[filterMonth]} {filterYear} ▾
                    </Text>
                  </TouchableOpacity>
                </View>

                {showFilterDropdown && (
                  <View style={{ marginTop: 8, backgroundColor: colors.cardBg, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, padding: 10 }}>
                    {/* Year Selector */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <TouchableOpacity onPress={() => setFilterYear(y => y - 1)} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: "bold" }}>{"<"}</Text>
                      </TouchableOpacity>
                      <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: "bold" }}>{filterYear}</Text>
                      <TouchableOpacity onPress={() => setFilterYear(y => y + 1)} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: "bold" }}>{">"}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Month Grid */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                      {monthNames.map((m, idx) => {
                        const isSelected = idx === filterMonth;
                        return (
                          <TouchableOpacity
                            key={m}
                            style={{ 
                              width: "23%", 
                              paddingVertical: 6, 
                              marginBottom: 6,
                              alignItems: "center",
                              borderRadius: 6,
                              backgroundColor: isSelected ? colors.blue : "transparent" 
                            }}
                            onPress={() => {
                              setFilterMonth(idx);
                              setShowFilterDropdown(false);
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "600", color: isSelected ? "#FFF" : colors.textDark }}>
                              {m}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{attendanceStats.thisMonthCount || 0}</Text>
            </View>
            <View
              style={[styles.statIconBox, { backgroundColor: C.blueLight }]}
            >
              <Image
                source={ICONS.calendar}
                style={[styles.statIcon, { tintColor: C.blue }]}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* Attendance Rate */}
          <Animated.View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: statAnims[1].opacity, transform: [{ translateY: statAnims[1].translateY }] }]}>
            <View style={styles.statLeft}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Attendance Rate</Text>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{totalAttendance > 0 ? `${Math.round((attendanceStats.totalCheckIns / Math.max(totalAttendance, 1)) * 100)}%` : "0%"}</Text>
            </View>
            <View
              style={[styles.statIconBox, { backgroundColor: C.purpleLight }]}
            >
              <Image
                source={ICONS.document}
                style={[styles.statIcon, { tintColor: C.purple }]}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </View>
        )}


        {/* QR Code Scanner Section */}
        <View style={styles.checkInSection}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>QR Code Check In</Text>
          <Text style={[styles.checkInSubtitle, { color: colors.textMuted }]}>Scan service QR code for check-in:</Text>

          <TouchableOpacity 
            style={[styles.qrCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} 
            activeOpacity={0.8}
            onPress={async () => {
              if (!permission?.granted) {
                const { granted } = await requestPermission();
                if (!granted) return showToast("error", "Camera permission is required");
              }
              setShowQRCode(true);
            }}
          >
            <View style={styles.qrIconBox}>
              <Image
                source={ICONS.camera}
                style={styles.qrIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.qrContent}>
              <Text style={[styles.qrTitle, { color: colors.textDark }]}>Scan Service QR</Text>
              <Text style={[styles.qrSubtitle, { color: colors.textMuted }]}>
                Point your camera at the session QR code displayed by the admin.
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>Tip: </Text>
            <Text style={styles.tipText}>
              Scan the QR code displayed by an officer for attendance check-in at your church branch.
            </Text>
          </View>
        </View>



        {/* Attendance History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Attendance History</Text>

          <View style={[styles.historyTable, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.tableCol1]}>
                Service
              </Text>
              <Text style={[styles.tableHeaderText, styles.tableCol2]}>
                Date
              </Text>
              <Text style={[styles.tableHeaderText, styles.tableCol3]}>
                Time
              </Text>
            </View>

            {/* Table Rows */}
            {(() => {
              const filteredHistory = attendanceHistory.filter((record) => {
                if (!record.createdAt) return false;
                const d = new Date(record.createdAt);
                return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
              });

              if (filteredHistory.length === 0) {
                return (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>No attendance records yet for this month.</Text>
                  </View>
                );
              }

              return filteredHistory.map((record, idx, arr) => (
                <View
                  key={record._id || idx}
                  style={[
                    styles.tableRow,
                    idx === arr.length - 1 && styles.tableRowLast,
                  ]}
                >
                  <Text style={[styles.tableCell, styles.tableCol1]}>
                    {record.service || record.type || "Check-in"}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCol2]}>
                    {record.date || (record.createdAt ? new Date(record.createdAt).toLocaleDateString("en-US") : "-")}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCol3]}>
                    {record.time || (record.createdAt ? new Date(record.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-")}
                  </Text>
                </View>
              ));
            })()}
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Floating draggable chat button */}
      <DraggableChatButton onPress={() => setChatbotOpen(true)} />

      <ChatbotModal
        visible={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />

      <FloatingNavBar activeTab="Attendance" navigation={navigation} userEmail={userEmail} userRole={userRole} />

      {/* Sidebar overlay */}
      {sidebarOpen ? (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSidebar}
        />
      ) : null}

      {/* Sidebar drawer */}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideX }] }]}
      >
        <View style={styles.sidebarHeader}>
          <Image
            source={LOGO}
            style={styles.sidebarLogo}
            resizeMode="contain"
          />
          <Text style={styles.sidebarTitle}>IsangDiwa</Text>
        </View>

        <View style={styles.sidebarNav}>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.sidebarItem,
                  isActive && styles.sidebarItemActive,
                ]}
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
                    {
                      tintColor: isActive ? C.blue : C.textMuted,
                    },
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
              <Text
                style={styles.sidebarUserEmail}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {userEmail || "No email loaded"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutRow}
            activeOpacity={0.6}
            onPress={() => setShowSignOutConfirm(true)}
          >
            <Image
              source={ICONS.signout}
              style={styles.signOutIcon}
              resizeMode="contain"
            />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSignOutConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <View style={styles.confirmIconContainer}>
              <Image
                source={ICONS.signout}
                style={styles.confirmIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.textDark }]}>Sign Out</Text>
            <Text style={[styles.confirmMessage, { color: colors.textMuted }]}>
              Are you sure you want to sign out of your account?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmBtnCancel}
                activeOpacity={0.7}
                onPress={() => setShowSignOutConfirm(false)}
              >
                <Text style={styles.confirmBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtnSignOut}
                activeOpacity={0.7}
                onPress={handleSignOut}
              >
                <Text style={styles.confirmBtnSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal
        visible={showQRCode}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerModalBox}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan Service QR</Text>
              <TouchableOpacity onPress={() => setShowQRCode(false)} style={styles.scannerCloseIcon}>
                <Ionicons name="close" size={20} color={colors.textDark || "#1A2744"} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.scannerContainer}>
              {showQRCode && permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={handleBarcodeScanned}
                >
                  <View style={styles.scannerOverlayContent}>
                    <View style={styles.scannerFrame} />
                    {scanning && (
                      <View style={styles.scanningIndicator}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={styles.scanningText}>Checking in...</Text>
                      </View>
                    )}
                  </View>
                </CameraView>
              ) : (
                <View style={styles.noPermissionView}>
                  <Text style={styles.noPermissionText}>Requesting camera permission...</Text>
                </View>
              )}
            </View>

            <View style={styles.scannerFooter}>
              <Text style={styles.scannerFooterText}>
                Point your camera at the session QR code displayed by the admin.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

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
    fontWeight: "600",
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
    fontSize: 26,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 20,
  },

  // Stats Cards
  statsContainer: {
    paddingHorizontal: 18,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  statLeft: { flex: 1 },
  statLabel: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 6,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 26,
    fontWeight: "700",
    color: C.textDark,
  },
  statIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: { width: 22, height: 22 },

  // Check In Section
  checkInSection: {
    backgroundColor: C.cardBg,
    marginHorizontal: 18,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 8,
  },
  checkInSubtitle: {
    fontSize: 13.5,
    color: C.textMuted,
    marginBottom: 16,
    fontWeight: "500",
  },
  qrCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.blueLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(46,107,240,0.22)",
  },
  qrIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.cardBg,
    alignItems: "center",
    justifyContent: "center",
  },
  qrIcon: { width: 28, height: 28, tintColor: C.blue },
  qrContent: { flex: 1 },
  qrTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 4,
  },
  qrSubtitle: { fontSize: 13, color: C.textMuted, lineHeight: 18 },

  tipBox: {
    backgroundColor: C.blueLight,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipLabel: { fontSize: 13, fontWeight: "700", color: C.blue },
  tipText: { flex: 1, fontSize: 13, color: C.textDark, lineHeight: 18 },

  // Section
  section: { paddingHorizontal: 18, marginBottom: 20 },

  // Service Card
  serviceCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  serviceIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIcon: { width: 22, height: 22, tintColor: C.blue },
  serviceContent: { flex: 1, justifyContent: "center" },
  serviceName: {
    fontSize: 15.5,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 6,
  },
  serviceDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  serviceDetailIcon: { width: 14, height: 14, tintColor: C.textMuted },
  serviceDetail: { fontSize: 13, color: C.textMuted, fontWeight: "500" },

  // History Table
  historyTable: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.inputBg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  tableRowLast: { borderBottomWidth: 0 },
  tableCell: { fontSize: 13.5, color: C.textDark, fontWeight: "500" },
  tableCol1: { flex: 2 },
  tableCol2: { flex: 1.5 },
  tableCol3: { flex: 1, textAlign: "right" },

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
  sidebarTitle: { fontSize: 18, fontWeight: "900", color: "#FFF" },
  sidebarRole: {
    fontSize: 12,
    color: "#FFF",
    marginTop: 1,
    fontWeight: "700",
  },

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
  sidebarUserName: { fontSize: 14, fontWeight: "900", color: "#FFF" },
  sidebarUserEmail: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
    fontWeight: "700",
  },

  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  signOutIcon: { width: 30, height: 40, tintColor: C.red },
  signOutText: { fontSize: 14, color: C.red, fontWeight: "900" },

  // Sign Out Confirmation Modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmDialog: {
    backgroundColor: C.cardBg,
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
  confirmIcon: {
    width: 32,
    height: 32,
    tintColor: C.red,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 12,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 15,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmBtnCancel: {
    flex: 1,
    backgroundColor: C.secondaryBtnBg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textDark,
  },
  confirmBtnSignOut: {
    flex: 1,
    backgroundColor: C.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnSignOutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  
  // Scanner Modal Styles
  scannerModalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  scannerModalBox: {
    backgroundColor: C.cardBg,
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.textDark,
  },
  scannerCloseIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: C.secondaryBtnBg,
  },
  scannerCloseText: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textDark,
  },
  scannerContainer: {
    height: SCREEN_WIDTH * 0.9,
    width: "100%",
    backgroundColor: "#000",
    position: "relative",
  },
  scannerOverlayContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: "#FF3B30",
    borderStyle: "dashed",
    borderRadius: 12,
  },
  scanningIndicator: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  scanningText: {
    color: "#FFF",
    marginTop: 8,
    fontWeight: "600",
  },
  noPermissionView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noPermissionText: {
    color: "#FFF",
    fontSize: 16,
  },
  scannerFooter: {
    padding: 20,
    backgroundColor: C.cardBg,
  },
  scannerFooterText: {
    textAlign: "center",
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 20,
  },
  
  // Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownMenu: {
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "600",
  },
});




