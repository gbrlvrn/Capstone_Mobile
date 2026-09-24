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
import { fmtDateSlash, fmtDateWithWeekday, fmtTime } from "../services/dateUtils";


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

// Branch name → Province mapping for grouping attendance by province
const BRANCH_TO_PROVINCE = (() => {
  const COMMUNITIES = {
    "Kalinga": ["Tabuk", "Zapote", "Bliss", "Libanon", "Batong Buhay", "Balatoc", "Lat-nog"],
    "Abra": ["Lamao", "Lingey", "Cabaruyan", "Ducligan", "Gangal", "Bila-Bila", "Naguillian", "Ud-udiao", "Villa Conchita", "Ay-yeng Manabo", "Dao-angan", "Kilong-olao", "Bao-yan", "Amti", "Danac", "Bengued", "Sappaac", "Saccaang"],
    "Benguet": ["Baguio"],
    "Pangasinan": ["Dagupan", "Mangatarem", "Laoak Langka", "Orbiztondo", "Malasique Bolaoit", "Taloyan", "Binmaley", "San Carlos", "Manaoag", "Pozorrobio", "Alcala"],
    "Isabela": ["Santiago City"],
    "Bulacan": ["Meycauayan City", "Camalig", "San Jose Del Monte", "Bulacan Main"],
    "Tarlac": ["Pacpaco San Manuel", "Victoria"],
    "Nueva Ecija": ["Bambanaba Cuyapo"],
    "NCR": ["Valenzuela City", "Tandang Sora Quezon City", "COA Quezon City", "Payatas Quezon City", "Malaria Caloocan"],
    "Rizal": ["Montalban"],
    "Cebu": ["Mandaue", "Li-loan", "Calero", "Compostela"],
    "Agusan Del Norte": ["Butuan City", "RTR", "Jabango Bangonay", "Jabonga Bangonay", "Jabonga, Bangonay", "Kasiklan", "San Mateo", "Fatima Kim.13", "Bayugan", "Ibuan", "Balubo"],
    "Surigao Del Norte": ["Alegria", "Bonifacio", "Matin-ao", "Ipil"],
    "Surigao Del Sur": ["Kinabigtasan Tago", "Kinabigtasan, Tago"],
  };
  const map = {};
  for (const [province, names] of Object.entries(COMMUNITIES)) {
    for (const name of names) {
      map[name.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim()] = province;
    }
  }
  return map;
})();

const HISTORY_PAGE_SIZE = 5;


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
  // Scan result UI state: { type: 'success'|'warning'|'error', title, message } | null
  const [scanResult, setScanResult] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMode, setFilterMode] = useState("month"); // "month" or "year"
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const NOW = useMemo(() => new Date(), []);
  const CURRENT_MONTH = NOW.getMonth();
  const CURRENT_YEAR = NOW.getFullYear();

  // ── Live attendance data from backend ──
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [totalAttendance, setTotalAttendance] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState({ totalCheckIns: 0, currentStreak: 0, thisMonthCount: 0 });

  // ── Province-grouped recent attendance ──
  const [expandedProvinces, setExpandedProvinces] = useState({});

  // ── Paginated history modal ──
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalPage, setHistoryModalPage] = useState(1);

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
        getAttendanceHistory(1, 50),
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
      // Sanitize the scanned value — strip whitespace and stray quotes
      const sessionId = (data || "").trim().replace(/^"|"$/g, "");

      // ── Validation 1: Empty scan ──
      if (!sessionId) {
        setScanResult({ type: "error", title: "Invalid QR Code", message: "No data was found in the scanned QR code. Please try again." });
        isScanningRef.current = false;
        setScanning(false);
        return;
      }

      // ── Validation 2: Must look like a session ID (starts with SESS-) ──
      if (!sessionId.startsWith("SESS-")) {
        setScanResult({ type: "error", title: "Not a Service QR", message: "This QR code is not a valid service session. Please scan the QR code displayed by the admin." });
        isScanningRef.current = false;
        setScanning(false);
        return;
      }

      const result = await scanQRAttendance(sessionId);

      if (result?.alreadyLogged) {
        setScanResult({ type: "warning", title: "Already Checked In", message: "You have already checked in for this session. No duplicate entry was recorded." });
      } else if (result?.success) {
        setScanResult({ type: "success", title: "Checked In Successfully!", message: "Your attendance has been recorded for this service session." });
      } else {
        setScanResult({ type: "success", title: "Check-In Processed", message: result?.message || "Your attendance has been recorded." });
      }
      fetchAttendanceData();
    } catch (error) {
      console.log("Check-in error:", error);
      const msg = (error?.message || "").toLowerCase();

      if (msg.includes("session id is required")) {
        setScanResult({ type: "error", title: "Invalid QR Format", message: "The session ID is missing from this QR code. Please scan a valid service QR." });
      } else if (msg.includes("active session not found") || msg.includes("has ended")) {
        setScanResult({ type: "error", title: "Session Not Active", message: "This session has ended or hasn\u2019t started yet. Please ask the admin to start a service session." });
      } else if (msg.includes("token") || msg.includes("unauthorized") || msg.includes("invalid or expired")) {
        setScanResult({ type: "error", title: "Session Expired", message: "Your login session has expired. Please sign in again and try scanning." });
      } else if (msg.includes("user not found")) {
        setScanResult({ type: "error", title: "Account Not Found", message: "Your account was not found in the system. Please contact your administrator." });
      } else if (msg.includes("network") || msg.includes("timed out") || msg.includes("fetch")) {
        setScanResult({ type: "error", title: "Network Error", message: "Could not connect to the server. Please check your internet connection and try again." });
      } else {
        setScanResult({ type: "error", title: "Check-In Failed", message: error?.message || "Something went wrong. Please try again." });
      }
    } finally {
      setTimeout(() => {
        isScanningRef.current = false;
        setScanning(false);
      }, 2000);
    }
  }, [fetchAttendanceData]);

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
                    style={{ backgroundColor: colors.blueLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}
                    onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "600", color: colors.blue }}>
                      {filterMode === "year" ? `${filterYear}` : `${monthNames[filterMonth]} ${filterYear}`} ▾
                    </Text>
                  </TouchableOpacity>
                </View>

                {showFilterDropdown && (
                  <View style={{ marginTop: 8, backgroundColor: colors.cardBg, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, padding: 12 }}>
                    {/* Monthly / Yearly Toggle */}
                    <View style={{ flexDirection: "row", marginBottom: 12, backgroundColor: colors.inputBg || '#F0F2F5', borderRadius: 8, padding: 3 }}>
                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: "center", backgroundColor: filterMode === "month" ? colors.blue : "transparent" }}
                        onPress={() => setFilterMode("month")}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: filterMode === "month" ? "#FFF" : colors.textMuted }}>Monthly</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: "center", backgroundColor: filterMode === "year" ? colors.blue : "transparent" }}
                        onPress={() => setFilterMode("year")}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: filterMode === "year" ? "#FFF" : colors.textMuted }}>Yearly</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Year Selector */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: filterMode === "month" ? 12 : 0 }}>
                      <TouchableOpacity onPress={() => setFilterYear(y => y - 1)} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: "bold" }}>{"<"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (filterMode === "year") {
                            setShowFilterDropdown(false);
                          }
                        }}
                      >
                        <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: "bold" }}>{filterYear}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { if (filterYear < CURRENT_YEAR) setFilterYear(y => y + 1); }}
                        disabled={filterYear >= CURRENT_YEAR}
                        style={{ paddingHorizontal: 12, paddingVertical: 4, opacity: filterYear >= CURRENT_YEAR ? 0.3 : 1 }}
                      >
                        <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: "bold" }}>{">"}  </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Month Grid — only show in monthly mode */}
                    {filterMode === "month" && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                        {monthNames.map((m, idx) => {
                          const isSelected = idx === filterMonth;
                          const isFuture = filterYear === CURRENT_YEAR && idx > CURRENT_MONTH;
                          return (
                            <TouchableOpacity
                              key={m}
                              disabled={isFuture}
                              style={{ 
                                width: "23%", 
                                paddingVertical: 6, 
                                marginBottom: 6,
                                alignItems: "center",
                                borderRadius: 6,
                                backgroundColor: isSelected ? colors.blue : "transparent",
                                opacity: isFuture ? 0.3 : 1,
                              }}
                              onPress={() => {
                                setFilterMonth(idx);
                                setShowFilterDropdown(false);
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: "600", color: isSelected ? "#FFF" : isFuture ? colors.textMuted : colors.textDark }}>
                                {m}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{attendanceHistory.filter(r => {
                const d = new Date(r.createdAt || r.date);
                if (isNaN(d.getTime())) return false;
                if (filterMode === "year") return d.getFullYear() === filterYear;
                return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
              }).length}</Text>
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



        {/* Recent Attendance — grouped by province (matches web) */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 0 }]}>Recent Attendance</Text>
            <TouchableOpacity onPress={() => { setHistoryModalPage(1); setShowHistoryModal(true); }} activeOpacity={0.6}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.blue || "#2E6BF0" }}>View History</Text>
            </TouchableOpacity>
          </View>

          {(() => {
            if (attendanceHistory.length === 0) {
              return (
                <View style={[styles.historyTable, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 24, alignItems: "center" }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>No attendance records yet.</Text>
                </View>
              );
            }

            // Group records by province
            const grouped = {};
            attendanceHistory.forEach(record => {
              const branch = (record.branch || record.community || "").trim();
              const province = BRANCH_TO_PROVINCE[branch.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim()] || "Other";
              if (!grouped[province]) grouped[province] = {};
              if (!grouped[province][branch || "Unknown"]) grouped[province][branch || "Unknown"] = [];
              grouped[province][branch || "Unknown"].push(record);
            });

            const provinceEntries = Object.entries(grouped).sort((a, b) => {
              if (a[0] === "Other") return -1;
              if (b[0] === "Other") return 1;
              return a[0].localeCompare(b[0]);
            });

            return provinceEntries.map(([province, branches]) => {
              const totalVisits = Object.values(branches).reduce((sum, arr) => sum + arr.length, 0);
              const isExpanded = expandedProvinces[province];
              return (
                <View key={province} style={[styles.provinceCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <TouchableOpacity
                    style={styles.provinceHeader}
                    activeOpacity={0.7}
                    onPress={() => setExpandedProvinces(prev => ({ ...prev, [province]: !prev[province] }))}
                  >
                    <Text style={[styles.provinceName, { color: colors.textDark }]}>{province}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600" }}>
                        {totalVisits} visit{totalVisits !== 1 ? "s" : ""}
                      </Text>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && Object.entries(branches).map(([branchName, records]) => (
                    <View key={branchName} style={styles.branchSection}>
                      <Text style={[styles.branchName, { color: colors.textDark }]}>{branchName}</Text>
                      {/* Branch table header */}
                      <View style={styles.branchTableHeader}>
                        <Text style={[styles.branchTableHeaderText, { flex: 2 }]}>Service</Text>
                        <Text style={[styles.branchTableHeaderText, { flex: 1.5 }]}>Date</Text>
                        <Text style={[styles.branchTableHeaderText, { flex: 1, textAlign: "right" }]}>Method</Text>
                      </View>
                      {records.map((record, rIdx) => (
                        <TouchableOpacity
                          key={record._id || rIdx}
                          style={[styles.branchTableRow, rIdx === records.length - 1 && { borderBottomWidth: 0 }]}
                          activeOpacity={0.6}
                          onPress={() => setSelectedRecord(record)}
                        >
                          <Text style={[styles.branchTableCell, { flex: 2, color: colors.textDark }]}>
                            {record.service || record.type || "Check-in"}
                          </Text>
                          <Text style={[styles.branchTableCell, { flex: 1.5, color: colors.textDark }]}>
                            {record.date || (record.createdAt ? fmtDateSlash(record.createdAt) : "-")}
                          </Text>
                          <View style={{ flex: 1, alignItems: "flex-end" }}>
                            {record.method ? (
                              <View style={[styles.methodBadge, { backgroundColor: record.method.toUpperCase().includes("QR") ? "rgba(46,107,240,0.1)" : "rgba(175,82,222,0.1)" }]}>
                                <Text style={[styles.methodBadgeText, { color: record.method.toUpperCase().includes("QR") ? (colors.blue || "#2E6BF0") : "#AF52DE" }]}>
                                  {record.method.toUpperCase().includes("QR") ? "QR SCAN" : record.method.toUpperCase()}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              );
            });
          })()}
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
        onRequestClose={() => { setShowQRCode(false); setScanResult(null); }}
      >
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerModalBox}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan Service QR</Text>
              <TouchableOpacity onPress={() => { setShowQRCode(false); setScanResult(null); }} style={styles.scannerCloseIcon}>
                <Ionicons name="close" size={20} color={colors.textDark || "#1A2744"} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.scannerContainer}>
              {scanResult ? (
                /* ── Scan Result Card ── */
                <View style={styles.scanResultOverlay}>
                  <View style={[
                    styles.scanResultIconCircle,
                    { backgroundColor: scanResult.type === "success" ? "rgba(52,199,89,0.15)" : scanResult.type === "warning" ? "rgba(245,166,35,0.15)" : "rgba(231,76,60,0.15)" }
                  ]}>
                    <Ionicons
                      name={scanResult.type === "success" ? "checkmark-circle" : scanResult.type === "warning" ? "alert-circle" : "close-circle"}
                      size={48}
                      color={scanResult.type === "success" ? "#34C759" : scanResult.type === "warning" ? "#F5A623" : "#E74C3C"}
                    />
                  </View>
                  <Text style={[
                    styles.scanResultTitle,
                    { color: scanResult.type === "success" ? "#34C759" : scanResult.type === "warning" ? "#F5A623" : "#E74C3C" }
                  ]}>{scanResult.title}</Text>
                  <Text style={styles.scanResultMessage}>{scanResult.message}</Text>

                  {scanResult.type === "success" ? (
                    <TouchableOpacity
                      style={styles.scanResultBtnSuccess}
                      activeOpacity={0.8}
                      onPress={() => { setShowQRCode(false); setScanResult(null); }}
                    >
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.scanResultBtnText}>Done</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.scanResultBtnRow}>
                      <TouchableOpacity
                        style={styles.scanResultBtnRetry}
                        activeOpacity={0.8}
                        onPress={() => setScanResult(null)}
                      >
                        <Ionicons name="scan-outline" size={16} color="#0D1F45" />
                        <Text style={styles.scanResultBtnRetryText}>{scanResult.type === "warning" ? "OK" : "Try Again"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.scanResultBtnClose}
                        activeOpacity={0.8}
                        onPress={() => { setShowQRCode(false); setScanResult(null); }}
                      >
                        <Text style={styles.scanResultBtnCloseText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : showQRCode && permission?.granted ? (
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

            {!scanResult && (
              <View style={styles.scannerFooter}>
                <Text style={styles.scannerFooterText}>
                  Point your camera at the session QR code displayed by the admin.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Attendance Detail Modal */}
      <Modal
        visible={!!selectedRecord}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedRecord(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedRecord(null)}>
          <View style={styles.detailModalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.detailModalBox, { backgroundColor: colors.cardBg }]}>
                {/* Header */}
                <View style={styles.detailModalHeader}>
                  <View style={[styles.detailModalIconCircle, { backgroundColor: colors.blueLight }]}>
                    <Ionicons name="calendar" size={24} color={colors.blue || "#0D1F45"} />
                  </View>
                  <Text style={[styles.detailModalTitle, { color: colors.textDark }]}>Attendance Details</Text>
                  <TouchableOpacity onPress={() => setSelectedRecord(null)} style={styles.detailModalCloseBtn}>
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Status Badge */}
                {selectedRecord?.status ? (
                  <View style={[
                    styles.detailStatusBadge,
                    {
                      backgroundColor:
                        selectedRecord.status === "Present" ? "rgba(52,199,89,0.12)" :
                        selectedRecord.status === "Late" ? "rgba(245,166,35,0.12)" :
                        selectedRecord.status === "Absent" ? "rgba(231,76,60,0.12)" :
                        colors.blueLight,
                    }
                  ]}>
                    <Ionicons
                      name={selectedRecord.status === "Present" ? "checkmark-circle" : selectedRecord.status === "Late" ? "time" : selectedRecord.status === "Absent" ? "close-circle" : "ellipse"}
                      size={16}
                      color={
                        selectedRecord.status === "Present" ? "#34C759" :
                        selectedRecord.status === "Late" ? "#F5A623" :
                        selectedRecord.status === "Absent" ? "#E74C3C" :
                        colors.blue
                      }
                    />
                    <Text style={[
                      styles.detailStatusText,
                      {
                        color:
                          selectedRecord.status === "Present" ? "#34C759" :
                          selectedRecord.status === "Late" ? "#F5A623" :
                          selectedRecord.status === "Absent" ? "#E74C3C" :
                          colors.blue,
                      }
                    ]}>{selectedRecord.status}</Text>
                  </View>
                ) : null}

                {/* Divider */}
                <View style={[styles.detailDivider, { backgroundColor: colors.cardBorder }]} />

                {/* Detail Rows */}
                <View style={styles.detailRows}>
                  {selectedRecord?.service ? (
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <Ionicons name="book-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailRowLabel, { color: colors.textMuted }]}>Service</Text>
                      </View>
                      <Text style={[styles.detailRowValue, { color: colors.textDark }]}>{selectedRecord.service}</Text>
                    </View>
                  ) : null}

                  {selectedRecord?.branch ? (
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailRowLabel, { color: colors.textMuted }]}>Branch</Text>
                      </View>
                      <Text style={[styles.detailRowValue, { color: colors.textDark }]}>{selectedRecord.branch}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <View style={styles.detailRowLeft}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                      <Text style={[styles.detailRowLabel, { color: colors.textMuted }]}>Date</Text>
                    </View>
                    <Text style={[styles.detailRowValue, { color: colors.textDark }]}>
                      {selectedRecord?.date || (selectedRecord?.createdAt ? fmtDateWithWeekday(selectedRecord.createdAt) : "-")}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailRowLeft}>
                      <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                      <Text style={[styles.detailRowLabel, { color: colors.textMuted }]}>Time</Text>
                    </View>
                    <Text style={[styles.detailRowValue, { color: colors.textDark }]}>
                      {selectedRecord?.time || (selectedRecord?.createdAt ? fmtTime(selectedRecord.createdAt) : "-")}
                    </Text>
                  </View>

                  {selectedRecord?.method ? (
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <Ionicons name="scan-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailRowLabel, { color: colors.textMuted }]}>Method</Text>
                      </View>
                      <Text style={[styles.detailRowValue, { color: colors.textDark }]}>{selectedRecord.method}</Text>
                    </View>
                  ) : null}

                  {selectedRecord?.member ? (
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailRowLabel, { color: colors.textMuted }]}>Member</Text>
                      </View>
                      <Text style={[styles.detailRowValue, { color: colors.textDark }]}>{selectedRecord.member}</Text>
                    </View>
                  ) : null}

                  {selectedRecord?.sessionId ? (
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <Ionicons name="key-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailRowLabel, { color: colors.textMuted }]}>Session</Text>
                      </View>
                      <Text style={[styles.detailRowValue, { color: colors.textDark, fontSize: 12 }]}>{selectedRecord.sessionId}</Text>
                    </View>
                  ) : null}

                  {selectedRecord?.recordId ? (
                    <View style={styles.detailRow}>
                      <View style={styles.detailRowLeft}>
                        <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.detailRowLabel, { color: colors.textMuted }]}>Record ID</Text>
                      </View>
                      <Text style={[styles.detailRowValue, { color: colors.textDark, fontSize: 12 }]}>{selectedRecord.recordId}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={[styles.detailCloseButton, { backgroundColor: colors.blue || "#0D1F45" }]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedRecord(null)}
                >
                  <Text style={styles.detailCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Attendance History Modal — paginated list (matches web) */}
      <Modal
        visible={showHistoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={[styles.historyModalBox, { backgroundColor: colors.cardBg }]}>
            {/* Header */}
            <View style={styles.historyModalHeader}>
              <Text style={[styles.historyModalTitle, { color: colors.textDark }]}>ATTENDANCE HISTORY</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.historyModalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Records List */}
            <ScrollView style={styles.historyModalScroll} showsVerticalScrollIndicator={false}>
              {(() => {
                const sorted = [...attendanceHistory].sort((a, b) => {
                  const da = new Date(a.createdAt || a.date || 0);
                  const db = new Date(b.createdAt || b.date || 0);
                  return db - da;
                });
                const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PAGE_SIZE));
                const page = Math.min(historyModalPage, totalPages);
                const paged = sorted.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);

                if (sorted.length === 0) {
                  return (
                    <View style={{ padding: 32, alignItems: "center" }}>
                      <Text style={{ color: colors.textMuted, fontSize: 14 }}>No attendance records yet.</Text>
                    </View>
                  );
                }

                return (
                  <>
                    {paged.map((record, idx) => {
                      const branch = record.branch || record.community || "";
                      const dateStr = record.createdAt
                        ? `${fmtDateSlash(record.createdAt)} ${fmtTime(record.createdAt)}`
                        : record.date
                          ? `${record.date}${record.time ? ` ${record.time}` : ""}`
                          : "-";
                      const method = (record.method || "").toUpperCase();
                      const isQR = method.includes("QR");

                      return (
                        <TouchableOpacity
                          key={record._id || idx}
                          style={[styles.historyModalCard, { borderColor: colors.cardBorder }]}
                          activeOpacity={0.7}
                          onPress={() => { setShowHistoryModal(false); setSelectedRecord(record); }}
                        >
                          <View style={[styles.historyModalIconCircle, { backgroundColor: "rgba(46,107,240,0.1)" }]}>
                            <Ionicons name="checkmark-circle" size={24} color={colors.blue || "#2E6BF0"} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.historyModalService, { color: colors.textDark }]}>
                              {record.service || record.type || "Check-in"}
                            </Text>
                            <Text style={[styles.historyModalSub, { color: colors.textMuted }]}>
                              {branch ? `${branch} · ` : ""}{dateStr}
                            </Text>
                          </View>
                          {method ? (
                            <View style={[styles.methodBadge, { backgroundColor: isQR ? "rgba(46,107,240,0.1)" : "rgba(175,82,222,0.1)" }]}>
                              <Text style={[styles.methodBadgeText, { color: isQR ? (colors.blue || "#2E6BF0") : "#AF52DE" }]}>
                                {isQR ? "QR SCAN" : method}
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Pagination */}
                    <View style={styles.historyModalPagination}>
                      <TouchableOpacity
                        onPress={() => setHistoryModalPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        style={{ opacity: page <= 1 ? 0.4 : 1, paddingVertical: 8, paddingHorizontal: 12 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textMuted }}>‹ Prev</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "600" }}>
                        Page {page} of {totalPages}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setHistoryModalPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        style={{ opacity: page >= totalPages ? 0.4 : 1, paddingVertical: 8, paddingHorizontal: 12 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textDark }}>Next ›</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
            </ScrollView>
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

  // ── Province-grouped Recent Attendance ──
  provinceCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  provinceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  provinceName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textDark,
  },
  branchSection: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    marginTop: 0,
  },
  branchName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textDark,
    paddingTop: 12,
    paddingBottom: 8,
  },
  branchTableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    marginBottom: 2,
  },
  branchTableHeaderText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
  },
  branchTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  branchTableCell: {
    fontSize: 13,
    fontWeight: "500",
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  methodBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Attendance History Modal ──
  historyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  historyModalBox: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    overflow: "hidden",
  },
  historyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  historyModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  historyModalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  historyModalScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  historyModalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  historyModalIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  historyModalService: {
    fontSize: 14.5,
    fontWeight: "700",
    marginBottom: 3,
  },
  historyModalSub: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  historyModalPagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  // ── Attendance Detail Modal ──
  detailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  detailModalBox: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  detailModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailModalIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
  },
  detailModalCloseBtn: {
    padding: 6,
  },
  detailStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 16,
  },
  detailStatusText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  detailDivider: {
    height: 1,
    marginBottom: 16,
  },
  detailRows: {
    gap: 14,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailRowLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailRowValue: {
    fontSize: 13.5,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  detailCloseButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCloseButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
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

  // ── Scan Result Card Styles ──
  scanResultOverlay: {
    flex: 1,
    backgroundColor: C.cardBg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  scanResultIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  scanResultTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  scanResultMessage: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  scanResultBtnSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#34C759",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: "100%",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  scanResultBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scanResultBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  scanResultBtnRetry: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D1F45",
    paddingVertical: 14,
    borderRadius: 14,
  },
  scanResultBtnRetryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scanResultBtnClose: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    backgroundColor: C.secondaryBtnBg,
  },
  scanResultBtnCloseText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textDark,
  },
});




