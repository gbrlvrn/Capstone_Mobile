import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  Platform,
  Dimensions,
  Modal,
  RefreshControl,
  Easing,
  FlatList,
} from "react-native";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import FloatingNavBar from "../components/FloatingNavBar";
import { SkeletonMemberCard, SkeletonCard, SkeletonQuickAction } from "../components/SkeletonLoader";
import { useToast } from "../components/ToastContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getVerificationStatus, getProfile, getAnnouncements, getDonations, getSavingsData, getAttendanceHistory, getLoans } from "../services/AuthService";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../components/ThemeContext";
import OfflineBanner from "../components/OfflineBanner";
import { API_CONFIG } from "../services/config";

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = API_CONFIG.CUSTOM_BACKEND.BASE_URL.replace(/\/api$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

const LOGO = require("../assets/puac_logo.png");
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));
const SIDEBAR_WIDTH = s(260);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const AVAILABLE_YEARS = [2026, 2025, 2024, 2023];

const ICONS = {
  document: require("../assets/icons/document.png"),
  wallet: require("../assets/icons/wallet.png"),
  clock: require("../assets/icons/clock.png"),
  heart: require("../assets/icons/heart.png"),
  chat: require("../assets/icons/chat.png"),
  home: require("../assets/icons/home-v3.png"),
  loans: require("../assets/icons/loans.png"),
  donations: require("../assets/icons/donations.png"),
  attendance: require("../assets/icons/attendance.png"),
  branches: require("../assets/icons/branches.png"),
  profile: require("../assets/icons/profile.png"),
  settings: require("../assets/icons/settings.png"),
  person: require("../assets/icons/person.png"),
  signout: require("../assets/icons/signout.png"),
  notification: require("../assets/icons/bell.png"),
  shield: require("../assets/icons/shield.png"),
  checkCircle: require("../assets/icons/verified.png"),
};

// Static fallback for StyleSheet.create (runs at module load, before hooks).
// Runtime colors are overridden via inline styles using `colors` from useTheme().
const C = {
  bg: "#FAFCFE",
  cardBg: "#FFFFFF",
  cardBorder: "#F8FAFC",
  navBg: "transparent",
  sidebarBg: "#0F172A",
  sidebarActive: "#0D1F45",
  tabBg: "#FFFFFF",
  tabActive: "#0D1F45",
  tabInactive: "#94A3B8",
  tabBorder: "rgba(100,140,200,0.2)",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textDimmed: "#9CA3AF",
  blue: "#0D1F45",
  blueLight: "rgba(46,107,240,0.08)",
  red: "#E74C3C",
  orange: "#FF9500",
  green: "#34C759",
  purple: "#AF52DE",
  overlay: "rgba(15,23,42,0.6)",
  navBorder: "rgba(60,90,150,0.1)",
  shadow: "rgba(100,116,139,0.08)",
};

const SIDEBAR_ITEMS = [
  { key: "Announcements", icon: ICONS.notification },
  { key: "Savings", icon: ICONS.wallet },
  { key: "Profile", icon: ICONS.profile },
  { key: "Settings", icon: ICONS.settings },
];

const ALL_TAB_ITEMS = [
  { key: "Home", icon: ICONS.home },
  { key: "Loans", icon: ICONS.loans },
  { key: "Donations", icon: ICONS.donations },
  { key: "Attendance", icon: ICONS.attendance },
  { key: "Branches", icon: ICONS.branches },
];

const QUICK_ACTIONS = [
  {
    title: "Apply for Loan",
    subtitle: "Loan Application",
    icon: ICONS.document,
    bgColor: "rgba(46,107,240,0.1)",
    iconColor: "#0D1F45",
    screen: "Loans",
  },
  {
    title: "Make Donation",
    subtitle: "Support the church",
    icon: ICONS.heart,
    bgColor: "rgba(52,199,89,0.1)",
    iconColor: "#34C759",
    screen: "Donations",
  },
  {
    title: "Attendance Scan",
    subtitle: "Generate QR code",
    icon: ICONS.attendance,
    bgColor: "rgba(175,82,222,0.1)",
    iconColor: "#AF52DE",
    screen: "Attendance",
  },
  {
    title: "Any Questions?",
    subtitle: "Get instant help",
    icon: ICONS.chat,
    bgColor: "rgba(0,0,0,0.05)",
    iconColor: "#1A2744",
    screen: null,
  },
];

const UPCOMING_PAYMENTS = [];

export default function HomeScreen({ navigation, route }) {
  const { showToast } = useToast();
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [isLoanHidden, setIsLoanHidden] = useState(false);
  const loanFlipAnim = useRef(new Animated.Value(0)).current;

  const [isSavingsHidden, setIsSavingsHidden] = useState(false);
  const savingsFlipAnim = useRef(new Animated.Value(0)).current;

  const [isAttendanceHidden, setIsAttendanceHidden] = useState(false);
  const attendanceFlipAnim = useRef(new Animated.Value(0)).current;

  const [isDonationsHidden, setIsDonationsHidden] = useState(false);
  const donationsFlipAnim = useRef(new Animated.Value(0)).current;

  const toggleLoanPrivacy = useCallback(() => {
    const toValue = isLoanHidden ? 0 : 180;
    Animated.spring(loanFlipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: true }).start();
    setIsLoanHidden(!isLoanHidden);
  }, [isLoanHidden]);

  const toggleSavingsPrivacy = useCallback(() => {
    const toValue = isSavingsHidden ? 0 : 180;
    Animated.spring(savingsFlipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: true }).start();
    setIsSavingsHidden(!isSavingsHidden);
  }, [isSavingsHidden]);

  const toggleAttendancePrivacy = useCallback(() => {
    const toValue = isAttendanceHidden ? 0 : 180;
    Animated.spring(attendanceFlipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: true }).start();
    setIsAttendanceHidden(!isAttendanceHidden);
  }, [isAttendanceHidden]);

  const toggleDonationsPrivacy = useCallback(() => {
    const toValue = isDonationsHidden ? 0 : 180;
    Animated.spring(donationsFlipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: true }).start();
    setIsDonationsHidden(!isDonationsHidden);
  }, [isDonationsHidden]);

  const frontInterpolate = loanFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"]
  });
  const backInterpolate = loanFlipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"]
  });

  const savingsFrontInt = savingsFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const savingsBackInt = savingsFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });

  const attendanceFrontInt = attendanceFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const attendanceBackInt = attendanceFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });

  const donationsFrontInt = donationsFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const donationsBackInt = donationsFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [userName, setUserName] = useState("");
  const [isEmailVisible, setIsEmailVisible] = useState(false);

  // Live stats
  const [activeLoans, setActiveLoans] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [totalDonated, setTotalDonated] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [activityFilter, setActivityFilter] = useState("month"); // "month" | "year"
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0..11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // e.g. 2026
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [rawAttendance, setRawAttendance] = useState([]);
  const [rawDonations, setRawDonations] = useState([]);
  const slideX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const indicatorPosition = useRef(new Animated.Value(0)).current;

  const displayAttendanceCount = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    // If selected timeframe is in the future relative to today, strictly return 0
    if (selectedYear > curYear || (selectedYear === curYear && activityFilter === "month" && selectedMonth > curMonth)) {
      return 0;
    }

    if (!Array.isArray(rawAttendance) || rawAttendance.length === 0) {
      const isCurrentMonthYear = activityFilter === "month" && selectedMonth === curMonth && selectedYear === curYear;
      const isCurrentYear = activityFilter === "year" && selectedYear === curYear;
      return (isCurrentMonthYear || isCurrentYear) ? attendanceCount : 0;
    }

    const filtered = rawAttendance.filter((item) => {
      const itemDateStr = item.date || item.createdAt || item.timestamp || item.checkInTime || item.created_at;
      if (!itemDateStr) return false;
      const d = new Date(itemDateStr);
      if (isNaN(d.getTime())) return false;
      if (activityFilter === "month") {
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }
      return d.getFullYear() === selectedYear;
    });

    if (filtered.length > 0) return filtered.length;

    const isCurrentMonthYear = activityFilter === "month" && selectedMonth === curMonth && selectedYear === curYear;
    const isCurrentYear = activityFilter === "year" && selectedYear === curYear;
    return (isCurrentMonthYear || isCurrentYear) ? attendanceCount : 0;
  }, [rawAttendance, attendanceCount, activityFilter, selectedMonth, selectedYear]);

  const displayDonatedAmount = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    // If selected timeframe is in the future relative to today, strictly return 0
    if (selectedYear > curYear || (selectedYear === curYear && activityFilter === "month" && selectedMonth > curMonth)) {
      return 0;
    }

    if (!Array.isArray(rawDonations) || rawDonations.length === 0) {
      const isCurrentMonthYear = activityFilter === "month" && selectedMonth === curMonth && selectedYear === curYear;
      const isCurrentYear = activityFilter === "year" && selectedYear === curYear;
      return (isCurrentMonthYear || isCurrentYear) ? totalDonated : 0;
    }

    let sum = 0;
    let matchCount = 0;
    rawDonations.forEach((item) => {
      const itemDateStr = item.date || item.createdAt || item.timestamp || item.created_at;
      if (!itemDateStr) return;
      const d = new Date(itemDateStr);
      if (isNaN(d.getTime())) return;

      const isMatch = activityFilter === "month"
        ? (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear)
        : (d.getFullYear() === selectedYear);

      if (isMatch) {
        const val = parseFloat(String(item.amount || "0").replace(/[^0-9.-]+/g, "")) || 0;
        sum += val;
        matchCount++;
      }
    });

    if (matchCount === 0) {
      const isCurrentMonthYear = activityFilter === "month" && selectedMonth === curMonth && selectedYear === curYear;
      const isCurrentYear = activityFilter === "year" && selectedYear === curYear;
      return (isCurrentMonthYear || isCurrentYear) ? totalDonated : 0;
    }
    return sum;
  }, [rawDonations, totalDonated, activityFilter, selectedMonth, selectedYear]);

  // Staggered card entrance animations
  const cardAnims = useRef(
    Array.from({ length: 5 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    })),
  ).current;

  // Quick Action entrance animations
  const qaAnims = useRef(
    Array.from({ length: QUICK_ACTIONS.length }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(18),
    })),
  ).current;

  // Quick Action press scale animations
  const qaPressAnims = useRef(
    Array.from({ length: QUICK_ACTIONS.length }, () => new Animated.Value(1))
  ).current;

  const handleQAPress = useCallback((anim, onPress) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 0.94, tension: 200, friction: 10, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  }, []);

  // Trigger staggered card + quick action entrance when loading finishes
  useEffect(() => {
    if (!loading) {
      cardAnims.forEach((anim, i) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(anim.opacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(anim.translateY, { toValue: 0, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]).start();
        }, i * 100);
      });

      // Quick actions animate after cards (delayed by cardAnims.length * 100)
      qaAnims.forEach((anim, i) => {
        const delay = cardAnims.length * 100 + i * 80;
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(anim.opacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(anim.translateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]).start();
        }, delay);
      });
    }
  }, [loading, cardAnims, qaAnims]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const paramEmail = route?.params?.email;
        if (paramEmail) {
          if (mounted) setUserEmail(paramEmail);

          const old = await AsyncStorage.getItem("faithly_user");
          const parsed = old ? JSON.parse(old) : {};
          await AsyncStorage.setItem(
            "faithly_user",
            JSON.stringify({ ...parsed, email: paramEmail }),
          );

          if (mounted) {
            if (parsed.role) setUserRole(parsed.role);
            if (parsed.position) setUserPosition(parsed.position);
            const cachedName = (parsed.firstName || parsed.lastName)
              ? `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim()
              : parsed.fullName || parsed.name || "";
            if (cachedName) setUserName(cachedName);
          }
          return;
        }

        const saved = await AsyncStorage.getItem("faithly_user");

        if (saved) {
          const parsed = JSON.parse(saved);

          if (mounted) {
            setUserEmail(parsed.email || "");
            const cachedName = (parsed.firstName || parsed.lastName)
              ? `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim()
              : parsed.fullName || parsed.name || "";
            if (cachedName) setUserName(cachedName);
            if (parsed.role) setUserRole(parsed.role);
            if (parsed.position) setUserPosition(parsed.position);
          }
        }
      } catch (err) {
        console.log("Email Load Error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [route?.params?.email]);

  // Re-fetch user name + role every time screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!userEmail) return;
      (async () => {
        try {
          // Run both calls in parallel — getProfile is the primary name source
          const [profileResult, verifResult] = await Promise.allSettled([
            getProfile(),
            getVerificationStatus(true),
          ]);

          // ── Name: prefer getProfile (/api/me) ──────────────────────────
          const profileUser = profileResult.status === "fulfilled"
            ? (profileResult.value?.user || profileResult.value)
            : null;
          
          const verifData = verifResult.status === "fulfilled" ? verifResult.value : null;

          const fetchedName = (profileUser?.firstName || profileUser?.lastName)
            ? `${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim()
            : profileUser?.fullName || profileUser?.name
            || ((verifData?.firstName || verifData?.lastName)
              ? `${verifData.firstName || ''} ${verifData.lastName || ''}`.trim()
              : verifData?.fullName || verifData?.name);

          if (fetchedName) {
            setUserName(fetchedName);
          }

          // ── Role / Position: prefer verification status ─────────────────
          if (verifData?.role) setUserRole(verifData.role);
          if (verifData?.position) setUserPosition(verifData.position);

          // Cache everything for other screens / offline use
          const cached = await AsyncStorage.getItem("faithly_user");
          const parsed = cached ? JSON.parse(cached) : {};
          
          const updatedFirstName = profileUser?.firstName || verifData?.firstName || parsed.firstName || "";
          const updatedLastName  = profileUser?.lastName  || verifData?.lastName  || parsed.lastName  || "";
          const updatedFullName  = profileUser?.fullName  || verifData?.fullName  || fetchedName || parsed.fullName || "";

          await AsyncStorage.setItem("faithly_user", JSON.stringify({
            ...parsed,
            email: userEmail,
            role: verifData?.role || profileUser?.role || parsed.role || "member",
            position: verifData?.position || profileUser?.position || parsed.position || "",
            firstName: updatedFirstName,
            lastName: updatedLastName,
            fullName: updatedFullName,
          }));
        } catch {
          // Full failure — fall back to cached data
          try {
            const cached = await AsyncStorage.getItem("faithly_user");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.role) setUserRole(parsed.role);
              if (parsed.position) setUserPosition(parsed.position);
              const cachedName = (parsed.firstName || parsed.lastName)
                ? `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim()
                : parsed.fullName || parsed.name || "";
              if (cachedName) setUserName(cachedName);
            }
          } catch {}
        }
      })();
    }, [userEmail])
  );

  // Check for Unread Notifications & Load Recent Activity
  useFocusEffect(
    useCallback(() => {
      const checkUnreadAndActivity = async () => {
        if (!userEmail) return;
        
        try {
          const fetchedAnns = await getAnnouncements();
          let validAnns = [];
          if (Array.isArray(fetchedAnns)) {
            validAnns = fetchedAnns;
          } else if (fetchedAnns?.data && Array.isArray(fetchedAnns.data)) {
            validAnns = fetchedAnns.data;
          } else if (fetchedAnns?.announcements && Array.isArray(fetchedAnns.announcements)) {
            validAnns = fetchedAnns.announcements;
          }
          setAnnouncements(validAnns);
          const dismissedRaw = await AsyncStorage.getItem(`faithly_dismissed_announcements_${userEmail}`);
          if (dismissedRaw) {
            setDismissedAnnouncements(JSON.parse(dismissedRaw));
          }
        } catch (e) {
          console.error("Announcement load error:", e);
        }

        try {
          const savedData = await AsyncStorage.getItem(`faithly_notifications_${userEmail}`);
          if (savedData) {
            const notifs = JSON.parse(savedData) || [];
            const unreadCount = notifs.filter(n => !n.read).length;
            setNotificationCount(unreadCount);

            // Grab top 3 for Recent Activity from notifications
            const notifRecent = notifs.slice(0, 3).map(n => {
              let icon, iconBg, iconColor;
              switch (n.category) {
                case "transaction":
                  icon = ICONS.heart; iconColor = C.green; iconBg = "rgba(52,199,89,0.1)"; break;
                case "announcement":
                  icon = ICONS.branches; iconColor = C.purple; iconBg = "rgba(175,82,222,0.1)"; break;
                case "loan":
                  icon = ICONS.loans; iconColor = C.blue; iconBg = C.blueLight; break;
                default:
                  icon = ICONS.notification; iconColor = C.orange; iconBg = "rgba(255,149,0,0.1)"; break;
              }
              return {
                id: n.id,
                title: n.title,
                subtitle: n.message,
                time: n.time,
                icon,
                iconBg,
                iconColor,
                sortDate: n.createdAt || n.time || "",
              };
            });
            setNotificationCount(notifs.filter(n => !n.read).length);

            // Also build activity from real API data (donations, attendance, etc.)
            try {
              const donSaved = await AsyncStorage.getItem(`faithly_donations_${userEmail}`);
              const attSaved = await AsyncStorage.getItem(`faithly_attendance_${userEmail}`);
              const loanSaved = await AsyncStorage.getItem(`faithly_loans_${userEmail}`);
              const donItems = donSaved ? JSON.parse(donSaved) : [];
              const attItems = attSaved ? JSON.parse(attSaved) : [];
              const loanItems = loanSaved ? JSON.parse(loanSaved) : [];

              const apiActivity = [];

              // Donations
              donItems.slice(0, 5).forEach(d => {
                const amt = parseFloat(String(d.amount || "0").replace(/[^0-9.-]+/g, "")) || 0;
                apiActivity.push({
                  id: `don-${d._id || d.id}`,
                  title: "Donation",
                  subtitle: `₱${amt.toLocaleString()} — ${d.type || d.category || "General"}`,
                  time: d.createdAt || d.date || "",
                  icon: ICONS.heart,
                  iconBg: "rgba(52,199,89,0.1)",
                  iconColor: C.green,
                  sortDate: d.createdAt || d.date || "",
                });
              });

              // Attendance
              attItems.slice(0, 5).forEach(a => {
                apiActivity.push({
                  id: `att-${a._id || a.id}`,
                  title: "Attendance",
                  subtitle: a.eventName || a.event || "Church Service",
                  time: a.date || a.createdAt || "",
                  icon: ICONS.clock,
                  iconBg: "rgba(175,82,222,0.1)",
                  iconColor: C.purple,
                  sortDate: a.date || a.createdAt || "",
                });
              });

              // Loans
              loanItems.slice(0, 3).forEach(l => {
                apiActivity.push({
                  id: `loan-${l._id || l.id}`,
                  title: `Loan — ${l.status || "Pending"}`,
                  subtitle: `₱${parseFloat(String(l.amount || "0").replace(/[^0-9.-]+/g, "")).toLocaleString()}`,
                  time: l.createdAt || l.applicationDate || "",
                  icon: ICONS.loans,
                  iconBg: C.blueLight,
                  iconColor: C.blue,
                  sortDate: l.createdAt || l.applicationDate || "",
                });
              });

              // Merge notif + API activity, sort by date, take top 5
              const combined = [...notifRecent, ...apiActivity]
                .sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0))
                .slice(0, 5);

              setRecentActivity(combined.length > 0 ? combined : notifRecent);
            } catch {
              setRecentActivity(notifRecent);
            }
          } else {
            setNotificationCount(0);
            // No notifications, but still try to show activity from API data
            try {
              const donSaved = await AsyncStorage.getItem(`faithly_donations_${userEmail}`);
              const attSaved = await AsyncStorage.getItem(`faithly_attendance_${userEmail}`);
              const loanSaved = await AsyncStorage.getItem(`faithly_loans_${userEmail}`);
              const donItems = donSaved ? JSON.parse(donSaved) : [];
              const attItems = attSaved ? JSON.parse(attSaved) : [];
              const loanItems = loanSaved ? JSON.parse(loanSaved) : [];
              const apiActivity = [];
              donItems.slice(0, 5).forEach(d => {
                const amt = parseFloat(String(d.amount || "0").replace(/[^0-9.-]+/g, "")) || 0;
                apiActivity.push({
                  id: `don-${d._id || d.id}`, title: "Donation",
                  subtitle: `₱${amt.toLocaleString()} — ${d.type || d.category || "General"}`,
                  time: d.createdAt || d.date || "", icon: ICONS.heart,
                  iconBg: "rgba(52,199,89,0.1)", iconColor: C.green,
                  sortDate: d.createdAt || d.date || "",
                });
              });
              attItems.slice(0, 5).forEach(a => {
                apiActivity.push({
                  id: `att-${a._id || a.id}`, title: "Attendance",
                  subtitle: a.eventName || a.event || "Church Service",
                  time: a.date || a.createdAt || "", icon: ICONS.clock,
                  iconBg: "rgba(175,82,222,0.1)", iconColor: C.purple,
                  sortDate: a.date || a.createdAt || "",
                });
              });
              loanItems.slice(0, 3).forEach(l => {
                apiActivity.push({
                  id: `loan-${l._id || l.id}`, title: `Loan — ${l.status || "Pending"}`,
                  subtitle: `₱${parseFloat(String(l.amount || "0").replace(/[^0-9.-]+/g, "")).toLocaleString()}`,
                  time: l.createdAt || l.applicationDate || "", icon: ICONS.loans,
                  iconBg: C.blueLight, iconColor: C.blue,
                  sortDate: l.createdAt || l.applicationDate || "",
                });
              });
              const sorted = apiActivity.sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0)).slice(0, 5);
              setRecentActivity(sorted);
            } catch {
              setRecentActivity([]);
            }
          }
        } catch (e) {
          console.error("Home Notification Error", e);
        }
      };
      checkUnreadAndActivity();
    }, [userEmail])
  );

  // Load live stats from API (not just local cache)
  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        if (!userEmail) return;
        try {
          // Fetch ALL data from backend in parallel
          const [loansResult, donationResult, savingsResult, attendanceResult] = await Promise.allSettled([
            getLoans(),
            getDonations(),
            getSavingsData(),
            getAttendanceHistory(1, 100),
          ]);

          // ── Process Loans (from API, not just cache) ──────────────
          if (loansResult.status === "fulfilled") {
            const serverLoans = loansResult.value?.loans || [];
            const active = serverLoans.filter(l => l.status?.toLowerCase() === "active");
            setActiveLoans(active.length);

            let balance = 0;
            let nearest = "";
            active.forEach(l => {
              balance += parseFloat(l.remainingBalance?.toString().replace(/[^0-9.-]+/g, "")) || 0;
              if (l.nextPayment && (!nearest || l.nextPayment < nearest)) {
                nearest = l.nextPayment;
              }
            });
            setRemainingBalance(balance);
            setNextPaymentDate(nearest);
            // Cache for offline use
            await AsyncStorage.setItem(`faithly_loans_${userEmail}`, JSON.stringify(serverLoans));
          } else {
            // Fallback to cache if API fails
            const savedLoans = await AsyncStorage.getItem(`faithly_loans_${userEmail}`);
            if (savedLoans) {
              const loans = JSON.parse(savedLoans);
              const active = loans.filter(l => l.status?.toLowerCase() === "active");
              setActiveLoans(active.length);
              let balance = 0;
              let nearest = "";
              active.forEach(l => {
                balance += parseFloat(l.remainingBalance?.toString().replace(/[^0-9.-]+/g, "")) || 0;
                if (l.nextPayment && (!nearest || l.nextPayment < nearest)) nearest = l.nextPayment;
              });
              setRemainingBalance(balance);
              setNextPaymentDate(nearest);
            } else {
              setActiveLoans(0);
              setRemainingBalance(0);
              setNextPaymentDate("");
            }
          }

          // ── Process Donations ──────────────────────────────────────
          if (donationResult.status === "fulfilled") {
            const sd = donationResult.value;
            const donations = Array.isArray(sd) ? sd : (sd?.donations || []);
            setRawDonations(donations);
            let total = 0;
            donations.forEach(d => {
              total += parseFloat(String(d.amount || "0").replace(/[^0-9.-]+/g, "")) || 0;
            });
            setTotalDonated(total);
            await AsyncStorage.setItem(`faithly_donations_${userEmail}`, JSON.stringify(donations));
          } else {
            console.log("Failed to load donations from server, using cache", donationResult.reason);
            const savedDonations = await AsyncStorage.getItem(`faithly_donations_${userEmail}`);
            if (savedDonations) {
              const donations = JSON.parse(savedDonations);
              setRawDonations(donations);
              let total = 0;
              donations.forEach(d => {
                total += parseFloat(String(d.amount || "0").replace(/[^0-9.-]+/g, "")) || 0;
              });
              setTotalDonated(total);
            }
          }

          // ── Process Attendance ─────────────────────────────────────
          if (attendanceResult && attendanceResult.status === "fulfilled") {
            const att = attendanceResult.value;
            const records = Array.isArray(att) ? att : (att?.records || att?.attendance || att?.data || []);
            setRawAttendance(records);
            setAttendanceCount(records.length);
            await AsyncStorage.setItem(`faithly_attendance_${userEmail}`, JSON.stringify(records));
          } else {
            const savedAtt = await AsyncStorage.getItem(`faithly_attendance_${userEmail}`);
            if (savedAtt) {
              const records = JSON.parse(savedAtt);
              setRawAttendance(records);
              setAttendanceCount(records.length);
            }
          }

          // ── Process Savings (use goals' savedAmount, not transactions) ──
          if (savingsResult.status === "fulfilled") {
            const sv = savingsResult.value;
            // stats.totalSaved is the definitive total from the backend
            // Fallback: sum each goal's savedAmount
            let total = 0;
            if (sv?.stats?.totalSaved != null) {
              total = sv.stats.totalSaved;
            } else {
              const goals = sv?.goals || [];
              goals.forEach(g => { total += parseFloat(g.amountSaved || g.savedAmount || 0); });
            }
            setTotalSavings(total);
            await AsyncStorage.setItem(`faithly_savings_total_${userEmail}`, String(total));
          } else {
            console.log("Failed to load savings from server, using cache", savingsResult.reason);
            const savedTotal = await AsyncStorage.getItem(`faithly_savings_total_${userEmail}`);
            if (savedTotal) {
              setTotalSavings(parseFloat(savedTotal) || 0);
            }
          }
        } catch (e) {
          console.log("Stats load error:", e);
        }
      };
      loadStats();
    }, [userEmail])
  );

  // Filtered tabs based on role (members don't see Loans)
  const TAB_ITEMS = userRole !== "officer"
    ? ALL_TAB_ITEMS.filter(t => t.key !== "Loans")
    : ALL_TAB_ITEMS;
  const TAB_WIDTH = SCREEN_WIDTH / TAB_ITEMS.length;

  // Filtered quick actions (members don't see officer-only items like "Apply for Loan")
  const visibleQuickActions = userRole !== "officer"
    ? QUICK_ACTIONS.filter(a => a.screen !== "Loans" && !a.officerOnly)
    : QUICK_ACTIONS;

  // Create animated values for each tab
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
      toValue: -SIDEBAR_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSidebarOpen(false));
  }, [slideX]);

  // Animate indicator and tabs on active change
  useEffect(() => {
    const index = TAB_ITEMS.findIndex((t) => t.key === activeTab);

    Animated.spring(indicatorPosition, {
      toValue: index * TAB_WIDTH,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    tabAnimations.forEach((anim, i) => {
      // Only animate tabs that are currently visible
      const visibleIndex = TAB_ITEMS.findIndex((t, ti) => ti === i);
      if (visibleIndex === -1) return;
      if (i === index) {
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1.2,
            tension: 100,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(anim.bgOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 100,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(anim.bgOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [activeTab, indicatorPosition, tabAnimations]);

  // helper: always pass email when navigating
  const navWithEmail = useCallback(
    (screen) => navigation.replace(screen, { email: userEmail }),
    [navigation, userEmail],
  );

  const handleSignOut = useCallback(async () => {
    try {
      // Clear stored user data and session
      await AsyncStorage.removeItem("faithly_user");
      await AsyncStorage.removeItem("@faithly_session");

      // Close modals
      setShowSignOutConfirm(false);
      closeSidebar();

      // Navigate to splash screen
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Splash" }],
        });
      }, 300);
    } catch (err) {
      console.log("Sign out error:", err);
    }
  }, [navigation, closeSidebar]);

  const handleNotificationPress = useCallback(() => {
    navigation.navigate("Notifications", { email: userEmail });
  }, [navigation, userEmail]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (userEmail) {
        const data = await getVerificationStatus(userEmail);
        if (data?.role) setUserRole(data.role);
        if (data?.position) setUserPosition(data.position);
      }
      showToast("Dashboard refreshed", "success");
    } catch {
      showToast("Couldn't refresh data", "error");
    } finally {
      setRefreshing(false);
    }
  }, [userEmail, showToast]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.circleTopRight, { opacity: colors.circleOpacity }]} />
      <View style={[styles.circleBottomLeft, { opacity: colors.circleOpacity }]} />

      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: "transparent" }]}>
        <TouchableOpacity
          onPress={openSidebar}
          style={styles.hamburgerBtn}
          activeOpacity={0.6}
        >
          <View style={[styles.hLine, { backgroundColor: colors.hamburgerColor }]} />
          <View style={[styles.hLine, { backgroundColor: colors.hamburgerColor }]} />
          <View style={[styles.hLine, { backgroundColor: colors.hamburgerColor }]} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: s(36), height: 36, borderRadius: 18 }} resizeMode="cover" /></View>

        <TouchableOpacity
          onPress={handleNotificationPress}
          style={styles.notificationBtn}
          activeOpacity={0.6}
        >
          <Image
            source={ICONS.notification}
            style={[styles.notificationIcon, { tintColor: colors.notifIconColor }]}
            resizeMode="contain"
          />
          {notificationCount > 0 && (
            <View style={[styles.notificationDot, { borderColor: colors.bg }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D1F45" colors={["#0D1F45"]} />
        }
      >
        {/* ✅ Member card */}
        {loading ? (
          <SkeletonMemberCard />
        ) : (
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setIsEmailVisible(!isEmailVisible)}
          style={[styles.memberCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <View style={styles.memberLeft}>
            <View style={styles.memberAvatar}>
              <Image
                source={ICONS.person}
                style={styles.memberAvatarIcon}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.memberName, { color: colors.textDark }]}>
                  {userName || "Member"}
                </Text>
                {userRole === "officer" && (
                  <Image
                    source={ICONS.checkCircle}
                    style={{ width: 16, height: 16, tintColor: "#0D1F45" }}
                    resizeMode="contain"
                  />
                )}
              </View>
              <Text style={{ fontSize: fs(13), color: colors.textMuted, marginTop: 2 }}>
                {userRole === "officer" && userPosition ? userPosition : "Member"}
              </Text>
              {isEmailVisible && (
                <Text
                  style={[styles.memberEmail, { color: colors.textMuted, marginTop: 4 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {userEmail || "No email loaded"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.memberPill}>
            <Text style={styles.memberPillText}>Active</Text>
          </View>
        </TouchableOpacity>
        )}



        <Text style={[styles.welcomeTitle, { color: colors.textDark }]}>Welcome Back!</Text>
        <Text style={[styles.welcomeSub, { color: colors.textMuted, marginBottom: 16 }]}>
          Here's an overview of your church activities
        </Text>

        {/* ✅ Stats Grid (UI only) */}
        {loading ? (
          <View style={styles.statsGrid}>
            {userRole === "officer" && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
        <View style={styles.statsGrid}>
          {userRole === "officer" && (
            <>
              {/* Loan Status Card */}
            <Animated.View style={{ height: 150, marginBottom: s(4), width: "100%", opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }] }}>
              {/* FRONT: PRIVACY STATE */}
              <Animated.View 
                pointerEvents={isLoanHidden ? "none" : "auto"} 
                style={[styles.loanHubCard, { position: "absolute", top: 0, left: 0, right: 0, height: "100%", backfaceVisibility: "hidden", backgroundColor: colors.cardBg, borderColor: "rgba(13,31,69,0.15)", borderWidth: 1, padding: 0, transform: [{ rotateY: frontInterpolate }], overflow: "hidden" }]}
              >
                <TouchableOpacity activeOpacity={0.8} onPress={toggleLoanPrivacy} style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
                  <View style={{ width: s(48), height: s(48), borderRadius: s(24), backgroundColor: "rgba(13,31,69,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Image source={ICONS.document} style={{ width: s(24), height: s(24), tintColor: C.blue }} resizeMode="contain" />
                  </View>
                  <Text style={{ fontSize: fs(16), fontWeight: "700", color: C.textDark, marginBottom: 4 }}> Loan Status Update</Text>
                  <Text style={{ fontSize: fs(13), color: C.textMuted }}>Tap to reveal details</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* BACK: DATA STATE */}
              <Animated.View 
                pointerEvents={!isLoanHidden ? "none" : "auto"} 
                style={[styles.loanHubCard, { position: "absolute", top: 0, left: 0, right: 0, height: "100%", backfaceVisibility: "hidden", backgroundColor: C.blue, transform: [{ rotateY: backInterpolate }], padding: 0, overflow: "hidden" }]}
              >
                <TouchableOpacity activeOpacity={0.9} onPress={toggleLoanPrivacy} style={{ flex: 1, padding: 16 }}>
                  <View style={styles.loanHubHeader}>
                    <Image source={ICONS.document} style={{ width: s(18), height: s(26), tintColor: "#FFF" }} resizeMode="contain" />
                    <Text style={styles.loanHubTitle}>My Loan Status</Text>
                  </View>
                  <View style={styles.loanHubBody}>
                    <View style={{ flex: 1.2 }}>
                        <Text style={styles.loanHubLabel}>Remaining Balance</Text>
                        <Text 
                          style={styles.loanHubValue} 
                          adjustsFontSizeToFit 
                          numberOfLines={1}
                          minimumFontScale={0.5}
                        >
                          ₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={styles.loanHubDivider} />
                    <View style={{ flex: 1.0 }}>
                        <Text style={styles.loanHubLabel}>Active Loans</Text>
                        <Text style={styles.loanHubValue}>{activeLoans}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.loanHubFooter}>
                    <Text style={styles.loanHubFooterText} numberOfLines={1}>
                      Next Payment Due: <Text style={{ fontWeight: "700", color: "#FFF" }}>
                        {(() => {
                          if (!nextPaymentDate) return "No upcoming payments";
                          const d = new Date(nextPaymentDate);
                          if (isNaN(d.getTime())) return nextPaymentDate; // Fallback to raw string if invalid
                          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        })()}
                      </Text>
                      {nextPaymentDate && (
                        <Text style={{ fontSize: fs(13), color: "rgba(255,255,255,0.7)" }}> | Status: <Text style={{ color: "#FFF", fontWeight: "700" }}>Pending</Text></Text>
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            </>
          )}

            {/* Savings Card — visible to ALL roles */}
            <Animated.View style={{ height: 90, width: "100%", marginBottom: s(14), opacity: cardAnims[2].opacity, transform: [{ translateY: cardAnims[2].translateY }] }}>
              {/* FRONT: PRIVACY STATE */}
              <Animated.View pointerEvents={isSavingsHidden ? "none" : "auto"} style={[styles.statCard, { position: "absolute", top: 0, left: 0, right: 0, height: "100%", width: "100%", padding: 0, backfaceVisibility: "hidden", transform: [{ rotateY: savingsFrontInt }] }]}>
                <TouchableOpacity activeOpacity={0.8} onPress={toggleSavingsPrivacy} style={{ flex: 1, padding: s(14), flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <View style={[styles.statIconBg, { marginBottom: 0, marginRight: s(12), backgroundColor: "rgba(52,199,89,0.1)" }]}>
                    <Image source={ICONS.wallet} style={[styles.statIcon, { tintColor: "#34C759" }]} resizeMode="contain" />
                  </View>
                  <Text style={{ fontSize: fs(16), fontWeight: "700", color: colors.textDark }}>My Savings</Text>
                </TouchableOpacity>
              </Animated.View>
              {/* BACK: DATA STATE */}
              <Animated.View pointerEvents={!isSavingsHidden ? "none" : "auto"} style={[styles.statCard, { position: "absolute", top: 0, left: 0, right: 0, height: "100%", width: "100%", padding: 0, backfaceVisibility: "hidden", transform: [{ rotateY: savingsBackInt }] }]}>
                <TouchableOpacity activeOpacity={0.7} onPress={toggleSavingsPrivacy} style={{ flex: 1, padding: s(14), flexDirection: "row", alignItems: "center" }}>
                  <View style={[styles.statIconBg, { marginBottom: 0, marginRight: 16 }]}>
                    <Image source={ICONS.wallet} style={[styles.statIcon, { tintColor: "#34C759" }]} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardLabel, { color: colors.textMuted, marginBottom: 2 }]}>My Savings</Text>
                    <Text style={[styles.cardValue, { color: colors.textDark, fontSize: 24 }]}>₱{totalSavings.toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => navWithEmail("Savings")} style={{ width: 28, height: 28, borderRadius: s(14), backgroundColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={[styles.arrowText, { top: -1 }]}>→</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

          {/* Combined Attendance & Giving Card */}
          <Animated.View style={{ width: "100%", marginBottom: s(14), opacity: cardAnims[3].opacity, transform: [{ translateY: cardAnims[3].translateY }] }}>
            <View style={[styles.statCard, { width: "100%", padding: s(16), backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 20 }]}>
              {/* Header with Title and Time Period Dropdown Button */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: s(14) }}>
                <Text style={{ fontSize: fs(14), fontWeight: "700", color: colors.textDark }}>Attendance & Giving</Text>

                {/* Dropdown Time Picker Trigger Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setTimePickerVisible(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: s(6),
                    backgroundColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(13,31,69,0.06)",
                    paddingHorizontal: s(12),
                    paddingVertical: s(6),
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.cardBorder || "rgba(0,0,0,0.08)",
                  }}
                >
                  <Text style={{ fontSize: fs(12), fontWeight: "700", color: colors.textDark }}>
                    {activityFilter === "month"
                      ? `${MONTH_SHORT_NAMES[selectedMonth]} ${selectedYear}`
                      : `${selectedYear}`}
                  </Text>
                  <Text style={{ fontSize: fs(9), color: colors.textMuted }}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* 2 Column Stats Layout (No icons, visible divider line) */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {/* Attendance Checks Column */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navWithEmail("Branches")}
                  style={{ flex: 1, paddingRight: s(8) }}
                >
                  <Text style={[styles.cardLabel, { color: colors.textMuted, fontSize: fs(12), marginBottom: 4 }]}>Attendance Checks</Text>
                  <Text style={[styles.cardValue, { color: colors.textDark, fontSize: fs(20), fontWeight: "800" }]}>{displayAttendanceCount}</Text>
                  <Text style={{ fontSize: fs(10), color: colors.textMuted, marginTop: 2 }}>
                    {activityFilter === "month"
                      ? `${MONTH_SHORT_NAMES[selectedMonth]} ${selectedYear}`
                      : `Year ${selectedYear}`}
                  </Text>
                </TouchableOpacity>

                {/* Highly Visible Vertical Divider Line */}
                <View style={{ width: 1.5, height: s(48), backgroundColor: colors.isDark ? "rgba(255,255,255,0.22)" : "rgba(13,31,69,0.22)", marginHorizontal: s(12) }} />

                {/* Total Donated Column */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navWithEmail("Donations")}
                  style={{ flex: 1, paddingLeft: s(8) }}
                >
                  <Text style={[styles.cardLabel, { color: colors.textMuted, fontSize: fs(12), marginBottom: 4 }]}>Total Donated</Text>
                  <Text
                    style={[styles.cardValue, { color: colors.textDark, fontSize: fs(20), fontWeight: "800" }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    ₱{displayDonatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={{ fontSize: fs(10), color: colors.textMuted, marginTop: 2 }}>
                    {activityFilter === "month"
                      ? `${MONTH_SHORT_NAMES[selectedMonth]} ${selectedYear}`
                      : `Year ${selectedYear}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Time Picker Filter Modal */}
          <Modal
            visible={timePickerVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setTimePickerVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setTimePickerVisible(false)}
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.55)",
                justifyContent: "center",
                alignItems: "center",
                padding: s(20),
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation && e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: s(330),
                  backgroundColor: colors.cardBg,
                  borderRadius: 24,
                  padding: s(20),
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 10,
                }}
              >
                {/* Modal Header */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s(16) }}>
                  <Text style={{ fontSize: fs(16), fontWeight: "700", color: colors.textDark }}>Select Timeframe</Text>
                  <TouchableOpacity onPress={() => setTimePickerVisible(false)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: fs(16), fontWeight: "700", color: colors.textMuted }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Filter Mode Switcher (Per Month / Per Year) */}
                <View style={{ flexDirection: "row", backgroundColor: colors.inputBg || "rgba(0,0,0,0.05)", borderRadius: 12, padding: 3, marginBottom: s(16) }}>
                  <TouchableOpacity
                    onPress={() => setActivityFilter("month")}
                    style={{
                      flex: 1,
                      paddingVertical: s(8),
                      alignItems: "center",
                      borderRadius: 9,
                      backgroundColor: activityFilter === "month" ? (colors.blue || "#0D1F45") : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: fs(12), fontWeight: "700", color: activityFilter === "month" ? "#FFFFFF" : colors.textMuted }}>Per Month</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setActivityFilter("year")}
                    style={{
                      flex: 1,
                      paddingVertical: s(8),
                      alignItems: "center",
                      borderRadius: 9,
                      backgroundColor: activityFilter === "year" ? (colors.blue || "#0D1F45") : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: fs(12), fontWeight: "700", color: activityFilter === "year" ? "#FFFFFF" : colors.textMuted }}>Per Year</Text>
                  </TouchableOpacity>
                </View>

                {/* Year Selector */}
                <Text style={{ fontSize: fs(12), fontWeight: "600", color: colors.textMuted, marginBottom: s(8) }}>Select Year</Text>
                <View style={{ flexDirection: "row", gap: s(8), marginBottom: s(16) }}>
                  {AVAILABLE_YEARS.map((yr) => (
                    <TouchableOpacity
                      key={yr}
                      onPress={() => setSelectedYear(yr)}
                      style={{
                        flex: 1,
                        paddingVertical: s(8),
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selectedYear === yr ? (colors.blue || "#0D1F45") : (colors.cardBorder || "rgba(0,0,0,0.1)"),
                        backgroundColor: selectedYear === yr ? (colors.blue || "#0D1F45") : "transparent",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: fs(12), fontWeight: "700", color: selectedYear === yr ? "#FFFFFF" : colors.textDark }}>
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Month Selector (Visible when activityFilter === "month") */}
                {activityFilter === "month" && (
                  <>
                    <Text style={{ fontSize: fs(12), fontWeight: "600", color: colors.textMuted, marginBottom: s(8) }}>Select Month</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: s(6), marginBottom: s(16) }}>
                      {MONTH_SHORT_NAMES.map((mn, idx) => {
                        const isFutureMonth = selectedYear === new Date().getFullYear() && idx > new Date().getMonth();
                        const isSelected = selectedMonth === idx;
                        return (
                          <TouchableOpacity
                            key={mn}
                            onPress={() => setSelectedMonth(idx)}
                            style={{
                              width: "23%",
                              paddingVertical: s(8),
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: isSelected ? (colors.blue || "#0D1F45") : (colors.cardBorder || "rgba(0,0,0,0.1)"),
                              backgroundColor: isSelected ? (colors.blue || "#0D1F45") : "transparent",
                              alignItems: "center",
                              opacity: isFutureMonth ? 0.45 : 1,
                            }}
                          >
                            <Text style={{ fontSize: fs(11), fontWeight: "700", color: isSelected ? "#FFFFFF" : colors.textDark }}>
                              {mn}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Apply Button */}
                <TouchableOpacity
                  onPress={() => setTimePickerVisible(false)}
                  style={{
                    backgroundColor: colors.blue || "#0D1F45",
                    paddingVertical: s(12),
                    borderRadius: 14,
                    alignItems: "center",
                    marginTop: s(4),
                  }}
                >
                  <Text style={{ fontSize: fs(14), fontWeight: "700", color: "#FFFFFF" }}>Apply Filter</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </View>
        )}

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Quick Actions</Text>
          {loading ? (
            <View style={styles.quickActionsGrid}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonQuickAction key={i} />
              ))}
            </View>
          ) : (
          <View style={styles.quickActionsGrid}>
            {visibleQuickActions.map((action, idx) => (
              <Animated.View
                key={idx}
                style={{ width: "48%", opacity: qaAnims[idx].opacity, transform: [{ translateY: qaAnims[idx].translateY }, { scale: qaPressAnims[idx] }] }}
              >
              <TouchableOpacity
                style={[styles.quickActionCard, { width: "100%", backgroundColor: colors.cardBg }]}
                activeOpacity={1}
                onPress={() => {
                  handleQAPress(qaPressAnims[idx], () => {
                    if (action.screen) {
                      navigation.replace(action.screen, { email: userEmail });
                    } else {
                      setChatbotOpen(true);
                    }
                  });
                }}
              >
                <View
                  style={[
                    styles.quickActionIconBg,
                    { backgroundColor: action.bgColor },
                  ]}
                >
                  <Image
                    source={action.icon}
                    style={[
                      styles.quickActionIcon,
                      { tintColor: action.iconColor },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.quickActionTitle, { color: colors.textDark }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{action.title}</Text>
                <Text style={[styles.quickActionSubtitle, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {action.subtitle}
                </Text>
                <View style={styles.arrowCircle}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
          )}
        </View>

        {/* ── Announcements Carousel ────────────────────────── */}
        {Array.isArray(announcements) && announcements.length > 0 && (() => {
          const visibleAnns = announcements.filter(a => !dismissedAnnouncements.includes(a.id));
          if (visibleAnns.length === 0) return null;
          const CARD_WIDTH = SCREEN_WIDTH - 56;
          const formatDay = (dateStr) => {
            if (!dateStr) return { day: "", month: "" };
            const d = new Date(dateStr);
            return { day: d.getDate().toString(), month: d.toLocaleString("en-US", { month: "short" }).toUpperCase() };
          };
          return (
            <View style={[styles.section, { marginBottom: 18 }]}>
              {/* Section Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: s(14), paddingHorizontal: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 0 }]}>Announcements</Text>
                  <View style={{ backgroundColor: C.red, width: s(22), height: s(22), borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#FFF", fontSize: fs(11), fontWeight: "700" }}>{visibleAnns.length}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("Announcements", { email: userEmail })} activeOpacity={0.6}>
                  <Text style={{ color: C.blue, fontSize: fs(13), fontWeight: "600" }}>See all →</Text>
                </TouchableOpacity>
              </View>

              {/* Carousel */}
              <FlatList
                data={visibleAnns}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 16}
                decelerationRate="fast"
                contentContainerStyle={{ paddingRight: 20 }}
                keyExtractor={(item) => item.id || item._id || Math.random().toString()}
                onScroll={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16));
                  setCarouselIndex(idx);
                }}
                scrollEventThrottle={16}
                renderItem={({ item: ann, index: idx }) => {
                  const dateInfo = formatDay(ann.date);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate("Announcements", { email: userEmail })}
                      style={[styles.carouselCard, { width: CARD_WIDTH, backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    >
                      {/* Top: Whole Image */}
                      {ann.image ? (
                        <View style={styles.carouselImageWrap}>
                          <Image source={{ uri: getImageUrl(ann.image) }} style={styles.carouselImage} resizeMode="cover" />
                        </View>
                      ) : null}

                      <View style={{ padding: s(18), paddingTop: ann.image ? 14 : 18 }}>
                        {/* Category Pill */}
                        <View style={styles.carouselCategoryPill}>
                          <Text style={styles.carouselCategoryText} numberOfLines={1}>
                            {(ann.category || "General").toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "column" }}>
                          {dateInfo.day ? (
                            <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: s(4), gap: 5 }}>
                              <Text style={{ fontSize: 30, fontWeight: "800", color: colors.textDark }}>{dateInfo.day}</Text>
                              <Text style={{ fontSize: fs(13), fontWeight: "700", color: colors.textMuted }}>{dateInfo.month}</Text>
                            </View>
                          ) : null}
                          <Text style={{ fontSize: fs(16), fontWeight: "700", color: colors.textDark, marginBottom: 4 }} numberOfLines={1}>{ann.title}</Text>
                          <Text style={{ fontSize: fs(12), color: colors.textMuted, lineHeight: 17, marginBottom: 10 }} numberOfLines={3}>
                            {ann.description || ann.message}
                          </Text>
                          {/* Location & Time */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            {ann.location ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text style={{ fontSize: fs(12), color: colors.textMuted }}>📍</Text>
                                <Text style={{ fontSize: fs(11), color: colors.textMuted, fontWeight: "500" }}>{ann.location}</Text>
                              </View>
                            ) : null}
                            {ann.time ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text style={{ fontSize: fs(12), color: colors.textMuted }}>🕐</Text>
                                <Text style={{ fontSize: fs(11), color: colors.textMuted, fontWeight: "500" }}>{ann.time}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Dot indicators */}
              {visibleAnns.length > 1 && (
                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: s(12), gap: 6 }}>
                  {visibleAnns.map((_, i) => (
                    <View key={i} style={{ width: carouselIndex === i ? 20 : 8, height: 8, borderRadius: s(4), backgroundColor: carouselIndex === i ? C.blue : "rgba(46,107,240,0.2)" }} />
                  ))}
                </View>
              )}
            </View>
          );
        })()}


        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Recent Activity</Text>
          <View style={[styles.activityWrap, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {recentActivity.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: "center" }}>
                <Image source={ICONS.clock} style={{ width: 32, height: 32, tintColor: colors.textMuted, marginBottom: s(10), opacity: 0.5 }} resizeMode="contain" />
                <Text style={{ fontSize: fs(14), fontWeight: "600", color: colors.textDark, marginBottom: 4 }}>No Recent Activity</Text>
                <Text style={{ fontSize: fs(13), color: colors.textMuted, textAlign: "center", paddingHorizontal: 20 }}>Your recent transactions and activities will appear here.</Text>
              </View>
            ) : recentActivity.map((activity, idx) => (
              <View
                key={activity.id || idx}
                style={[
                  styles.activityItem,
                  idx === recentActivity.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.activityIconBg,
                    { backgroundColor: activity.iconBg },
                  ]}
                >
                  <Image
                    source={activity.icon}
                    style={[
                      styles.activityIcon,
                      { tintColor: activity.iconColor },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.textDark }]}>{activity.title}</Text>
                  <Text style={[styles.activitySubtitle, { color: colors.textMuted }]}>
                    {activity.subtitle}
                  </Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Mobile-Exclusive Features Section ─────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>More Features</Text>
          <View style={{ gap: 12 }}>
            {/* Announcements Card */}
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Announcements", { email: userEmail })}
            >
              <View style={[styles.featureIconBox, { backgroundColor: "rgba(46,107,240,0.1)" }]}>
                <Image source={ICONS.notification} style={{ width: s(22), height: s(22), tintColor: "#0D1F45" }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: colors.textDark }]}>Announcements</Text>
                <Text style={[styles.featureSubtitle, { color: colors.textMuted }]}>Latest church updates</Text>
              </View>
              <Text style={{ color: C.blue, fontWeight: "600", fontSize: 13 }}>View →</Text>
            </TouchableOpacity>

            {/* Prayer Wall Card */}
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("PrayerWall", { email: userEmail })}
            >
              <View style={[styles.featureIconBox, { backgroundColor: "rgba(175,82,222,0.1)" }]}>
                <Image source={ICONS.heart} style={{ width: s(22), height: s(22), tintColor: "#AF52DE" }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: colors.textDark }]}>Prayer Wall</Text>
                <Text style={[styles.featureSubtitle, { color: colors.textMuted }]}>Share & pray for requests</Text>
              </View>
              <Text style={{ color: C.blue, fontWeight: "600", fontSize: 13 }}>Open →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Offline Banner — shown when device loses internet connectivity */}
      <OfflineBanner />

      {/* Floating draggable chat button */}
      <DraggableChatButton onPress={() => setChatbotOpen(true)} />

      {/* Chatbot Modal */}
      <ChatbotModal
        visible={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSignOutConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, { backgroundColor: colors.modalBg }]}>
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
                style={[styles.confirmBtnCancel, { backgroundColor: colors.modalCancelBg }]}
                activeOpacity={0.7}
                onPress={() => setShowSignOutConfirm(false)}
              >
                <Text style={[styles.confirmBtnCancelText, { color: colors.modalCancelText }]}>Cancel</Text>
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

            {/* Floating Bottom Tab Bar */}
      <FloatingNavBar
        activeTab="Home"
        navigation={navigation}
        userEmail={userEmail}
        userRole={userRole}
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
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideX }], backgroundColor: colors.sidebarBg }]}
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
                      tintColor: isActive ? colors.sidebarTextActive : colors.sidebarIconDefault,
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
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  circleTopRight: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#0D1F45',
    opacity: 0.04,
    zIndex: 0,
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 450,
    height: 450,
    borderRadius: 225,
    backgroundColor: '#00C3FF',
    opacity: 0.04,
    zIndex: 0,
  },

  topBar: {
    backgroundColor: C.navBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(22),
    paddingTop: Platform.OS === "ios" ? s(56) : s(42),
    paddingBottom: 14,
    zIndex: 1,
  },
  hamburgerBtn: { padding: 4, justifyContent: "center", gap: 5 },
  hLine: { width: 25, height: s(3), backgroundColor: C.textDark, borderRadius: 1.2 },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fs(20),
    fontWeight: "800",
    color: C.textDark,
  },
  notificationBtn: {
    padding: 4,
    position: "relative",
  },
  notificationIcon: {
    width: s(24),
    height: s(24),
    tintColor: C.textDark,
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.red,
    borderWidth: 1.5,
    borderColor: C.navBg,
    zIndex: 10,
  },

  scroll: { flex: 1, paddingHorizontal: s(20), paddingTop: 12, paddingBottom: 100, zIndex: 1 },
  welcomeTitle: {
    fontSize: fs(22),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(4),
    marginTop: 6,
  },
  welcomeSub: {
    fontSize: fs(14),
    color: C.textMuted,
    lineHeight: fs(20),
    marginBottom: s(14),
  },
  bottomPad: { height: 110 },

  /* ✅ Member card */
  memberCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(32),
    padding: s(20),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: s(12),
    shadowColor: '#64748B',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  memberLeft: { flexDirection: "row", alignItems: "center", gap: s(14), flex: 1 },
  memberAvatar: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    backgroundColor: "rgba(46,107,240,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarIcon: { width: s(22), height: s(22), tintColor: C.blue },
  memberName: { fontSize: fs(17), fontWeight: "800", color: C.textDark },
  memberEmail: { fontSize: fs(13), color: C.textMuted, marginTop: 2, fontWeight: "500" },
  memberPill: {
    paddingHorizontal: s(12),
    paddingVertical: s(8),
    borderRadius: 999,
    backgroundColor: "rgba(52,199,89,0.1)",
    borderWidth: 1,
    borderColor: "rgba(52,199,89,0.15)",
  },
  memberPillText: { fontSize: fs(12), color: C.green, fontWeight: "800" },

  /* ✅ Stats Grid */
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: s(12),
    marginBottom: s(6),
  },
  statCard: {
    width: "48%",
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(24),
    padding: s(16),
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  statIconBg: {
    width: s(44),
    height: s(44),
    borderRadius: s(16),
    backgroundColor: "rgba(46,107,240,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(12),
  },
  statIcon: { width: s(22), height: s(22), tintColor: C.blue },

  cardLabel: { fontSize: fs(13), color: C.textMuted, marginBottom: s(4), fontWeight: "500" },
  cardValue: { fontSize: fs(22), fontWeight: "800", color: C.textDark, letterSpacing: -0.5 },
  cardDue: { fontSize: fs(12), color: C.red, marginTop: 2, fontWeight: "500" },

  section: { marginTop: s(22), marginBottom: 6 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: s(12),
  },
  sectionTitle: {
    fontSize: fs(20),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(12),
  },
  viewAllText: {
    fontSize: fs(13),
    color: C.blue,
    fontWeight: "700",
  },

  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: s(14),
  },
  quickActionCard: {
    width: "48%",
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(24),
    padding: s(18),
    position: "relative",
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    minHeight: s(138),
    justifyContent: "space-between",
  },
  quickActionIconBg: {
    width: s(48),
    height: s(48),
    borderRadius: s(18),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(14),
  },
  quickActionIcon: { width: s(24), height: 24 },
  quickActionTitle: {
    fontSize: fs(15),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(4),
  },
  quickActionSubtitle: {
    fontSize: fs(12),
    color: C.textMuted,
    marginBottom: s(8),
    lineHeight: fs(16),
    fontWeight: "500",
  },
  arrowCircle: {
    position: "absolute",
    bottom: 14,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: s(14),
    backgroundColor: C.arrowCircleBg,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: { fontSize: fs(16), color: C.blue, fontWeight: "800" },

  paymentCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(24),
    padding: s(18),
    marginBottom: s(14),
    flexDirection: "row",
    alignItems: "center",
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  paymentIconBg: {
    width: s(46),
    height: s(46),
    borderRadius: s(16),
    alignItems: "center",
    justifyContent: "center",
    marginRight: s(14),
  },
  paymentIcon: { width: s(22), height: 22 },
  paymentInfo: { flex: 1 },
  paymentId: {
    fontSize: fs(15),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 2,
  },
  paymentType: { fontSize: fs(13), color: C.textMuted, marginBottom: 2 },
  paymentDue: { fontSize: fs(12), color: C.red, fontWeight: "600" },
  paymentRight: { alignItems: "flex-end" },
  paymentAmount: {
    fontSize: fs(18),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(8),
  },
  payNowBtn: {
    backgroundColor: C.blue,
    borderRadius: s(12),
    paddingHorizontal: s(16),
    paddingVertical: 9,
  },
  payNowText: { fontSize: fs(13), fontWeight: "700", color: "#FFFFFF" },

  /* ✅ Activity in a card wrapper */
  activityWrap: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(24),
    paddingHorizontal: s(16),
    paddingVertical: s(8),
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  activityItem: {
    flexDirection: "row",
    paddingVertical: s(14),
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  activityIconBg: {
    width: s(44),
    height: s(44),
    borderRadius: s(16),
    alignItems: "center",
    justifyContent: "center",
    marginRight: s(14),
  },
  activityIcon: { width: s(22), height: 22 },
  activityContent: { flex: 1, justifyContent: "center" },
  activityTitle: {
    fontSize: fs(14),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(4),
  },
  activitySubtitle: { fontSize: fs(13), color: C.textMuted, marginBottom: 4 },
  activityTime: { fontSize: fs(12), color: C.textDimmed, fontWeight: "500" },

  chatBtn: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: s(52),
    height: s(52),
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
  chatIcon: { width: s(24), height: s(24), tintColor: "#FFFFFF" },

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.tabBg,
    borderTopWidth: 1,
    borderTopColor: "rgba(100,140,200,0.15)",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? s(22) : s(10),
    position: "relative",
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
  tabIcon: { width: s(26), height: 26 },
  tabLabel: { fontSize: 10 },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.overlay,
    zIndex: 998,
    elevation: 998,
  },

  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: C.bg,
    zIndex: 1000,
    elevation: 1000,
    flexDirection: "column",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
    paddingTop: Platform.OS === "ios" ? s(58) : s(44),
    paddingBottom: 22,
    paddingHorizontal: s(20),
  },
  sidebarLogo: { width: s(46), height: s(46), borderRadius: 45 },
  sidebarTitle: { fontSize: fs(18), fontWeight: "700", color: "#FFF" },
  sidebarRole: { fontSize: fs(12), color: "#FFF", marginTop: 1 },

  sidebarNav: { flex: 1, paddingHorizontal: 12 },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(14),
    paddingVertical: s(13),
    paddingHorizontal: s(14),
    borderRadius: s(12),
    marginBottom: s(6),
  },
  sidebarItemActive: { backgroundColor: "rgba(46,107,240,0.1)" },
  sidebarIcon: { width: s(20), height: 20 },
  sidebarItemText: { fontSize: fs(15), color: C.textMuted, fontWeight: "600" },
  sidebarItemTextActive: { color: C.blue },

  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingHorizontal: s(18),
    paddingTop: s(16),
    paddingBottom: Platform.OS === "ios" ? s(34) : s(18),
  },
  sidebarUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
    marginBottom: s(16),
  },
  sidebarAvatar: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: "rgba(31, 102, 255, 0.93)",
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarAvatarIcon: { width: s(18), height: s(18), tintColor: "#FFFFFF" },
  sidebarUserName: { fontSize: fs(14), fontWeight: "700", color: "#FFF" },
  sidebarUserEmail: {
    fontSize: fs(11),
    color: C.textMuted,
    marginTop: 1,
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
    paddingVertical: 6,
  },
  signOutIcon: { width: 30, height: s(40), tintColor: C.red },
  signOutText: { fontSize: fs(14), color: C.red, fontWeight: "700" },

  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH / 5,
    height: s(3),
    backgroundColor: C.tabActive,
  },

  // Sign Out Confirmation Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: s(24),
  },
  confirmDialog: {
    backgroundColor: C.cardBg,
    borderRadius: s(20),
    padding: s(28),
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
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(20),
  },
  confirmIcon: {
    width: 32,
    height: 32,
    tintColor: C.red,
  },
  confirmTitle: {
    fontSize: fs(22),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(12),
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: fs(15),
    color: C.textMuted,
    textAlign: "center",
    lineHeight: fs(22),
    marginBottom: 28,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: s(12),
    width: "100%",
  },
  confirmBtnCancel: {
    flex: 1,
    backgroundColor: C.secondaryBtnBg,
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnCancelText: {
    fontSize: fs(15),
    fontWeight: "700",
    color: C.textDark,
  },
  confirmBtnSignOut: {
    flex: 1,
    backgroundColor: C.red,
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnSignOutText: {
    fontSize: fs(15),
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Verification banner
  verifBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: s(14),
    padding: s(16),
    marginHorizontal: s(20),
    marginTop: s(12),
  },
  verifTitle: {
    fontSize: fs(14),
    fontWeight: "700",
    marginBottom: s(4),
  },
  verifSub: {
    fontSize: fs(12),
    color: "#647485",
    lineHeight: 17,
  },

  // Mobile feature cards
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: s(18),
    borderRadius: s(24),
    borderWidth: 1,
    gap: s(16),
    shadowColor: '#64748B',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  featureIconBox: {
    width: s(48),
    height: s(48),
    borderRadius: s(16),
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: fs(16),
    fontWeight: "700",
    marginBottom: s(4),
  },
  featureSubtitle: {
    fontSize: fs(13),
  },

  // My Loan Hub
  loanHubCard: {
    width: "100%", borderRadius: s(28), marginBottom: s(4),
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 8
  },
  loanHubHeader: { flexDirection: "row", alignItems: "center", gap: s(10), paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)" },
  loanHubTitle: { color: "#FFF", fontSize: fs(15), fontWeight: "800" },
  loanHubBody: { flexDirection: "row", paddingTop: 6, paddingBottom: 0, alignItems: "center" },
  loanHubLabel: { color: "rgba(255,255,255,0.7)", fontSize: fs(13), marginBottom: s(4), textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5, textAlign: "left" },
  loanHubValue: { color: "#FFF", fontSize: fs(22), fontWeight: "800", letterSpacing: -0.5, textAlign: "left" },
  loanHubDivider: { width: 1, height: s(40), backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 12 },
  loanHubFooter: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" },
  loanHubFooterText: { color: "rgba(255,255,255,0.7)", fontSize: fs(13), fontWeight: "600" },

  // Church Events Carousel
  carouselCard: {
    borderRadius: s(20),
    borderWidth: 1,
    marginRight: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    overflow: "hidden",
  },
  carouselCategoryPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(46,107,240,0.1)",
    paddingVertical: 4,
    paddingHorizontal: s(12),
    borderRadius: 6,
    marginBottom: s(10),
  },
  carouselCategoryText: {
    fontSize: fs(10),
    fontWeight: "700",
    color: C.blue,
    letterSpacing: 0.5,
  },
  carouselImageWrap: {
    width: "100%",
    height: 160,
    backgroundColor: "rgba(46,107,240,0.05)",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
});

