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
import { SkeletonMemberCard, SkeletonCard, SkeletonQuickAction } from "../components/SkeletonLoader";
import { useToast } from "../components/ToastContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getVerificationStatus, getProfile, getAnnouncements, getDonations, getSavingsData } from "../services/AuthService";
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
  {
    title: "My Savings",
    subtitle: "Goals & deposits",
    icon: ICONS.wallet,
    bgColor: "rgba(52,199,89,0.1)",
    iconColor: "#34C759",
    screen: "Savings",
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

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const paramEmail = route?.params?.email;
        if (paramEmail) {
          if (mounted) setUserEmail(paramEmail);

          // Save for other screens, and also read cached role/name
          const old = await AsyncStorage.getItem("faithly_user");
          const parsed = old ? JSON.parse(old) : {};
          await AsyncStorage.setItem(
            "faithly_user",
            JSON.stringify({ ...parsed, email: paramEmail }),
          );

          // Load cached role + name so the UI renders correctly immediately
          if (mounted) {
            if (parsed.role) setUserRole(parsed.role);
            if (parsed.position) setUserPosition(parsed.position);
            if (parsed.firstName || parsed.lastName) {
              setUserName(`${parsed.firstName || ''} ${parsed.lastName || ''}`.trim());
            }
          }
          return;
        }

        // Load saved email if params missing
        const saved = await AsyncStorage.getItem("faithly_user");

        if (saved) {
          const parsed = JSON.parse(saved);

          if (mounted) {
            setUserEmail(parsed.email || "");
            if (parsed.firstName || parsed.lastName) {
              setUserName(`${parsed.firstName || ''} ${parsed.lastName || ''}`.trim());
            }
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
  const slideX = useRef(new Animated.Value(-260)).current;
  const indicatorPosition = useRef(new Animated.Value(0)).current;

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

  // Re-fetch user name + role every time screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!userEmail) return;
      (async () => {
        try {
          // Run both calls in parallel — getProfile is the reliable name source
          const [profileResult, verifResult] = await Promise.allSettled([
            getProfile(),
            getVerificationStatus(userEmail),
          ]);

          // ── Name: prefer getProfile (/api/me) ──────────────────────────
          const profileUser = profileResult.status === "fulfilled" ? profileResult.value?.user : null;
          if (profileUser?.firstName || profileUser?.lastName) {
            setUserName(`${profileUser.firstName || ''} ${profileUser.lastName || ''}`.trim());
          } else if (profileUser?.fullName) {
            setUserName(profileUser.fullName);
          }

          // ── Role / Position: prefer verification status ─────────────────
          const verifData = verifResult.status === "fulfilled" ? verifResult.value : null;
          if (verifData?.role) setUserRole(verifData.role);
          if (verifData?.position) setUserPosition(verifData.position);

          // If verif had name but profile didn't, use verif name as fallback
          if (!profileUser?.firstName && !profileUser?.lastName && !profileUser?.fullName) {
            if (verifData?.firstName || verifData?.lastName) {
              setUserName(`${verifData.firstName || ''} ${verifData.lastName || ''}`.trim());
            } else if (verifData?.fullName) {
              setUserName(verifData.fullName);
            }
          }

          // Cache everything for other screens / offline use
          const cached = await AsyncStorage.getItem("faithly_user");
          const parsed = cached ? JSON.parse(cached) : {};
          await AsyncStorage.setItem("faithly_user", JSON.stringify({
            ...parsed,
            role: verifData?.role || profileUser?.role || parsed.role || "member",
            position: verifData?.position || profileUser?.position || parsed.position || "",
            firstName: profileUser?.firstName || verifData?.firstName || parsed.firstName || "",
            lastName: profileUser?.lastName || verifData?.lastName || parsed.lastName || "",
            fullName: profileUser?.fullName || parsed.fullName || "",
          }));
        } catch {
          // Full failure — fall back to cached data
          try {
            const cached = await AsyncStorage.getItem("faithly_user");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.role) setUserRole(parsed.role);
              if (parsed.position) setUserPosition(parsed.position);
              if (parsed.firstName || parsed.lastName) {
                setUserName(`${parsed.firstName || ''} ${parsed.lastName || ''}`.trim());
              } else if (parsed.fullName) {
                setUserName(parsed.fullName);
              }
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

            // Grab top 3 for Recent Activity
            const recent = notifs.slice(0, 3).map(n => {
              let icon, iconBg, iconColor;
              switch (n.category) {
                case "transaction":
                  icon = ICONS.heart; iconColor = C.green; iconBg = C.greenLight; break;
                case "announcement":
                  icon = ICONS.branches; iconColor = C.purple; iconBg = C.purpleLight; break;
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
                iconColor
              };
            });
            setRecentActivity(recent);
          } else {
            setNotificationCount(0);
            setRecentActivity([]);
          }
        } catch (e) {
          console.error("Home Notification Error", e);
        }
      };
      checkUnreadAndActivity();
    }, [userEmail])
  );

  // Load live stats from AsyncStorage
  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        if (!userEmail) return;
        try {
          // Loans
          const savedLoans = await AsyncStorage.getItem(`faithly_loans_${userEmail}`);
          if (savedLoans) {
            const loans = JSON.parse(savedLoans);
            const active = loans.filter(l => l.status?.toLowerCase() === "active");
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
          } else {
            setActiveLoans(0);
            setRemainingBalance(0);
            setNextPaymentDate("");
          }

          // Donations + Savings in parallel (was sequential — this cuts load time in half)
          const [donationResult, savingsResult] = await Promise.allSettled([
            getDonations(),
            getSavingsData(),
          ]);

          // Process donations
          if (donationResult.status === "fulfilled") {
            const sd = donationResult.value;
            const donations = Array.isArray(sd) ? sd : (sd?.donations || []);
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
              let total = 0;
              donations.forEach(d => {
                total += parseFloat(String(d.amount || "0").replace(/[^0-9.-]+/g, "")) || 0;
              });
              setTotalDonated(total);
            }
          }

          // Process savings
          if (savingsResult.status === "fulfilled") {
            const sv = savingsResult.value;
            const savingsArr = Array.isArray(sv) ? sv : (sv?.savings || []);
            let total = 0;
            savingsArr.forEach(d => { total += parseFloat(d.amount) || 0; });
            setTotalSavings(total);
            await AsyncStorage.setItem(`faithly_savings_${userEmail}`, JSON.stringify(savingsArr));
          } else {
            console.log("Failed to load savings from server, using cache", savingsResult.reason);
            const savedSavings = await AsyncStorage.getItem(`faithly_savings_${userEmail}`);
            if (savedSavings) {
              const savingsArr = JSON.parse(savedSavings);
              let total = 0;
              savingsArr.forEach(d => { total += parseFloat(d.amount) || 0; });
              setTotalSavings(total);
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
      toValue: -260,
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

        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: 36, height: 36 }} resizeMode="contain" /></View>

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
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
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
            <Animated.View style={{ height: 150, marginBottom: 4, width: "100%", opacity: cardAnims[0].opacity, transform: [{ translateY: cardAnims[0].translateY }] }}>
              {/* FRONT: PRIVACY STATE */}
              <Animated.View 
                pointerEvents={isLoanHidden ? "none" : "auto"} 
                style={[styles.loanHubCard, { position: "absolute", top: 0, left: 0, right: 0, height: "100%", backfaceVisibility: "hidden", backgroundColor: colors.cardBg, borderColor: "rgba(13,31,69,0.15)", borderWidth: 1, padding: 0, transform: [{ rotateY: frontInterpolate }], overflow: "hidden" }]}
              >
                <TouchableOpacity activeOpacity={0.8} onPress={toggleLoanPrivacy} style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(13,31,69,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Image source={ICONS.document} style={{ width: 24, height: 24, tintColor: C.blue }} resizeMode="contain" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: C.textDark, marginBottom: 4 }}> Loan Status Update</Text>
                  <Text style={{ fontSize: 13, color: C.textMuted }}>Tap to reveal details</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* BACK: DATA STATE */}
              <Animated.View 
                pointerEvents={!isLoanHidden ? "none" : "auto"} 
                style={[styles.loanHubCard, { position: "absolute", top: 0, left: 0, right: 0, height: "100%", backfaceVisibility: "hidden", backgroundColor: C.blue, transform: [{ rotateY: backInterpolate }], padding: 0, overflow: "hidden" }]}
              >
                <TouchableOpacity activeOpacity={0.9} onPress={toggleLoanPrivacy} style={{ flex: 1, padding: 16 }}>
                  <View style={styles.loanHubHeader}>
                    <Image source={ICONS.document} style={{ width: 18, height: 26, tintColor: "#FFF" }} resizeMode="contain" />
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
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}> | Status: <Text style={{ color: "#FFF", fontWeight: "700" }}>Pending</Text></Text>
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            </>
          )}

            {/* Savings Card — visible to ALL roles */}
            <Animated.View style={{ height: 90, width: "100%", marginBottom: 14, opacity: cardAnims[2].opacity, transform: [{ translateY: cardAnims[2].translateY }] }}>
              {/* FRONT: PRIVACY STATE */}
              <Animated.View pointerEvents={isSavingsHidden ? "none" : "auto"} style={[styles.statCard, { position: "absolute", top: 0, left: 0, right: 0, height: "100%", width: "100%", padding: 0, backfaceVisibility: "hidden", transform: [{ rotateY: savingsFrontInt }] }]}>
                <TouchableOpacity activeOpacity={0.8} onPress={toggleSavingsPrivacy} style={{ flex: 1, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <View style={[styles.statIconBg, { marginBottom: 0, marginRight: 12, backgroundColor: "rgba(52,199,89,0.1)" }]}>
                    <Image source={ICONS.wallet} style={[styles.statIcon, { tintColor: "#34C759" }]} resizeMode="contain" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textDark }}>My Savings</Text>
                </TouchableOpacity>
              </Animated.View>
              {/* BACK: DATA STATE */}
              <Animated.View pointerEvents={!isSavingsHidden ? "none" : "auto"} style={[styles.statCard, { position: "absolute", top: 0, left: 0, right: 0, height: "100%", width: "100%", padding: 0, backfaceVisibility: "hidden", transform: [{ rotateY: savingsBackInt }] }]}>
                <TouchableOpacity activeOpacity={0.7} onPress={toggleSavingsPrivacy} style={{ flex: 1, padding: 14, flexDirection: "row", alignItems: "center" }}>
                  <View style={[styles.statIconBg, { marginBottom: 0, marginRight: 16 }]}>
                    <Image source={ICONS.wallet} style={[styles.statIcon, { tintColor: "#34C759" }]} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardLabel, { color: colors.textMuted, marginBottom: 2 }]}>My Savings</Text>
                    <Text style={[styles.cardValue, { color: colors.textDark, fontSize: 24 }]}>₱{totalSavings.toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => navWithEmail("Savings")} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={[styles.arrowText, { top: -1 }]}>→</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14, width: "100%" }}>
            {/* Attendance Card */}
              <Animated.View style={{ height: 130, width: "48%", opacity: cardAnims[3].opacity, transform: [{ translateY: cardAnims[3].translateY }] }}>
                {/* FRONT: PRIVACY STATE */}
                <Animated.View pointerEvents={isAttendanceHidden ? "none" : "auto"} style={[styles.statCard, { position: "absolute", top: 0, left: 0, right: 0, width: "100%", height: "100%", backfaceVisibility: "hidden", transform: [{ rotateY: attendanceFrontInt }] }]}>
                  <TouchableOpacity activeOpacity={0.8} onPress={toggleAttendancePrivacy} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <View style={styles.statIconBg}>
                      <Image source={ICONS.attendance} style={styles.statIcon} resizeMode="contain" />
                    </View>
                    <Text style={[styles.cardLabel, { textAlign: "center" }]}>Attendance</Text>
                  </TouchableOpacity>
                </Animated.View>
                {/* BACK: DATA STATE */}
                <Animated.View pointerEvents={!isAttendanceHidden ? "none" : "auto"} style={[styles.statCard, { position: "absolute", top: 0, left: 0, right: 0, width: "100%", height: "100%", backfaceVisibility: "hidden", transform: [{ rotateY: attendanceBackInt }] }]}>
                  <TouchableOpacity activeOpacity={0.8} onPress={toggleAttendancePrivacy} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <View style={styles.statIconBg}>
                      <Image source={ICONS.attendance} style={styles.statIcon} resizeMode="contain" />
                    </View>
                    <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Attendance Checks</Text>
                    <Text style={[styles.cardValue, { color: colors.textDark }]}>{attendanceCount}</Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

              {/* Donations Card */}
              <Animated.View style={{ height: 130, width: "48%", opacity: cardAnims[4].opacity, transform: [{ translateY: cardAnims[4].translateY }] }}>
                {/* FRONT: PRIVACY STATE */}
                <Animated.View pointerEvents={isDonationsHidden ? "none" : "auto"} style={[styles.statCard, { position: "absolute", top: 0, left: 0, right: 0, width: "100%", height: "100%", backfaceVisibility: "hidden", transform: [{ rotateY: donationsFrontInt }] }]}>
                  <TouchableOpacity activeOpacity={0.8} onPress={toggleDonationsPrivacy} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <View style={[styles.statIconBg, { backgroundColor: "rgba(52,199,89,0.1)" }]}>
                      <Image source={ICONS.heart} style={[styles.statIcon, { tintColor: "#34C759" }]} resizeMode="contain" />
                    </View>
                    <Text style={[styles.cardLabel, { textAlign: "center" }]}>Donations</Text>
                  </TouchableOpacity>
                </Animated.View>
                {/* BACK: DATA STATE */}
                <Animated.View pointerEvents={!isDonationsHidden ? "none" : "auto"} style={[styles.statCard, { position: "absolute", top: 0, left: 0, right: 0, width: "100%", height: "100%", backfaceVisibility: "hidden", transform: [{ rotateY: donationsBackInt }] }]}>
                  <TouchableOpacity activeOpacity={0.8} onPress={toggleDonationsPrivacy} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <View style={[styles.statIconBg, { backgroundColor: "rgba(52,199,89,0.1)" }]}>
                      <Image source={ICONS.heart} style={[styles.statIcon, { tintColor: "#34C759" }]} resizeMode="contain" />
                    </View>
                    <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Total Donated</Text>
                    <Text style={[styles.cardValue, { color: colors.textDark }]}>₱{totalDonated.toLocaleString()}</Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            </View>
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
                style={{ width: "48%", opacity: qaAnims[idx].opacity, transform: [{ translateY: qaAnims[idx].translateY }] }}
              >
              <TouchableOpacity
                style={[styles.quickActionCard, { width: "100%", backgroundColor: colors.cardBg }]}
                activeOpacity={0.75}
                onPress={() => {
                  if (action.screen) {
                    navigation.replace(action.screen, { email: userEmail });
                  } else {
                    setChatbotOpen(true);
                  }
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
                <Text style={[styles.quickActionTitle, { color: colors.textDark }]}>{action.title}</Text>
                <Text style={[styles.quickActionSubtitle, { color: colors.textMuted }]}>
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
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingHorizontal: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 0 }]}>Announcements</Text>
                  <View style={{ backgroundColor: C.red, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700" }}>{visibleAnns.length}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("Announcements", { email: userEmail })} activeOpacity={0.6}>
                  <Text style={{ color: C.blue, fontSize: 13, fontWeight: "600" }}>See all →</Text>
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

                      <View style={{ padding: 18, paddingTop: ann.image ? 14 : 18 }}>
                        {/* Category Pill */}
                        <View style={styles.carouselCategoryPill}>
                          <Text style={styles.carouselCategoryText} numberOfLines={1}>
                            {(ann.category || "General").toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "column" }}>
                          {dateInfo.day ? (
                            <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 4, gap: 5 }}>
                              <Text style={{ fontSize: 30, fontWeight: "800", color: colors.textDark }}>{dateInfo.day}</Text>
                              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted }}>{dateInfo.month}</Text>
                            </View>
                          ) : null}
                          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textDark, marginBottom: 4 }} numberOfLines={1}>{ann.title}</Text>
                          <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: 10 }} numberOfLines={3}>
                            {ann.description || ann.message}
                          </Text>
                          {/* Location & Time */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            {ann.location ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text style={{ fontSize: 12, color: colors.textMuted }}>📍</Text>
                                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "500" }}>{ann.location}</Text>
                              </View>
                            ) : null}
                            {ann.time ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text style={{ fontSize: 12, color: colors.textMuted }}>🕐</Text>
                                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "500" }}>{ann.time}</Text>
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
                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 12, gap: 6 }}>
                  {visibleAnns.map((_, i) => (
                    <View key={i} style={{ width: carouselIndex === i ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: carouselIndex === i ? C.blue : "rgba(46,107,240,0.2)" }} />
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
                <Image source={ICONS.clock} style={{ width: 32, height: 32, tintColor: colors.textMuted, marginBottom: 10, opacity: 0.5 }} resizeMode="contain" />
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textDark, marginBottom: 4 }}>No Recent Activity</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: "center", paddingHorizontal: 20 }}>Your recent transactions and activities will appear here.</Text>
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
                <Image source={ICONS.notification} style={{ width: 22, height: 22, tintColor: "#0D1F45" }} resizeMode="contain" />
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
                <Image source={ICONS.heart} style={{ width: 22, height: 22, tintColor: "#AF52DE" }} resizeMode="contain" />
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

      {/* Bottom tab bar with VISIBLE animations */}
      <View style={[styles.tabBar, { backgroundColor: colors.tabBg }]}>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              width: TAB_WIDTH,
              transform: [{ translateX: indicatorPosition }],
            },
          ]}
        />

        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          const allIndex = ALL_TAB_ITEMS.findIndex(t => t.key === tab.key);
          const visibleIndex = TAB_ITEMS.findIndex(t => t.key === tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key === "Home") return;
                navWithEmail(tab.key); // pass email always
              }}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  styles.tabBgCircle,
                  {
                    opacity: tabAnimations[allIndex].bgOpacity,
                  },
                ]}
              />

              <Animated.View
                style={{ transform: [{ scale: tabAnimations[allIndex].scale }] }}
              >
                <Image
                  source={tab.icon}
                  style={[
                    styles.tabIcon,
                    {
                      tintColor: isActive ? colors.tabActive : colors.tabInactive,

                      opacity: isActive ? 1 : 0.6,
                    },
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.tabActive : colors.tabInactive,

                    fontWeight: isActive ? "700" : "500",
                    fontSize: isActive ? 11 : 10,
                    opacity: isActive ? 1 : 0.7,
                  },
                ]}
              >
                {tab.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 56 : 42,
    paddingBottom: 14,
    zIndex: 1,
  },
  hamburgerBtn: { padding: 4, justifyContent: "center", gap: 5 },
  hLine: { width: 25, height: 3, backgroundColor: C.textDark, borderRadius: 1.2 },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: C.textDark,
  },
  notificationBtn: {
    padding: 4,
    position: "relative",
  },
  notificationIcon: {
    width: 24,
    height: 24,
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

  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, zIndex: 1 },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 4,
    marginTop: 6,
  },
  welcomeSub: {
    fontSize: 14.5,
    color: C.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  bottomPad: { height: 32 },

  /* ✅ Member card */
  memberCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 32,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: '#64748B',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  memberLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(46,107,240,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarIcon: { width: 22, height: 22, tintColor: C.blue },
  memberName: { fontSize: 17, fontWeight: "800", color: C.textDark },
  memberEmail: { fontSize: 13, color: C.textMuted, marginTop: 2, fontWeight: "500" },
  memberPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(52,199,89,0.1)",
    borderWidth: 1,
    borderColor: "rgba(52,199,89,0.15)",
  },
  memberPillText: { fontSize: 12, color: C.green, fontWeight: "800" },

  /* ✅ Stats Grid */
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 6,
  },
  statCard: {
    width: "48%",
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(46,107,240,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statIcon: { width: 22, height: 22, tintColor: C.blue },

  cardLabel: { fontSize: 13, color: C.textMuted, marginBottom: 4, fontWeight: "500" },
  cardValue: { fontSize: 22, fontWeight: "800", color: C.textDark, letterSpacing: -0.5 },
  cardDue: { fontSize: 12, color: C.red, marginTop: 2, fontWeight: "500" },

  section: { marginTop: 22, marginBottom: 6 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13.5,
    color: C.blue,
    fontWeight: "700",
  },

  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  quickActionCard: {
    width: "48%",
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 24,
    padding: 18,
    position: "relative",
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  quickActionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  quickActionIcon: { width: 24, height: 24 },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 8,
    lineHeight: 16,
    fontWeight: "500",
  },
  arrowCircle: {
    position: "absolute",
    bottom: 14,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: { fontSize: 16, color: C.blue, fontWeight: "800" },

  paymentCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: '#64748B',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  paymentIconBg: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  paymentIcon: { width: 22, height: 22 },
  paymentInfo: { flex: 1 },
  paymentId: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 2,
  },
  paymentType: { fontSize: 13, color: C.textMuted, marginBottom: 2 },
  paymentDue: { fontSize: 12, color: C.red, fontWeight: "600" },
  paymentRight: { alignItems: "flex-end" },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 8,
  },
  payNowBtn: {
    backgroundColor: C.blue,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  payNowText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  /* ✅ Activity in a card wrapper */
  activityWrap: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  activityItem: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  activityIconBg: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  activityIcon: { width: 22, height: 22 },
  activityContent: { flex: 1, justifyContent: "center" },
  activityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 4,
  },
  activitySubtitle: { fontSize: 13, color: C.textMuted, marginBottom: 4 },
  activityTime: { fontSize: 12, color: C.textDimmed, fontWeight: "500" },

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

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.tabBg,
    borderTopWidth: 1,
    borderTopColor: "rgba(100,140,200,0.15)",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
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
  tabIcon: { width: 26, height: 26 },
  tabLabel: { fontSize: 10 },

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
    backgroundColor: C.bg,
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
  sidebarUserName: { fontSize: 14, fontWeight: "700", color: "#FFF" },
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
  signOutText: { fontSize: 14, color: C.red, fontWeight: "700" },

  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH / 5,
    height: 3,
    backgroundColor: C.tabActive,
  },

  // Sign Out Confirmation Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmDialog: {
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F0F2F5",
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

  // Verification banner
  verifBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
  },
  verifTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  verifSub: {
    fontSize: 12,
    color: "#647485",
    lineHeight: 17,
  },

  // Mobile feature cards
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    shadowColor: '#64748B',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 13.5,
  },

  // My Loan Hub
  loanHubCard: {
    width: "100%", borderRadius: 28, marginBottom: 4,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 8
  },
  loanHubHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)" },
  loanHubTitle: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  loanHubBody: { flexDirection: "row", paddingTop: 6, paddingBottom: 0, alignItems: "center" },
  loanHubLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4, textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.5, textAlign: "left" },
  loanHubValue: { color: "#FFF", fontSize: 22, fontWeight: "800", letterSpacing: -0.5, textAlign: "left" },
  loanHubDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 12 },
  loanHubFooter: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" },
  loanHubFooterText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" },

  // Church Events Carousel
  carouselCard: {
    borderRadius: 20,
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
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  carouselCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D1F45",
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

