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
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import FloatingNavBar from "../components/FloatingNavBar";
import { addNotification } from "./NotificationsScreen";
import { SkeletonStatCard } from "../components/SkeletonLoader";
import OfflineBanner from "../components/OfflineBanner";
import { useTheme } from "../components/ThemeContext";
import ReceiptModal from "../components/ReceiptModal";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ExpoLinking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import Svg, { G, Circle } from "react-native-svg";
import { createDonation, getPublicSettings, getDonations, getBranches, verifyReceiptImage } from "../services/AuthService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));
const SIDEBAR_WIDTH = s(260);

const LOGO = require("../assets/puac_logo.png");
const GCASH_QR = require("../assets/gcash_qr.jpg");

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
  gcash: require("../assets/icons/gcash.png"),
  bank: require("../assets/icons/bank.png"),
  camera: require("../assets/icons/camera.png"),
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


const SIDEBAR_ITEMS = [
  { key: "Announcements", icon: ICONS.notification },
  { key: "Savings", icon: ICONS.wallet },
  { key: "Profile", icon: ICONS.profile },
  { key: "Settings", icon: ICONS.settings },
];

const QUICK_AMOUNTS = [25, 50, 100, 250];

const DONATION_CATEGORIES = [
  "General Fund",
  "Mission Fund",
  "Children Ministry",
  "Youth Ministry",
  "Men's Ministry",
  "Women's Ministry",
];

// Initial empty state (populated from API)
const INITIAL_DONATION_BRANCHES = [];

const DONATION_HISTORY = [];

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export default function DonationsScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [activeTab, setActiveTab] = useState("Donations");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [searchBranchQuery, setSearchBranchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("gcash");
  const [isRecurring, setIsRecurring] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [proofImage, setProofImage] = useState(null);
  const [receiptVerification, setReceiptVerification] = useState(null); // { valid, provider, reason, verifying }
  
  const [donationHistory, setDonationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [summaryFilter, setSummaryFilter] = useState("This Year");
  const [summaryDropdownOpen, setSummaryDropdownOpen] = useState(false);
  const [showAllLegendCategories, setShowAllLegendCategories] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [donorAcknowledged, setDonorAcknowledged] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const [paymentApprovalMethod, setPaymentApprovalMethod] = useState("manual");
  const [subMethod, setSubMethod] = useState("GCash");
  const [subMethodDropdownOpen, setSubMethodDropdownOpen] = useState(false);
  const [dynamicBranches, setDynamicBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [autoFilledFields, setAutoFilledFields] = useState([]);
  const [isAnotherAccount, setIsAnotherAccount] = useState(false);
  const [userFullName, setUserFullName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userBranch, setUserBranch] = useState(""); // user's default branch from profile
  const [autoFilledInfo, setAutoFilledInfo] = useState(null); // { amount, method, referenceNumber, provider, senderName, senderNumber }

  const handleReceiptSelected = async (asset) => {
    if (!asset) return;
    let base64 = asset.base64;
    if (!base64 && asset.uri) {
      try {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: "base64",
        });
      } catch (fsErr) {
        console.log("Could not read donation photo as base64 fallback:", fsErr);
      }
    }
    setProofImage({ uri: asset.uri, base64: base64 || "" });
    setFormError("");
    setAutoFilledInfo(null);
    setAutoFilledFields([]);

    if (base64) {
      setReceiptVerification({ verifying: true, valid: false, provider: null, reason: "" });
      try {
        const mime = asset.mimeType || "image/jpeg";
        const verdict = await verifyReceiptImage(base64, mime, selectedPayment);
        setReceiptVerification({ ...verdict, verifying: false });

        if (verdict.valid && verdict.isReceipt) {
          let filledCount = 0;
          const newAutoFilled = [];

          // 1. Auto-fill Amount
          if (verdict.amount && Number(verdict.amount) > 0) {
            const num = Number(verdict.amount);
            const formatted = String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            setDonationAmount(formatted);
            if (QUICK_AMOUNTS.includes(num)) {
              setSelectedAmount(num);
            } else {
              setSelectedAmount(null);
            }
            newAutoFilled.push("amount");
            filledCount++;
          }

          // 2. Auto-fill Reference Number
          if (verdict.referenceNumber) {
            setReferenceNumber(String(verdict.referenceNumber).replace(/[\s-]/g, ""));
            newAutoFilled.push("referenceNumber");
            filledCount++;
          }

          // 3. Auto-switch Payment Method & Sub-method
          const rawSub = verdict.subMethod || verdict.provider || "";
          const isEWallet = ["GCash", "Maya", "GrabPay", "ShopeePay", "Coins.ph"].some(
            (ew) => rawSub.toLowerCase().includes(ew.toLowerCase())
          ) || verdict.paymentMethod === "gcash" || verdict.paymentMethod === "E-Wallet";

          if (isEWallet) {
            setSelectedPayment("gcash");
            newAutoFilled.push("paymentMethod");
            if (rawSub.toLowerCase().includes("maya")) {
              setSubMethod("Maya");
            } else {
              setSubMethod("GCash");
            }
            newAutoFilled.push("subMethod");
            filledCount++;
          } else if (verdict.paymentMethod === "bank" || verdict.paymentMethod === "Bank" || rawSub) {
            setSelectedPayment("bank");
            newAutoFilled.push("paymentMethod");
            const knownBanks = ["BDO", "BPI", "Metrobank", "Unionbank", "PNB", "RCBC", "Instapay"];
            const matchedBank = knownBanks.find(b => rawSub.toLowerCase().includes(b.toLowerCase()));
            setSubMethod(matchedBank || "BDO");
            newAutoFilled.push("subMethod");
            filledCount++;
          }

          // 4. Auto-fill Sender Name
          if (verdict.senderName) {
            setAccountName(verdict.senderName);
            setIsAnotherAccount(true);
            newAutoFilled.push("accountName");
            filledCount++;
          }

          // 5. Auto-fill Sender Number (Phone or Bank account)
          if (verdict.senderNumber) {
            const cleanDigits = String(verdict.senderNumber).replace(/\D/g, "");
            setAccountNumber(cleanDigits);
            setIsAnotherAccount(true);
            newAutoFilled.push("accountNumber");
            filledCount++;
          }

          setAutoFilledFields(newAutoFilled);

          if (filledCount > 0) {
            setAutoFilledInfo({
              amount: verdict.amount,
              method: isEWallet ? "gcash" : "bank",
              referenceNumber: verdict.referenceNumber,
              provider: rawSub || (isEWallet ? "GCash" : "Bank"),
              senderName: verdict.senderName,
              senderNumber: verdict.senderNumber,
            });
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (_) {}
          }
        } else {
          // STRICT REJECTION: Invalid or non-receipt image
          setProofImage(null);
          setAutoFilledInfo(null);
          setAutoFilledFields([]);
          setReceiptVerification({ verifying: false, valid: false, provider: null, reason: verdict.reason });
          setFormError(verdict.reason || "Invalid proof of payment. Please upload a real receipt or transaction screenshot.");
          Alert.alert(
            "Invalid Receipt",
            verdict.reason || "The uploaded image is not a valid payment receipt. Please upload a clear screenshot of your transaction proof.",
            [{ text: "OK" }]
          );
        }
      } catch (err) {
        console.log("Error in receipt verification:", err);
        setProofImage(null);
        setAutoFilledInfo(null);
        setAutoFilledFields([]);
        setReceiptVerification({
          valid: false,
          verifying: false,
          provider: null,
          reason: "Unable to verify receipt. Please check your internet connection.",
        });
        setFormError("Unable to verify receipt. Please check your internet connection and try again.");
      }
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setFormError("Camera permission is required to take a photo of your receipt.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        await handleReceiptSelected(result.assets[0]);
      }
    } catch (err) {
      console.log("Error launching camera:", err);
    }
  };

  const handleGalleryPick = async () => {
    try {
      try {
        const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (!perm.granted && perm.canAskAgain) {
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        }
      } catch (_) {}

      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: false,
        mediaTypes: ["images"],
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        await handleReceiptSelected(result.assets[0]);
      }
    } catch (err) {
      console.log("Error launching gallery:", err);
    }
  };


  // Fetch branches on mount
  useEffect(() => {
    let mounted = true;
    getBranches().then(res => {
      if (mounted && res?.success) {
        setDynamicBranches(res.branches);
      }
    }).finally(() => {
      if (mounted) setLoadingBranches(false);
    });
    return () => { mounted = false; };
  }, []);

  // Group branches by province
  const groupedBranches = useMemo(() => {
    const groups = {};
    dynamicBranches.forEach(b => {
      const p = b.province || "Other";
      if (!groups[p]) groups[p] = [];
      groups[p].push(b);
    });
    return groups;
  }, [dynamicBranches]);

  // Derived from donationHistory - no separate state needed
  const filteredAmount = useMemo(() => {
    let total = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - 6);

    donationHistory.forEach(d => {
      if (!d.rawDate || (d.status || '').toLowerCase() !== 'confirmed') return;
      const dDate = new Date(d.rawDate);
      if (isNaN(dDate.getTime())) return;
      const amt = d.rawAmount || 0;
      if (summaryFilter === 'This Year') {
        if (dDate.getFullYear() === currentYear) total += amt;
      } else if (summaryFilter === 'This Month') {
        if (dDate.getFullYear() === currentYear && dDate.getMonth() === currentMonth) total += amt;
      } else if (summaryFilter === 'Last 7 Days') {
        if (dDate.getTime() >= startOfWeek.getTime()) total += amt;
      }
    });
    return total;
  }, [donationHistory, summaryFilter]);


  const categoryData = useMemo(() => {
    const totals = {};
    let totalAmt = 0;
    donationHistory.forEach(d => {
      if ((d.status || '').toLowerCase() !== 'confirmed') return;
      const amt = d.rawAmount || 0;
      const cat = d.fund || 'General';
      if (amt > 0) {
        totals[cat] = (totals[cat] || 0) + amt;
        totalAmt += amt;
      }
    });
    if (totalAmt === 0) return { total: 0, slices: [] };
    const ROW_COLORS = ['#0D1F45', '#2E6BF0', '#F5A623', '#1B9CFC', '#0A3D62', '#48DBFB', '#D4AC0D', '#3742FA', '#6AB0DE', '#E1B12C'];
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return {
      total: totalAmt,
      slices: sorted.map((item, idx) => ({
        name: item[0],
        amount: item[1],
        percentage: (item[1] / totalAmt) * 100,
        color: ROW_COLORS[idx % ROW_COLORS.length],
      }))
    };
  }, [donationHistory]);

  // totalDonated and yearDonated derived from donationHistory - no separate loop needed
  const totalDonated = useMemo(() => {
    return donationHistory
      .filter(d => (d.status || '').toLowerCase() === 'confirmed')
      .reduce((sum, d) => sum + (d.rawAmount || 0), 0);
  }, [donationHistory]);

  const yearDonated = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return donationHistory
      .filter(d => {
        if ((d.status || '').toLowerCase() !== 'confirmed') return false;
        const dt = d.rawDate ? new Date(d.rawDate) : null;
        return dt && !isNaN(dt.getTime()) && dt.getFullYear() === currentYear;
      })
      .reduce((sum, d) => sum + (d.rawAmount || 0), 0);
  }, [donationHistory]);

  // Staggered entrance animations for 3 summary cards
  const summaryAnims = useRef([0, 1, 2].map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(18),
  }))).current;

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getPublicSettings()
        .then((res) => {
          if (mounted && res && res.paymentApprovalMethod) {
            setPaymentApprovalMethod(res.paymentApprovalMethod);
          }
        })
        .catch((err) => console.log("Failed to fetch settings:", err));
      return () => { mounted = false; };
    }, [])
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const emailFromParams = cleanEmail(route?.params?.email);

        if (emailFromParams) {
          if (mounted) setUserEmail(emailFromParams);

          // merge into existing cache (don't overwrite other fields)
          const old = await AsyncStorage.getItem("faithly_user");
          const parsed = old ? JSON.parse(old) : {};
          const merged = { ...parsed, email: emailFromParams };
          await AsyncStorage.setItem("faithly_user", JSON.stringify(merged));
          if (parsed?.role && mounted) setUserRole(parsed.role);
          if (parsed?.position && mounted) setUserPosition(parsed.position);
          // Load user profile name + phone for Sender Info
          if (mounted) {
            const name = parsed?.fullName || parsed?.name || "";
            if (name) setUserFullName(name);
            const phone = parsed?.phone || parsed?.phoneNumber || parsed?.contact || "";
            if (phone) setUserPhone(phone);
            if (parsed?.branch) {
              setUserBranch(parsed.branch);
              setSelectedBranch(parsed.branch);
            }
          }
          return;
        }

        // fallback: read from cache
        const cached = await AsyncStorage.getItem("faithly_user");
        const cachedData = JSON.parse(cached || "{}");
        const cachedEmail = cleanEmail(cachedData?.email);
        if (mounted) {
          setUserEmail(cachedEmail);
          if (cachedData?.role) setUserRole(cachedData.role);
          if (cachedData?.position) setUserPosition(cachedData.position);
          // Pre-fill community picker with user's own branch
          if (cachedData?.branch) {
            setUserBranch(cachedData.branch);
            setSelectedBranch(cachedData.branch);
          }
          // Load user profile name + phone for Sender Info
          const name = cachedData?.fullName || cachedData?.name || "";
          if (name) setUserFullName(name);
          const phone = cachedData?.phone || cachedData?.phoneNumber || cachedData?.contact || "";
          if (phone) setUserPhone(phone);
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [route?.params?.email]);

  // Auto-hide success modal
  useEffect(() => {
    if (successModalOpen) {
      const timer = setTimeout(() => {
        setSuccessModalOpen(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successModalOpen]);

  // Load donation history
  const loadHistory = useCallback(async () => {
    try {
      let parsed = [];
      try {
        const serverData = await getDonations();
        parsed = Array.isArray(serverData) ? serverData : (serverData?.donations || []);
        // Optional: save to cache
        await AsyncStorage.setItem(`faithly_donations_${userEmail}`, JSON.stringify(parsed));
      } catch (err) {
        if (err.message === 'Invalid or expired token') {
          console.log('Token expired - redirecting to login');
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }
        console.log("Failed to load donations from server, using cache", err);
        const saved = await AsyncStorage.getItem(`faithly_donations_${userEmail}`);
        if (saved) parsed = JSON.parse(saved);
      }

      const rawHistory = Array.isArray(parsed) ? parsed : [];
      
      // Normalize data for UI consistency
      const safeParsed = rawHistory.map(d => {
        // Handle Amount: Ensure peso sign and proper formatting
        let amtValue = 0;
        if (typeof d.amount === 'number') {
          amtValue = d.amount;
        } else if (typeof d.amount === 'string') {
          amtValue = parseFloat(d.amount.replace(/[^0-9.-]+/g, "")) || 0;
        }
        
        // Handle Date: Format ISO string or raw date to local date
        let displayDate = 'N/A';
        let validDateObj = null;
        const rawDate = d.createdAt || d.date;
        if (rawDate) {
          const dt = new Date(rawDate);
          if (!isNaN(dt.getTime())) {
            validDateObj = dt;
            displayDate = dt.toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
          } else if (typeof rawDate === 'string' && rawDate.includes('/')) {
            displayDate = rawDate; // keep MM/DD/YYYY if already formatted
          }
        }

        return {
          ...d,
          id: d.donationId || d.id || `TXN-${String(d._id || Math.random()).slice(-6).toUpperCase()}`,
          amount: `₱${amtValue.toLocaleString()}`,
          rawAmount: amtValue,
          date: displayDate,
          rawDate: validDateObj ? validDateObj.toISOString() : null,
          fund: d.category || d.fund || 'General',
          method: d.method || 'Manual',
          status: (d.status || 'pending').toLowerCase(),
          isRecurring: d.isRecurring || d.type === 'Recurring',
          paymongoSessionId: d.paymongoSessionId || null,
          // Normalize community field — backend may return either "community" or "branch"
          branch: d.community || d.branch || '',
        };
      });

      setDonationHistory(safeParsed);
      // totals are now derived via useMemo - no imperative computation needed
    } catch (e) {
      console.log("Failed to load donations", e);
    }
  }, [userEmail, paymentApprovalMethod]);

  useEffect(() => {
    if (userEmail) loadHistory();
  }, [userEmail, loadHistory]);

  // Deep linking listener
  useEffect(() => {
    const handleDeepLink = (event) => {
      if (event.url && event.url.includes("puac://payment/success?type=donation")) {
        setSuccessModalOpen(true);
        loadHistory();
      } else if (event.url && event.url.includes("puac://payment/cancel")) {
        setFormError("Payment was canceled.");
      }
    };
    
    // Check initial URL in case the app was fully closed
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, [loadHistory]);

  // Simulated loading + entrance animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      summaryAnims.forEach((anim, i) => {
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



  // Filtered tabs based on role (members don't see Loans)
  const TAB_ITEMS = userRole !== "officer"
    ? ALL_TAB_ITEMS.filter(t => t.key !== "Loans")
    : ALL_TAB_ITEMS;
  const TAB_WIDTH = SCREEN_WIDTH / TAB_ITEMS.length;

  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

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

  // Real-time field validation
  useEffect(() => {
    const errors = {};
    const amt = parseFloat(donationAmount.replace(/,/g, "")) || 0;
    if (!donationAmount || amt <= 0) errors.amount = "Please enter a valid donation amount.";
    else if (amt > 500000) errors.amount = "Maximum donation amount is \u20B1500,000.";
    if (!selectedCategory) errors.category = "Please select a donation category.";
    if (!selectedBranch) errors.branch = "Please select a community.";
    const isManual = paymentApprovalMethod === "manual";
    const isCash = selectedPayment === "cash";
    if (isManual && !isCash) {
      // E-Wallet: skip validation when using own profile (auto-filled)
      if (selectedPayment === "gcash" && !isAnotherAccount) {
        // Auto-filled from profile, no validation needed for name/number
      } else if (selectedPayment === "gcash" && isAnotherAccount) {
        if (!accountName || !accountName.trim()) errors.accountName = "Please enter the sender's account name.";
        if (!accountNumber || !accountNumber.trim()) {
          errors.accountNumber = "Please enter the sender's mobile number.";
        } else if (!/^09\d{9}$/.test(accountNumber.replace(/\s/g, ""))) {
          errors.accountNumber = "Enter 11 digits starting with 09.";
        }
      } else if (selectedPayment === "bank" && !isAnotherAccount) {
        // My Account — name auto-filled, only validate account number
        if (!accountNumber || !accountNumber.trim()) {
          errors.accountNumber = "Please enter your bank account number.";
        } else if (accountNumber.length < 8) {
          errors.accountNumber = "Bank account number must be at least 8 digits.";
        } else if (accountNumber.length > 20) {
          errors.accountNumber = "Bank account number cannot exceed 20 digits.";
        }
      } else if (selectedPayment === "bank" && isAnotherAccount) {
        if (!accountName || !accountName.trim()) errors.accountName = "Please enter the sender's bank account name.";
        if (!accountNumber || !accountNumber.trim()) {
          errors.accountNumber = "Please enter the sender's bank account number.";
        } else if (accountNumber.length < 8) {
          errors.accountNumber = "Bank account number must be at least 8 digits.";
        } else if (accountNumber.length > 20) {
          errors.accountNumber = "Bank account number cannot exceed 20 digits.";
        }
      }
      if (!referenceNumber || !referenceNumber.trim()) {
        errors.referenceNumber = "Please enter the transaction reference number.";
      }
      if (!proofImage || !proofImage.base64) {
        errors.proof = "Please upload proof of payment.";
      } else if (receiptVerification && receiptVerification.verifying) {
        errors.proof = "Please wait for receipt verification to complete.";
      } else if (!receiptVerification || !receiptVerification.valid) {
        errors.proof = receiptVerification?.reason || "Please upload a valid e-wallet or bank transfer receipt.";
      }
    }
    setFieldErrors(errors);
  }, [donationAmount, selectedCategory, selectedBranch, accountName, accountNumber, referenceNumber, proofImage, receiptVerification, paymentApprovalMethod, selectedPayment, isAnotherAccount]);

  const handleQuickAmount = (amount) => {
    setSelectedAmount(amount);
    setDonationAmount(amount.toString());
    setFormError("");
  };

  const handleSubmitDonation = async () => {
    setFormError("");
    
    const amt = parseFloat(donationAmount.replace(/,/g, "")) || 0;
    if (amt <= 0) {
      setFormError("Please enter a valid donation amount.");
      return;
    }
    if (amt > 500000) {
      setFormError("Maximum donation amount is \u20B1500,000.");
      return;
    }
    
    if (!selectedCategory) {
      setFormError("Please select a donation category.");
      return;
    }
    
    if (!selectedBranch) {
      setFormError("Please select a community to donate to.");
      return;
    }

    const isManual = paymentApprovalMethod === "manual";
    const isCash = selectedPayment === "cash";

    if (isManual && !isCash) {
      if (selectedPayment === "gcash" && !isAnotherAccount) {
        // My Account — auto-filled, no validation needed
      } else if (selectedPayment === "gcash" && isAnotherAccount) {
        if (!accountName || !accountName.trim()) {
          setFormError("Please enter the sender's account name.");
          return;
        }
        if (!accountNumber || !accountNumber.trim()) {
          setFormError("Please enter the sender's mobile number.");
          return;
        }
        if (!/^09\d{9}$/.test(accountNumber.replace(/\s/g, ""))) {
          setFormError("Enter 11 digits starting with 09.");
          return;
        }
      } else if (selectedPayment === "bank" && !isAnotherAccount) {
        // My Account — name auto-filled, only validate bank account number
        if (!accountNumber || !accountNumber.trim()) {
          setFormError("Please enter your bank account number.");
          return;
        }
        if (accountNumber.length < 8 || accountNumber.length > 20) {
          setFormError("Bank account number must be 8–20 digits.");
          return;
        }
      } else if (selectedPayment === "bank" && isAnotherAccount) {
        if (!accountName || !accountName.trim()) {
          setFormError("Please enter the sender's bank account name.");
          return;
        }
        if (!accountNumber || !accountNumber.trim()) {
          setFormError("Please enter the sender's bank account number.");
          return;
        }
        if (accountNumber.length < 8 || accountNumber.length > 20) {
          setFormError("Bank account number must be 8–20 digits.");
          return;
        }
      }
      if (!referenceNumber || !referenceNumber.trim()) {
        setFormError("Please enter the transaction reference number from your receipt.");
        return;
      }
      if (!proofImage || !proofImage.base64) {
        setFormError("Please upload proof of payment before submitting.");
        return;
      }
      if (receiptVerification && receiptVerification.verifying) {
        setFormError("Please wait for receipt verification to complete.");
        return;
      }
      if (!receiptVerification || !receiptVerification.valid) {
        setFormError(receiptVerification?.reason || "Please upload a valid e-wallet or bank transfer receipt.");
        return;
      }
    }

    setSubmitting(true);

    const newId = `DON-${String(donationHistory.length + 1).padStart(4, "0")}`;
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    // Send community from picker → cached user branch; backend also has fallback to user.branch in DB
    const communityValue = (selectedBranch || userBranch || "").trim();

    // Use 'method' to match backend field name exactly (backend reads 'method', not 'paymentMethod')
    const resolvedMethod = selectedPayment === "gcash" ? "GCash"
      : selectedPayment === "bank" ? "Bank Transfer"
      : "Cash";

    // Resolve sender name/number based on My Account vs Another Account
    const resolvedAccountName = (!isAnotherAccount)
      ? userFullName
      : accountName;
    const resolvedAccountNumber = (selectedPayment === "gcash" && !isAnotherAccount)
      ? (userPhone || "")
      : accountNumber;

    let backendPayload = {
      amount: amt,
      category: selectedCategory,
      community: communityValue,  // always send, even if empty — backend falls back to user.branch
      method: resolvedMethod,
      paymentMethod: resolvedMethod,  // send both for maximum compatibility
      isRecurring: isRecurring,
      type: isRecurring ? "Recurring" : "One-time",
      acknowledged: donorAcknowledged,
    };

    console.log("[Donation] community=", communityValue || "(empty—backend will use user.branch)", "| method=", resolvedMethod);

    if (isManual && !isCash) {
      backendPayload.subMethod = subMethod;
      backendPayload.referenceNumber = referenceNumber.trim();
      backendPayload.accountName = resolvedAccountName;
      backendPayload.accountNumber = resolvedAccountNumber;
      backendPayload.proofOfPayment = proofImage && proofImage.base64 ? `data:image/jpeg;base64,${proofImage.base64}` : null;
      backendPayload.proofFileName = "screenshot.jpg";
    }

    if (!isManual && !isCash) {
      backendPayload.successUrl = ExpoLinking.createURL("payment/success", { queryParams: { type: "donation" } });
      backendPayload.cancelUrl = ExpoLinking.createURL("payment/cancel");
    }

    try {
      const response = await createDonation(backendPayload);

      // Gateway redirection
      if (!isManual && !isCash) {
        if (response && response.checkoutUrl) {
          Linking.openURL(response.checkoutUrl);
        } else {
          Alert.alert(
            "Gateway Error", 
            `Backend did not return a checkoutUrl.\nResponse: ${JSON.stringify(response)}`
          );
        }
      }

      if (isManual || isCash) {
        // Local UI object to render immediately
        const newDonation = {
          id: newId,
          fund: selectedCategory,
          branch: selectedBranch,
          amount: `₱${amt.toLocaleString()}`,
          date: dateStr,
          method: backendPayload.method,
          status: "pending",
          isRecurring: isRecurring,
        };

        const updated = [newDonation, ...donationHistory];
        setDonationHistory(updated);
        // totalDonated and yearDonated recompute automatically via useMemo

        if (userEmail) {
          await AsyncStorage.setItem(`faithly_donations_${userEmail}`, JSON.stringify(updated)).catch(e => console.log(e));
          
          // Trigger Notification
          addNotification(
            userEmail,
            "transaction",
            "Donation Successful",
            `Thank you for your generous contribution of ₱${amt.toLocaleString()} to the ${selectedCategory} fund. Your support means the world to our community.`
          );
        }

        setSuccessModalOpen(true);
        setReceiptData(newDonation);
      }

      // Reset Form
      setDonationAmount("");
      setSelectedAmount(null);
      setSelectedCategory("");
      setSelectedBranch("");
      setSearchBranchQuery("");
      setAccountName("");
      setAccountNumber("");
      setReferenceNumber("");
      setAutoFilledInfo(null);
      setAutoFilledFields([]);
      setIsRecurring(false);
      setProofImage(null);
      setReceiptVerification(null);
      setDonorAcknowledged(false);
      setSubmitting(false);

      // Haptic success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setSubmitting(false);
      console.log("Submit donation err", err);
      setFormError(err.message || "Could not submit your donation at this time.");
    }
  };

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
        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: s(36), height: 36, borderRadius: 18 }} resizeMode="cover" /></View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications", { email: userEmail })} style={{ padding: 4 }} activeOpacity={0.6}><Image source={ICONS.notification} style={{ width: s(22), height: s(22), tintColor: colors.textDark }} resizeMode="contain" /></TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await loadHistory();
            setRefreshing(false);
          }} tintColor="#0D1F45" colors={["#0D1F45"]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Donations</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Support the church and track your giving
          </Text>
        </View>

        {/* œ... Summary Grid (with skeleton + entrance) */}
        {loading ? (
          <View style={styles.summaryGrid}>
            <SkeletonStatCard style={styles.summaryCardWide} />
            <SkeletonStatCard style={styles.summaryCardHalf} />
            <SkeletonStatCard style={styles.summaryCardHalf} />
          </View>
        ) : (
        <View style={styles.summaryGrid}>
          {/* Row 1 - Total Donated (full width) */}
          <Animated.View style={[styles.summaryCard, styles.summaryCardWide, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: summaryAnims[0].opacity, transform: [{ translateY: summaryAnims[0].translateY }] }]}>
            <View style={styles.summaryLeft}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Donated</Text>
              <Text style={[styles.summaryValue, { color: colors.textDark }]}>₱{totalDonated.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryIconBox, { backgroundColor: C.goldLight }]}>
              <Image source={ICONS.heart} style={[styles.summaryIcon, { tintColor: C.gold }]} resizeMode="contain" />
            </View>
          </Animated.View>

          {/* Row 2 - This Year (half) + Total Donations (half) side by side */}
          <Animated.View style={[styles.summaryCard, styles.summaryCardHalf, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: summaryAnims[1].opacity, transform: [{ translateY: summaryAnims[1].translateY }], zIndex: 50 }]}>
            <View style={styles.summaryLeft}>
              <View style={{ position: 'relative', zIndex: 100, marginBottom: 6 }}>
                <TouchableOpacity
                  onPress={() => setSummaryDropdownOpen(!summaryDropdownOpen)}
                  activeOpacity={0.7}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Text style={[styles.summaryLabel, { color: colors.textMuted, marginBottom: 0, marginRight: 4 }]}>{summaryFilter}</Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted }}>{summaryDropdownOpen ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {summaryDropdownOpen && (
                  <View style={{ position: "absolute", top: 20, left: -6, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: s(8), elevation: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: {width: 0, height: 4}, width: 105, zIndex: 110 }}>
                    {["Last 7 Days", "This Month", "This Year"].map((opt, i) => (
                      <TouchableOpacity
                        key={opt}
                        style={{ paddingHorizontal: s(12), paddingVertical: s(10), borderBottomWidth: i === 2 ? 0 : 1, borderBottomColor: colors.cardBorder }}
                        onPress={() => { setSummaryFilter(opt); setSummaryDropdownOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: fs(11), fontWeight: summaryFilter === opt ? "700" : "500", color: summaryFilter === opt ? C.blue : colors.textDark }}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <Text style={[styles.summaryValueSmall, { color: colors.textDark }]}>₱{filteredAmount.toLocaleString()}</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.summaryCard, styles.summaryCardHalf, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: summaryAnims[2].opacity, transform: [{ translateY: summaryAnims[2].translateY }] }]}>
            <View style={styles.summaryLeft}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Donations</Text>
              <Text style={[styles.summaryValueSmall, { color: colors.textDark }]}>{donationHistory.filter(d => (d.status || '').toLowerCase() === 'confirmed').length}</Text>
            </View>
          </Animated.View>

        </View>
        )}


        {/* Category Breakdown - collapsed by default, tap header to expand */}
        {!loading && (
        <Animated.View style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: summaryAnims[2].opacity }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowBreakdown(prev => !prev)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={[styles.formTitle, { color: colors.textDark }]}>Category Breakdown</Text>
            <Text style={{ fontSize: fs(14), color: C.blue, fontWeight: '700', paddingLeft: 8 }}>{showBreakdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showBreakdown && <View style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: 14, marginHorizontal: -16 }} />}
          {showBreakdown && (
          <>

          {/* PIE CHART + LEGEND */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingBottom: 16 }}>
            <View style={{ width: 140, height: 140 }}>
              <Svg width="140" height="140" viewBox="0 0 140 140">
                <G rotation="-90" origin="70, 70">
                  {categoryData.slices.length === 0 ? (
                    <Circle cx="70" cy="70" r="35" fill="transparent" stroke="#E8ECF0" strokeWidth="70" />
                  ) : (
                    categoryData.slices.reduce((acc, slice, i) => {
                      const circumference = 2 * Math.PI * 35;
                      const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                      acc.elements.push(
                        <Circle key={i} cx="70" cy="70" r={35} fill="transparent" stroke={slice.color} strokeWidth={70} strokeDasharray={strokeDasharray} strokeDashoffset={-acc.offset} />
                      );
                      acc.offset += (slice.percentage / 100) * circumference;
                      return acc;
                    }, { elements: [], offset: 0 }).elements
                  )}
                </G>
                <Circle cx="70" cy="70" r="45" fill={colors.cardBg} />
              </Svg>
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: fs(10), color: colors.textMuted, fontWeight: "600" }}>Total</Text>
                <Text style={{ fontSize: fs(13), color: colors.textDark, fontWeight: "800" }}>
                  {categoryData.total >= 1000 ? (categoryData.total / 1000).toFixed(1) + "k" : categoryData.total}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 20, justifyContent: "center" }}>
              {categoryData.slices.slice(0, 5).map((slice, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: slice.color, marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fs(11), color: colors.textDark, fontWeight: "600" }} numberOfLines={1}>{slice.name}</Text>
                    <Text style={{ fontSize: fs(10), color: colors.textMuted }}>{slice.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
              {categoryData.slices.length === 0 && <Text style={{ fontSize: fs(11), color: colors.textMuted }}>No data yet</Text>}
              {categoryData.slices.length > 5 && <Text style={{ fontSize: fs(10), color: C.blue, fontWeight: "700" }}>+{categoryData.slices.length - 5} more</Text>}
            </View>
          </View>

          {/* Divider between chart and table */}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder, marginHorizontal: -16, marginBottom: 12 }} />

          {/* TABLE */}
          {categoryData.slices.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ fontSize: fs(13), color: colors.textMuted }}>No donation data yet.</Text>
            </View>
          ) : (
            <View>
              {/* Table Header */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: colors.cardBorder, marginBottom: 4 }}>
                <Text style={{ flex: 2, fontSize: fs(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</Text>
                <Text style={{ flex: 1, fontSize: fs(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Amount</Text>
                <Text style={{ width: s(44), fontSize: fs(11), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>%</Text>
              </View>

              {/* Table Rows */}
              {(showAllLegendCategories ? categoryData.slices : categoryData.slices.slice(0, 5)).map((slice, i) => (
                <View key={i} style={{ paddingVertical: s(10), borderBottomWidth: i < (showAllLegendCategories ? categoryData.slices.length : Math.min(5, categoryData.slices.length)) - 1 ? 1 : 0, borderBottomColor: colors.cardBorder }}>
                  {/* Row top: name + amount + % */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: s(4), backgroundColor: slice.color, marginRight: 8 }} />
                    <Text style={{ flex: 2, fontSize: fs(13), fontWeight: '600', color: colors.textDark }} numberOfLines={1}>{slice.name}</Text>
                    <Text style={{ flex: 1, fontSize: fs(13), fontWeight: '700', color: colors.textDark, textAlign: 'right' }}>₱{slice.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                    <Text style={{ width: s(44), fontSize: fs(12), fontWeight: '600', color: slice.color, textAlign: 'right' }}>{slice.percentage.toFixed(1)}%</Text>
                  </View>
                  {/* Progress bar */}
                  <View style={{ height: 5, backgroundColor: colors.cardBorder, borderRadius: 3, overflow: 'hidden', marginLeft: 16 }}>
                    <View style={{ height: 5, width: `${slice.percentage}%`, backgroundColor: slice.color, borderRadius: 3 }} />
                  </View>
                </View>
              ))}

              {/* Total row */}
              <View style={{ flexDirection: 'row', paddingTop: 10, marginTop: 2, borderTopWidth: 1.5, borderTopColor: colors.cardBorder }}>
                <Text style={{ flex: 2, fontSize: fs(13), fontWeight: '700', color: colors.textDark }}>Total</Text>
                <Text style={{ flex: 1, fontSize: fs(13), fontWeight: '800', color: C.blue, textAlign: 'right' }}>₱{categoryData.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                <Text style={{ width: s(44), fontSize: fs(12), fontWeight: '700', color: C.blue, textAlign: 'right' }}>100%</Text>
              </View>

              {/* Show more/less */}
              {categoryData.slices.length > 5 && !showAllLegendCategories && (
                <TouchableOpacity onPress={() => setShowAllLegendCategories(true)} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: fs(12), color: C.blue, fontWeight: '700' }}>+ {categoryData.slices.length - 5} more categories</Text>
                </TouchableOpacity>
              )}
              {categoryData.slices.length > 5 && showAllLegendCategories && (
                <TouchableOpacity onPress={() => setShowAllLegendCategories(false)} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: fs(12), color: C.blue, fontWeight: '700' }}>Show less</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          </>
          )}
        </Animated.View>
        )}

        {/* Make a Donation Form */}
        <View style={[styles.donationForm, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={styles.formHeaderRow}>
            <Text style={[styles.formTitle, { color: colors.textDark }]}>Make a Donation</Text>
            <Text style={[styles.formSubtitle, { color: colors.textMuted }]}>
              Upload receipt first to auto-fill or enter details manually
            </Text>
          </View>

          {formError ? (
            <View style={styles.errorBox}>
              <Image source={ICONS.wallet} style={styles.errorIcon} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Proof of Payment Upload with AI Auto-Fill */}
          {paymentApprovalMethod === "manual" && selectedPayment !== "cash" && (
            <View style={styles.proofSection}>
              <View style={styles.proofHeaderRow}>
                <Text style={[styles.inputLabel, { color: colors.textDark, marginBottom: 0 }]}>
                  Upload Proof of Payment <Text style={{ color: "#E74C3C" }}>*</Text>
                </Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>✨ AI Auto-Fill</Text>
                </View>
              </View>

              {proofImage ? (
                <View style={styles.proofPreviewContainer}>
                  <Image source={{ uri: proofImage.uri }} style={styles.proofPreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.proofRemoveBtn}
                    onPress={() => {
                      setProofImage(null);
                      setReceiptVerification(null);
                      setAutoFilledInfo(null);
                      setAutoFilledFields([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.proofRemoveText}>✕</Text>
                  </TouchableOpacity>

                  {receiptVerification?.verifying ? (
                    <View style={[styles.proofAttachedBadge, { backgroundColor: "rgba(245,166,35,0.95)" }]}>
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.proofAttachedText}>✨ AI analyzing receipt & auto-filling...</Text>
                    </View>
                  ) : receiptVerification?.valid ? (
                    <View style={[styles.proofAttachedBadge, { backgroundColor: "rgba(52,199,89,0.95)" }]}>
                      <Text style={styles.proofAttachedText}>✓ Verified {receiptVerification.provider || "Receipt"}</Text>
                    </View>
                  ) : receiptVerification && !receiptVerification.valid ? (
                    <View style={[styles.proofAttachedBadge, { backgroundColor: "rgba(231,76,60,0.95)" }]}>
                      <Text style={styles.proofAttachedText}>✕ Invalid Receipt</Text>
                    </View>
                  ) : (
                    <View style={styles.proofAttachedBadge}>
                      <Text style={styles.proofAttachedText}>✓ Attached</Text>
                    </View>
                  )}

                  {receiptVerification && !receiptVerification.verifying && !receiptVerification.valid && (
                    <View style={styles.proofErrorBanner}>
                      <Text style={styles.proofErrorBannerText}>{receiptVerification.reason}</Text>
                    </View>
                  )}

                  {autoFilledInfo && (
                    <View style={[styles.autoFillSuccessPill, { backgroundColor: isDark ? "rgba(59,130,246,0.18)" : "#EFF6FF", borderColor: isDark ? "rgba(59,130,246,0.3)" : "#BFDBFE" }]}>
                      <Text style={[styles.autoFillSuccessText, { color: isDark ? "#60A5FA" : "#1D4ED8" }]}>
                        ✨ AI Auto-filled: ₱{autoFilledInfo.amount ? Number(autoFilledInfo.amount).toLocaleString() : donationAmount} • {autoFilledInfo.provider || "Receipt"}{autoFilledInfo.referenceNumber ? ` • Ref: ${autoFilledInfo.referenceNumber}` : ""}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.proofUploadBox, { borderColor: isDark ? "rgba(59,130,246,0.35)" : "#93C5FD", backgroundColor: isDark ? "rgba(59,130,246,0.03)" : "#F8FAFC" }]}>
                  <View style={styles.cloudIconWrapper}>
                    <Text style={styles.cloudIconText}>☁️</Text>
                  </View>
                  <Text style={[styles.proofUploadTitle, { color: colors.textDark }]}>
                    Upload your receipt or take a photo
                  </Text>
                  <Text style={[styles.proofUploadHighlight, { color: "#2563EB" }]}>
                    Instant auto-fill for Amount, Method, and Reference Number
                  </Text>
                  <Text style={[styles.proofUploadHint, { color: colors.textMuted }]}>
                    Supports PNG, JPG, JPEG, WEBP (up to 5MB)
                  </Text>
                  <View style={styles.proofBtnRow}>
                    <TouchableOpacity
                      style={styles.proofBtn}
                      activeOpacity={0.7}
                      onPress={handleCameraCapture}
                    >
                      <View style={styles.proofBtnInner}>
                        <Image source={ICONS.camera} style={styles.proofBtnIcon} resizeMode="contain" />
                        <Text style={styles.proofBtnText}>Camera</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.proofBtn}
                      activeOpacity={0.7}
                      onPress={handleGalleryPick}
                    >
                      <View style={styles.proofBtnInner}>
                        <Image source={ICONS.document} style={styles.proofBtnIcon} resizeMode="contain" />
                        <Text style={styles.proofBtnText}>Gallery</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {fieldErrors.proof && paymentApprovalMethod === "manual" && selectedPayment !== "cash" && (
                <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4, marginBottom: 8 }}>{fieldErrors.proof}</Text>
              )}
            </View>
          )}

          {/* ── DONATION DETAILS Section Header ── */}
          <View style={styles.detailsHeaderRow}>
            <Text style={[styles.detailsSectionTitle, { color: colors.textDark }]}>DONATION DETAILS</Text>
            <Text style={[styles.detailsSectionSubtitle, { color: colors.textMuted }]}>All fields remain editable</Text>
          </View>


          {/* Donation Amount */}
          <Text style={[styles.inputLabel, { color: colors.textDark }]}>Donation Amount</Text>
          <View style={[styles.amountInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Text style={[styles.currencySymbol, { color: colors.textDark }]}>₱</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.textDark }]}
              placeholder="Enter amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={donationAmount}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9]/g, "");
                const formatted = numericText.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                setDonationAmount(formatted);
                setSelectedAmount(null);
                setFormError("");
              }}
            />
            <TouchableOpacity style={styles.calcButton} activeOpacity={0.7}>
              <Image
                source={ICONS.wallet}
                style={styles.calcIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          {fieldErrors.amount && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4, marginBottom: 4 }}>{fieldErrors.amount}</Text>}

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickBtn,
                  { borderColor: colors.cardBorder },
                  selectedAmount === amount && styles.quickBtnActive,
                ]}
                onPress={() => handleQuickAmount(amount)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickBtnText,
                    selectedAmount === amount && styles.quickBtnTextActive,
                  ]}
                >
                  ₱{amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Donation Category */}
          <Text style={[styles.inputLabel, { color: colors.textDark }]}>Donation Category</Text>
          <TouchableOpacity
            style={[styles.dropdownButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                { color: colors.textDark },
                !selectedCategory && { color: colors.textMuted },
              ]}
            >
              {selectedCategory || "Select category"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
          {fieldErrors.category && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4, marginBottom: 4 }}>{fieldErrors.category}</Text>}

          {categoryDropdownOpen && (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {DONATION_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.dropdownItem, { borderBottomColor: colors.divider }]}
                  onPress={() => {
                    setSelectedCategory(category);
                    setCategoryDropdownOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedCategory === category &&
                        styles.dropdownItemTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                  {selectedCategory === category && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Donation Community with Search */}
          <Text style={[styles.inputLabel, { color: colors.textDark }]}>Community</Text>
          <TouchableOpacity
            style={[styles.dropdownButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setBranchDropdownOpen(!branchDropdownOpen)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                { color: colors.textDark },
                !selectedBranch && { color: colors.textMuted },
              ]}
            >
              {selectedBranch || "Select community"}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
          {fieldErrors.branch && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4, marginBottom: 4 }}>{fieldErrors.branch}</Text>}

          {branchDropdownOpen && (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textDark }]}
                  placeholder="Search community..."
                  placeholderTextColor={colors.textMuted}
                  value={searchBranchQuery}
                  onChangeText={setSearchBranchQuery}
                />
              </View>
              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled={true}>
                {loadingBranches ? (
                  <View style={{ padding: s(20), alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0D1F45" />
                    <Text style={{ marginTop: 8, fontSize: fs(12), color: colors.textMuted }}>Loading...</Text>
                  </View>
                ) : dynamicBranches.length === 0 ? (
                  <View style={{ padding: 20 }}>
                    <Text style={{ color: colors.textMuted, fontStyle: "italic", textAlign: "center" }}>No communities available</Text>
                  </View>
                ) : (
                  Object.entries(groupedBranches).map(([province, branches]) => {
                    const filtered = branches.filter(b => 
                      b.name.toLowerCase().includes(searchBranchQuery.toLowerCase()) ||
                      b.province.toLowerCase().includes(searchBranchQuery.toLowerCase())
                    );
                    if (filtered.length === 0) return null;
                    
                    return (
                      <View key={province}>
                        <View style={{ paddingHorizontal: s(14), paddingVertical: 6, backgroundColor: colors.bg }}>
                          <Text style={{ fontSize: fs(10), fontWeight: "800", color: colors.textMuted, letterSpacing: 1 }}>{province.toUpperCase()}</Text>
                        </View>
                        {filtered.map((branch) => {
                          const branchName = `${branch.province} - ${branch.name}`;
                          return (
                            <TouchableOpacity
                              key={branch._id}
                              style={[styles.dropdownItem, { borderBottomColor: colors.divider }]}
                              onPress={() => {
                                setSelectedBranch(branch.name); // store just the name e.g. "Zapote"
                                setBranchDropdownOpen(false);
                                setSearchBranchQuery("");
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  selectedBranch === branch.name && styles.dropdownItemTextActive,
                                ]}
                              >
                                {branch.name}
                              </Text>
                              {selectedBranch === branch.name && (
                                <Text style={styles.checkIcon}>✓</Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          <Text style={[styles.inputLabel, { color: colors.textDark }]}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentBtn,
                { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                selectedPayment === "gcash" && styles.paymentBtnActive,
              ]}
              onPress={() => {
                setSelectedPayment("gcash");
                setSubMethod("GCash");
                let cleaned = accountNumber.replace(/[^0-9+]/g, "");
                if (!cleaned.startsWith("+63")) {
                  cleaned = "+63" + cleaned.replace(/\+/g, "").replace(/^63/, "");
                }
                if (cleaned.length > 13) cleaned = cleaned.slice(0, 13);
                setAccountNumber(cleaned);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.paymentText,
                  selectedPayment === "gcash" && styles.paymentTextActive,
                ]}
              >
                E-Wallet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentBtn,
                { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                selectedPayment === "bank" && styles.paymentBtnActive,
              ]}
              onPress={() => {
                setSelectedPayment("bank");
                setSubMethod("BDO");
                const digits = accountNumber.replace(/[^0-9]/g, "").slice(0, 16);
                setAccountNumber(digits);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.paymentText,
                  selectedPayment === "bank" && styles.paymentTextActive,
                ]}
              >
                Bank Transfer
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Donation Instructions Info Panel ── */}
          {paymentApprovalMethod === "manual" && selectedPayment !== "cash" && (
            <View style={[styles.donationInfoOuter, { backgroundColor: isDark ? 'rgba(30,60,120,0.10)' : 'rgba(59,130,246,0.06)', borderColor: isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.15)' }]}>
              {/* Instruction text */}
              <Text style={[styles.donationInfoInstruction, { color: colors.textMuted }]}>
                Please transfer your donation to our{' '}
                <Text style={{ fontWeight: '800', color: colors.textDark }}>
                  {selectedPayment === "gcash" ? "E-Wallet" : "Bank"}
                </Text>
                {' '}account and upload the receipt below.
              </Text>

              {/* Inner card */}
              <View style={[styles.donationInfoPanel, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {/* Header */}
                <View style={styles.donationInfoHeader}>
                  <Image source={LOGO} style={styles.donationInfoLogo} resizeMode="contain" />
                  <View style={{ flex: 1, marginRight: s(6) }}>
                    <Text style={[styles.donationInfoTitle, { color: colors.textDark }]} numberOfLines={2}>IsangDiwa Official Receiving Account</Text>
                    <Text style={[styles.donationInfoSubtitle, { color: colors.textMuted }]}>Philippine United Apostolic Church</Text>
                  </View>
                  <View style={[styles.officialBadge, { borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[styles.officialBadgeText, { color: colors.textMuted }]}>Official Account</Text>
                  </View>
                </View>

                {/* E-Wallet Content */}
                {selectedPayment === "gcash" && (
                  <View>
                    {/* GCash / Maya sub-tabs */}
                    <View style={styles.ewalletTabs}>
                      <TouchableOpacity
                        style={[
                          styles.ewalletTab,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                          subMethod === "GCash" && styles.ewalletTabActiveGcash,
                        ]}
                        onPress={() => setSubMethod("GCash")}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.ewalletDot, { backgroundColor: subMethod === "GCash" ? "#FFFFFF" : colors.textMuted }]} />
                        <Text style={[styles.ewalletTabText, { color: colors.textMuted }, subMethod === "GCash" && styles.ewalletTabTextActiveGcash]}>GCash</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.ewalletTab,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                          subMethod === "Maya" && styles.ewalletTabActiveMaya,
                        ]}
                        onPress={() => setSubMethod("Maya")}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.ewalletDot, { backgroundColor: subMethod === "Maya" ? "#34C759" : colors.textMuted }]} />
                        <Text style={[styles.ewalletTabText, { color: colors.textMuted }, subMethod === "Maya" && styles.ewalletTabTextActiveMaya]}>Maya</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Account Details Card */}
                    <View style={[styles.accountCard, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder }]}>
                      {/* QR + Details side-by-side for GCash */}
                      {subMethod === "GCash" ? (
                        <View>
                          <View style={styles.qrRow}>
                            <TouchableOpacity onPress={() => setQrModalOpen(true)} activeOpacity={0.85}>
                              <Image source={GCASH_QR} style={styles.qrCode} resizeMode="contain" />
                              <View style={styles.qrTapHint}>
                                <Text style={styles.qrTapHintText}>Tap to view</Text>
                              </View>
                            </TouchableOpacity>
                            <View style={styles.qrDetails}>
                              <View style={styles.accountRowStacked}>
                                <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Account Name:</Text>
                                <Text style={[styles.accountValue, { color: colors.textDark }]}>IsangDiwa Church</Text>
                              </View>
                              <View style={[styles.accountDivider, { borderBottomColor: colors.divider || colors.cardBorder }]} />
                              <View style={styles.accountRowStacked}>
                                <Text style={[styles.accountLabel, { color: colors.textMuted }]}>GCash Number:</Text>
                                <Text style={[styles.accountValueNumber, { color: colors.textDark, marginTop: 2 }]}>0912 345 6789</Text>
                                <TouchableOpacity
                                  style={[styles.copyBtnBlock, { borderColor: "#007BFF" }]}
                                  onPress={async () => {
                                    await Clipboard.setStringAsync("09123456789");
                                    setCopiedField("gcash");
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    setTimeout(() => setCopiedField(""), 2000);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.copyBtnText, { color: "#007BFF" }]}>
                                    {copiedField === "gcash" ? "✓ Copied" : "📋 Copy"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                          <Text style={[styles.accountHint, { color: colors.textMuted }]}>
                            Scan the QR code directly or copy the number to transfer via GCash.
                          </Text>
                        </View>
                      ) : (
                        /* Maya — no QR, simple stacked layout */
                        <View>
                          <View style={styles.accountRow}>
                            <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Account Name:</Text>
                            <Text style={[styles.accountValue, { color: colors.textDark }]}>IsangDiwa Church</Text>
                          </View>
                          <View style={[styles.accountDivider, { borderBottomColor: colors.divider || colors.cardBorder }]} />
                          <View style={styles.accountRowStacked}>
                            <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Maya Number:</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                              <Text style={[styles.accountValueNumber, { color: colors.textDark }]}>0998 765 4321</Text>
                              <TouchableOpacity
                                style={[styles.copyBtn, { borderColor: "#34C759" }]}
                                onPress={async () => {
                                  await Clipboard.setStringAsync("09987654321");
                                  setCopiedField("maya");
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                  setTimeout(() => setCopiedField(""), 2000);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.copyBtnText, { color: "#34C759" }]}>
                                  {copiedField === "maya" ? "✓ Copied" : "📋 Copy"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={[styles.accountHint, { color: colors.textMuted }]}>
                            Copy the number above to transfer via Maya.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Bank Transfer Content */}
                {selectedPayment === "bank" && (
                  <View style={[styles.accountCard, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.cardBorder }]}>
                    <View style={styles.accountRowStacked}>
                      <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Bank:</Text>
                      <Text style={[styles.accountValue, { color: colors.textDark }]}>BDO Unibank</Text>
                    </View>
                    <View style={[styles.accountDivider, { borderBottomColor: colors.divider || colors.cardBorder }]} />
                    <View style={styles.accountRowStacked}>
                      <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Account Name:</Text>
                      <Text style={[styles.accountValue, { color: colors.textDark }]}>Philippine United Apostolic Church</Text>
                    </View>
                    <View style={[styles.accountDivider, { borderBottomColor: colors.divider || colors.cardBorder }]} />
                    <View style={styles.accountRowStacked}>
                      <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Account Number:</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                        <Text style={[styles.accountValueNumber, { color: colors.textDark }]}>0012 3456 7890</Text>
                        <TouchableOpacity
                          style={[styles.copyBtn, { borderColor: "#5856D6" }]}
                          onPress={async () => {
                            await Clipboard.setStringAsync("001234567890");
                            setCopiedField("bank");
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setTimeout(() => setCopiedField(""), 2000);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.copyBtnText, { color: "#5856D6" }]}>
                            {copiedField === "bank" ? "✓ Copied" : "📋 Copy"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={[styles.accountHint, { color: colors.textMuted }]}>
                      Accepts online bank transfers from BDO, BPI, Metrobank, Unionbank, etc. via InstaPay or PESONet.
                    </Text>
                  </View>
                )}
              </View>

              {/* How to give in 3 simple steps */}
              <View style={[styles.howToGiveCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#F0F7FF', borderColor: isDark ? 'rgba(59,130,246,0.2)' : '#DBEAFE' }]}>
                <View style={styles.howToGiveHeader}>
                  <Text style={styles.howToGiveInfoIcon}>ℹ️</Text>
                  <Text style={[styles.howToGiveTitle, { color: colors.textDark }]}>How to give in 3 simple steps</Text>
                </View>
                <View style={styles.howToGiveSteps}>
                  <Text style={[styles.howToGiveStepText, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: '700', color: colors.textDark }}>1.</Text> Transfer using the official QR code or account details above.
                  </Text>
                  <Text style={[styles.howToGiveStepText, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: '700', color: colors.textDark }}>2.</Text> Save or take a screenshot of your transaction receipt.
                  </Text>
                  <Text style={[styles.howToGiveStepText, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: '700', color: colors.textDark }}>3.</Text> Upload the receipt above to auto-fill your donation form.
                  </Text>
                </View>
              </View>
            </View>
          )}


          {/* Sub-method & Account details for Manual Approval */}
          {paymentApprovalMethod === "manual" && selectedPayment !== "cash" && (
            <View style={{ marginTop: 10 }}>
              {/* ── Sub-Method / Bank Option ── */}
              <Text style={[styles.inputLabel, { color: colors.textDark }]}>
                {selectedPayment === "bank" ? "Bank Option" : "Sub-Method"}
                <Text style={{ color: '#E74C3C' }}> *</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdownButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => setSubMethodDropdownOpen(!subMethodDropdownOpen)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownButtonText, { color: subMethod ? colors.textDark : colors.textMuted }]}>
                  {subMethod || (selectedPayment === "bank" ? "Select Bank" : "Select sub-method")}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {subMethodDropdownOpen && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  {selectedPayment === "gcash" ? (
                    ["GCash", "Maya"].map((sm) => (
                      <TouchableOpacity
                        key={sm}
                        style={[styles.dropdownItem, { borderBottomColor: colors.divider }]}
                        onPress={() => { setSubMethod(sm); setSubMethodDropdownOpen(false); }}
                      >
                        <Text style={[styles.dropdownItemText, subMethod === sm && styles.dropdownItemTextActive]}>{sm}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <>
                      <View style={{ paddingHorizontal: s(12), paddingVertical: s(6), backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }}>
                        <Text style={{ fontSize: fs(10), fontWeight: '800', color: colors.textDark }}>Card Payments</Text>
                      </View>
                      {["Master Card", "Visa"].map((sm) => (
                        <TouchableOpacity key={sm} style={[styles.dropdownItem, { borderBottomColor: colors.divider, paddingLeft: s(20) }]} onPress={() => { setSubMethod(sm); setSubMethodDropdownOpen(false); }}>
                          <Text style={[styles.dropdownItemText, subMethod === sm && styles.dropdownItemTextActive]}>{sm}</Text>
                        </TouchableOpacity>
                      ))}
                      <View style={{ paddingHorizontal: s(12), paddingVertical: s(6), backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }}>
                        <Text style={{ fontSize: fs(10), fontWeight: '800', color: colors.textDark }}>Online Bank</Text>
                      </View>
                      {["BPI", "BDO", "PNB", "Metrobank", "Unionbank", "Instapay", "RCBC"].map((sm) => (
                        <TouchableOpacity key={sm} style={[styles.dropdownItem, { borderBottomColor: colors.divider, paddingLeft: s(20) }]} onPress={() => { setSubMethod(sm); setSubMethodDropdownOpen(false); }}>
                          <Text style={[styles.dropdownItemText, subMethod === sm && styles.dropdownItemTextActive]}>{sm}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>
              )}

              {/* ── Reference Number / Transaction ID ── */}
              <View style={{ marginTop: s(8), marginBottom: s(6) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textDark, marginBottom: 0 }]}>
                      Reference Number / Transaction ID <Text style={{ color: '#E74C3C' }}>*</Text>
                    </Text>
                    {autoFilledFields.includes('referenceNumber') && (
                      <View style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#EFF6FF', borderColor: '#93C5FD', borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ fontSize: fs(10), fontWeight: '700', color: '#2563EB' }}>✨ Auto-filled</Text>
                      </View>
                    )}
                  </View>
                  {referenceNumber ? (
                    <Text style={{ fontSize: fs(10), color: colors.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                      {referenceNumber.length} chars
                    </Text>
                  ) : null}
                </View>
                <TextInput
                  style={[
                    styles.amountInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: fieldErrors.referenceNumber ? '#E74C3C' : autoFilledFields.includes('referenceNumber') ? '#34C759' : colors.inputBorder,
                      color: colors.textDark,
                      paddingLeft: 14,
                      borderRadius: s(8),
                      height: s(48),
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    },
                  ]}
                  placeholder="e.g. 902412345678 or UB12345678"
                  placeholderTextColor={colors.textMuted}
                  value={referenceNumber}
                  onChangeText={(t) => {
                    setReferenceNumber(t.replace(/[\s]/g, ""));
                    setFormError("");
                  }}
                />
                {fieldErrors.referenceNumber ? (
                  <Text style={{ color: "#E74C3C", fontSize: fs(11), fontWeight: "600", marginTop: 2, marginBottom: 4 }}>
                    {fieldErrors.referenceNumber}
                  </Text>
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: fs(10), marginTop: 2, marginBottom: 4 }}>
                    Transaction reference number from your receipt for verification.
                  </Text>
                )}
              </View>

              {/* ── Sender Information (E-Wallet) ── */}
              {selectedPayment === "gcash" && (
                <View style={{ marginTop: s(4) }}>
                  <Text style={[styles.inputLabel, { color: colors.textDark }]}>
                    Sender Information <Text style={{ color: '#E74C3C' }}>*</Text>
                  </Text>
                  <View style={styles.senderRadioRow}>
                    <TouchableOpacity
                      style={[styles.senderRadioCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }, !isAnotherAccount && { borderColor: '#007BFF', backgroundColor: isDark ? 'rgba(0,123,255,0.12)' : 'rgba(0,123,255,0.06)' }]}
                      onPress={() => { setIsAnotherAccount(false); setAccountName(userFullName); setAccountNumber(userPhone || ""); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.senderRadioDot, { marginTop: s(2) }, !isAnotherAccount && styles.senderRadioDotActive]}>
                        {!isAnotherAccount && <View style={styles.senderRadioDotInner} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(5), flexWrap: 'wrap' }}>
                          <Text style={[styles.senderRadioTitle, { color: colors.textDark }]} numberOfLines={1}>{userFullName || 'My Account'}</Text>
                          <View style={styles.senderYouBadge}><Text style={styles.senderYouBadgeText}>You</Text></View>
                        </View>
                        <Text style={[styles.senderRadioSub, { color: colors.textMuted }]} numberOfLines={1}>{userPhone || 'No phone on file'}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.senderRadioCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }, isAnotherAccount && { borderColor: '#007BFF', backgroundColor: isDark ? 'rgba(0,123,255,0.12)' : 'rgba(0,123,255,0.06)' }]}
                      onPress={() => { setIsAnotherAccount(true); setAccountName(""); setAccountNumber(""); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.senderRadioDot, { marginTop: s(2) }, isAnotherAccount && styles.senderRadioDotActive]}>
                        {isAnotherAccount && <View style={styles.senderRadioDotInner} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.senderRadioTitle, { color: colors.textDark }]}>Another account?</Text>
                        <Text style={[styles.senderRadioSub, { color: colors.textMuted }]} numberOfLines={2}>Donate using someone else's account</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {!isAnotherAccount ? (
                    <View style={[styles.senderAutoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.inputBg, borderColor: colors.cardBorder }]}>
                      <View style={[styles.senderAutoRow, { borderBottomColor: colors.divider || colors.cardBorder }]}>
                        <Text style={[styles.senderAutoLabel, { color: colors.textMuted }]}>Sender Name:</Text>
                        <Text style={[styles.senderAutoValue, { color: colors.textDark }]}>{userFullName || 'Faithly Member'}</Text>
                      </View>
                      <View style={[styles.senderAutoRow, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.senderAutoLabel, { color: colors.textMuted }]}>Sender Mobile Number:</Text>
                        <Text style={[styles.senderAutoValueMono, { color: colors.textDark }]}>{userPhone || 'Not set'}</Text>
                      </View>
                      <View style={styles.senderAutoFooter}>
                        <Text style={styles.senderAutoFilledText}>✓ Auto-filled from your profile</Text>
                        <TouchableOpacity onPress={() => { setIsAnotherAccount(true); setAccountName(""); setAccountNumber(""); }}>
                          <Text style={styles.senderUseAnotherLink}>Use another account?</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.senderAnotherCard, { borderColor: isDark ? 'rgba(0,123,255,0.25)' : 'rgba(0,123,255,0.2)', backgroundColor: isDark ? 'rgba(0,123,255,0.06)' : 'rgba(0,123,255,0.03)' }]}>
                      <View style={styles.senderAnotherHeader}>
                        <Text style={[styles.senderAnotherTitle, { color: colors.textDark }]}>Enter Details of Another Account</Text>
                      </View>
                      <Text style={[styles.inputLabel, { color: colors.textDark, marginTop: s(8) }]}>Sender Account Name <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                      <TextInput
                        style={[styles.amountInput, { backgroundColor: isDark ? colors.inputBg : '#FFFFFF', borderColor: colors.inputBorder, color: colors.textDark, paddingLeft: 14, borderRadius: s(8), height: s(48), marginBottom: 4 }]}
                        placeholder="Enter sender's name"
                        placeholderTextColor={colors.textMuted}
                        value={accountName}
                        onChangeText={(t) => setAccountName(t.replace(/[^a-zA-Z\s]/g, ""))}
                      />
                      {fieldErrors.accountName && <Text style={{ color: "#E74C3C", fontSize: fs(11), fontWeight: "600", marginBottom: 8 }}>{fieldErrors.accountName}</Text>}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.inputLabel, { color: colors.textDark }]}>Sender Mobile / E-Wallet Number <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                        <Text style={[styles.senderDigitCount, { color: accountNumber.replace(/[^0-9]/g, "").length === 11 ? '#34C759' : colors.textMuted }]}>
                          {accountNumber.replace(/[^0-9]/g, "").length}/11 digits
                        </Text>
                      </View>
                      <TextInput
                        style={[styles.amountInput, { backgroundColor: isDark ? colors.inputBg : '#FFFFFF', borderColor: colors.inputBorder, color: colors.textDark, paddingLeft: 14, borderRadius: s(8), height: s(48), marginBottom: 4 }]}
                        placeholder="Enter phone number"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={accountNumber}
                        maxLength={11}
                        onChangeText={(t) => { setAccountNumber(t.replace(/[^0-9]/g, "").slice(0, 11)); }}
                      />
                      <Text style={[styles.senderInputHint, { color: colors.textMuted }]}>Enter 11-digit mobile number starting with 09.</Text>
                      {fieldErrors.accountNumber && <Text style={{ color: "#E74C3C", fontSize: fs(11), fontWeight: "600", marginTop: 2, marginBottom: 8 }}>{fieldErrors.accountNumber}</Text>}
                    </View>
                  )}
                </View>
              )}

              {/* ── Sender Information (Bank Transfer) ── */}
              {selectedPayment === "bank" && (
                <View style={{ marginTop: s(4) }}>
                  <Text style={[styles.inputLabel, { color: colors.textDark }]}>
                    Sender Information <Text style={{ color: '#E74C3C' }}>*</Text>
                  </Text>
                  <View style={styles.senderRadioRow}>
                    <TouchableOpacity
                      style={[styles.senderRadioCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }, !isAnotherAccount && { borderColor: '#007BFF', backgroundColor: isDark ? 'rgba(0,123,255,0.12)' : 'rgba(0,123,255,0.06)' }]}
                      onPress={() => { setIsAnotherAccount(false); setAccountName(userFullName); setAccountNumber(""); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.senderRadioDot, { marginTop: s(2) }, !isAnotherAccount && styles.senderRadioDotActive]}>
                        {!isAnotherAccount && <View style={styles.senderRadioDotInner} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(5), flexWrap: 'wrap' }}>
                          <Text style={[styles.senderRadioTitle, { color: colors.textDark }]} numberOfLines={1}>{userFullName || 'My Account'}</Text>
                          <View style={styles.senderYouBadge}><Text style={styles.senderYouBadgeText}>You</Text></View>
                        </View>
                        <Text style={[styles.senderRadioSub, { color: colors.textMuted }]} numberOfLines={1}>Account Holder</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.senderRadioCard, { borderColor: colors.cardBorder, backgroundColor: colors.cardBg }, isAnotherAccount && { borderColor: '#007BFF', backgroundColor: isDark ? 'rgba(0,123,255,0.12)' : 'rgba(0,123,255,0.06)' }]}
                      onPress={() => { setIsAnotherAccount(true); setAccountName(""); setAccountNumber(""); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.senderRadioDot, { marginTop: s(2) }, isAnotherAccount && styles.senderRadioDotActive]}>
                        {isAnotherAccount && <View style={styles.senderRadioDotInner} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.senderRadioTitle, { color: colors.textDark }]}>Another account?</Text>
                        <Text style={[styles.senderRadioSub, { color: colors.textMuted }]} numberOfLines={2}>Donate using someone else's account</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {!isAnotherAccount ? (
                    <View>
                      <View style={[styles.senderAutoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.inputBg, borderColor: colors.cardBorder, marginBottom: s(10) }]}>
                        <View style={[styles.senderAutoRow, { borderBottomWidth: 0 }]}>
                          <Text style={[styles.senderAutoLabel, { color: colors.textMuted }]}>Account Holder Name:</Text>
                          <Text style={[styles.senderAutoValue, { color: colors.textDark }]}>{userFullName || 'Faithly Member'} (You)</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.inputLabel, { color: colors.textDark }]}>Your Bank Account Number <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                        <Text style={[styles.senderDigitCount, { color: accountNumber.length >= 8 && accountNumber.length <= 20 ? '#34C759' : colors.textMuted }]}>
                          {accountNumber.length} digits (8–20)
                        </Text>
                      </View>
                      <TextInput
                        style={[styles.amountInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textDark, paddingLeft: 14, borderRadius: s(8), height: s(48), marginBottom: 4 }]}
                        placeholder="0012 3456 7890 (8–20 digits)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={accountNumber}
                        maxLength={20}
                        onChangeText={(t) => { setAccountNumber(t.replace(/[^0-9]/g, "").slice(0, 20)); }}
                      />
                      <Text style={[styles.senderInputHint, { color: colors.textMuted }]}>Enter 8 to 20 digits.</Text>
                      {fieldErrors.accountNumber && <Text style={{ color: "#E74C3C", fontSize: fs(11), fontWeight: "600", marginTop: 2, marginBottom: 8 }}>{fieldErrors.accountNumber}</Text>}
                    </View>
                  ) : (
                    <View style={[styles.senderAnotherCard, { borderColor: isDark ? 'rgba(0,123,255,0.25)' : 'rgba(0,123,255,0.2)', backgroundColor: isDark ? 'rgba(0,123,255,0.06)' : 'rgba(0,123,255,0.03)' }]}>
                      <View style={styles.senderAnotherHeader}>
                        <Text style={[styles.senderAnotherTitle, { color: colors.textDark }]}>Enter Details of Another Account</Text>
                      </View>
                      <Text style={[styles.inputLabel, { color: colors.textDark, marginTop: s(8) }]}>Sender Bank Account Name <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                      <TextInput
                        style={[styles.amountInput, { backgroundColor: isDark ? colors.inputBg : '#FFFFFF', borderColor: colors.inputBorder, color: colors.textDark, paddingLeft: 14, borderRadius: s(8), height: s(48), marginBottom: 4 }]}
                        placeholder="Enter sender's name"
                        placeholderTextColor={colors.textMuted}
                        value={accountName}
                        onChangeText={(t) => setAccountName(t.replace(/[^a-zA-Z\s]/g, ""))}
                      />
                      {fieldErrors.accountName && <Text style={{ color: "#E74C3C", fontSize: fs(11), fontWeight: "600", marginBottom: 8 }}>{fieldErrors.accountName}</Text>}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.inputLabel, { color: colors.textDark }]}>Sender Bank Account Number <Text style={{ color: '#E74C3C' }}>*</Text></Text>
                        <Text style={[styles.senderDigitCount, { color: accountNumber.length >= 8 && accountNumber.length <= 20 ? '#34C759' : colors.textMuted }]}>
                          {accountNumber.length} digits (8–20)
                        </Text>
                      </View>
                      <TextInput
                        style={[styles.amountInput, { backgroundColor: isDark ? colors.inputBg : '#FFFFFF', borderColor: colors.inputBorder, color: colors.textDark, paddingLeft: 14, borderRadius: s(8), height: s(48), marginBottom: 4 }]}
                        placeholder="0012 3456 7890 (8–20 digits)"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={accountNumber}
                        maxLength={20}
                        onChangeText={(t) => { setAccountNumber(t.replace(/[^0-9]/g, "").slice(0, 20)); }}
                      />
                      <Text style={[styles.senderInputHint, { color: colors.textMuted }]}>Enter 8 to 20 digits.</Text>
                      {fieldErrors.accountNumber && <Text style={{ color: "#E74C3C", fontSize: fs(11), fontWeight: "600", marginTop: 2, marginBottom: 8 }}>{fieldErrors.accountNumber}</Text>}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}



          {/* Recurring Checkbox */}
          <TouchableOpacity
            style={styles.recurringRow}
            onPress={() => setIsRecurring(!isRecurring)}
            activeOpacity={0.7}
          >
            <View
              style={[styles.checkbox, isRecurring && styles.checkboxActive]}
            >
              {isRecurring && <Text style={styles.checkmarkText}>✓</Text>}
            </View>
            <View style={styles.recurringText}>
              <Text style={[styles.recurringTitle, { color: colors.textDark }]}>
                Make this a recurring donation
              </Text>
              <Text style={[styles.recurringSubtitle, { color: colors.textMuted }]}>
                Automatically donate this amount monthly
              </Text>
            </View>
          </TouchableOpacity>

          {/* Donate Button */}
          <TouchableOpacity 
            style={[styles.donateBtn, submitting && { opacity: 0.7 }]} 
            activeOpacity={0.85}
            onPress={() => {
              // Run validation before showing confirmation modal
              setFormError("");
              const amt = parseFloat(donationAmount.replace(/,/g, "")) || 0;
              if (amt <= 0) { setFormError("Please enter a valid donation amount."); return; }
              if (amt > 500000) { setFormError("Maximum donation amount is \u20B1500,000."); return; }
              if (!selectedCategory) { setFormError("Please select a donation category."); return; }
              if (!selectedBranch) { setFormError("Please select a community to donate to."); return; }
              const isManual = paymentApprovalMethod === "manual";
              const isCash = selectedPayment === "cash";
              if (isManual && !isCash) {
                if (!accountName || !accountName.trim()) { setFormError("Please enter your account name."); return; }
                if (!accountNumber || !accountNumber.trim() || (selectedPayment === "gcash" && accountNumber === "+63")) { setFormError(selectedPayment === "gcash" ? "Please enter your phone number." : "Please enter your account number."); return; }
                if (selectedPayment === "gcash" && !/^\+63\d{10}$/.test(accountNumber.replace(/\s/g, ""))) { setFormError("Phone number must have exactly 10 digits after +63."); return; }
                if (selectedPayment === "bank" && accountNumber.length < 8) { setFormError("Bank account number must be at least 8 digits."); return; }
                if (!proofImage || !proofImage.base64) { setFormError("Please upload proof of payment before submitting."); return; }
                if (receiptVerification && receiptVerification.verifying) { setFormError("Please wait for receipt verification to complete."); return; }
                if (!receiptVerification || !receiptVerification.valid) { setFormError(receiptVerification?.reason || "Please upload a valid e-wallet or bank transfer receipt."); return; }
              }
              setConfirmModalOpen(true);
            }}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Image
                  source={ICONS.heart}
                  style={styles.donateBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.donateBtnText}>
                  {paymentApprovalMethod === "gateway" && selectedPayment !== "cash" ? "Proceed to Payment" : "Submit for Verification"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Donation History */}
        <View style={styles.historySection}>
          <TouchableOpacity 
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: isHistoryExpanded ? 14 : 0 }}
            activeOpacity={0.7}
            onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
          >
            <Text style={[styles.historyTitle, { color: colors.textDark, marginBottom: 0 }]}>Donation History</Text>
            <View style={{ backgroundColor: isHistoryExpanded ? "rgba(0,0,0,0.05)" : "rgba(13,31,69,0.05)", paddingHorizontal: s(12), paddingVertical: 6, borderRadius: 16 }}>
              <Text style={{ fontSize: fs(11), color: isHistoryExpanded ? colors.textMuted : C.blue, fontWeight: "800" }}>
                {isHistoryExpanded ? "HIDE" : "SHOW"}
              </Text>
            </View>
          </TouchableOpacity>

          {isHistoryExpanded && (
            <>
              {/* Filter Chips */}
              {donationHistory.length > 0 && (
                <View style={styles.filterContainer}>
              {/* Payment Method Filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {["All", "GCash", "Bank Transfer"].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.filterChip, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, filterMethod === method && styles.filterChipActive]}
                    onPress={() => { setFilterMethod(method); setShowAllHistory(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, filterMethod === method && styles.filterChipTextActive]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Type Filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {["All", "One-time", "Recurring"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, filterType === type && styles.filterChipActive]}
                    onPress={() => { setFilterType(type); setShowAllHistory(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Category Filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {["All", ...DONATION_CATEGORIES].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, filterCategory === cat && styles.filterChipActive]}
                    onPress={() => { setFilterCategory(cat); setShowAllHistory(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {(() => {
            const filteredHistory = donationHistory.filter((d) => {
              if (filterMethod !== "All" && d.method !== filterMethod) return false;
              if (filterType === "Recurring" && !d.isRecurring) return false;
              if (filterType === "One-time" && d.isRecurring) return false;
              if (filterCategory !== "All" && d.fund !== filterCategory) return false;
              return true;
            });

            if (donationHistory.length === 0) {
              return (
                <Text style={{color: colors.textMuted, textAlign: "center", marginTop: 20}}>You haven't made any donations yet.</Text>
              );
            }

            if (filteredHistory.length === 0) {
              return (
                <Text style={{color: colors.textMuted, textAlign: "center", marginTop: 20}}>No donations match the selected filters.</Text>
              );
            }

            return (
              <>
                {(showAllHistory ? filteredHistory : filteredHistory.slice(0, 5)).map((donation, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.historyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedDonation(donation);
                      setReceiptModalOpen(true);
                    }}
                  >
                    <View style={styles.historyIconBox}>
                      <Image
                        source={ICONS.heart}
                        style={styles.historyIcon}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={[styles.historyFund, { color: colors.textDark }]}>{donation.fund}</Text>
                      <Text style={[styles.historyId, { color: colors.textMuted }]}>{donation.branch ? `${donation.branch} * ` : ""}{donation.id}</Text>
                      <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                        {donation.date} * {donation.method}
                      </Text>
                      {donation.isRecurring && (
                        <View style={styles.recurringBadge}>
                          <Text style={styles.recurringBadgeText}>Recurring</Text>
                        </View>
                      )}
                      {donation.status === "pending" && (
                        <View style={[styles.recurringBadge, { backgroundColor: C.goldLight, marginLeft: donation.isRecurring ? 8 : 0 }]}>
                          <Text style={[styles.recurringBadgeText, { color: C.gold }]}>Pending</Text>
                        </View>
                      )}
                      {donation.status === "confirmed" && (
                        <View style={[styles.recurringBadge, { backgroundColor: C.greenLight, marginLeft: donation.isRecurring ? 8 : 0 }]}>
                          <Text style={[styles.recurringBadgeText, { color: C.green }]}>Confirmed</Text>
                        </View>
                      )}
                      {donation.status === "rejected" && (
                        <View style={[styles.recurringBadge, { backgroundColor: "rgba(231,76,60,0.1)", marginLeft: donation.isRecurring ? 8 : 0 }]}>
                          <Text style={[styles.recurringBadgeText, { color: C.red }]}>Rejected</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.historyAmount, { color: colors.textDark }]}>{donation.amount}</Text>
                  </TouchableOpacity>
                ))}

                {filteredHistory.length > 5 && (
                  <TouchableOpacity 
                    style={{
                      paddingVertical: s(14),
                      alignItems: 'center',
                      marginTop: 4,
                      borderWidth: 1,
                      borderColor: C.navBorder,
                      borderRadius: s(12),
                      backgroundColor: "rgba(255,255,255,0.5)"
                    }}
                    activeOpacity={0.7}
                    onPress={() => setShowAllHistory(!showAllHistory)}
                  >
                    <Text style={{ color: C.blue, fontWeight: "700", fontSize: 13 }}>
                      {showAllHistory ? "Show Less" : `View All (${filteredHistory.length})`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
            </>
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* QR Code Full-Screen Modal */}
      <Modal
        visible={qrModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.qrModalOverlay}
          activeOpacity={1}
          onPress={() => setQrModalOpen(false)}
        >
          <View style={[styles.qrModalCard, { backgroundColor: colors.cardBg }]} onStartShouldSetResponder={() => true}>
            {/* GCash-branded header */}
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalHeaderText}>GCash QR Code</Text>
            </View>

            {/* QR Image */}
            <View style={styles.qrModalImageContainer}>
              <Image source={GCASH_QR} style={styles.qrModalImage} resizeMode="contain" />
            </View>

            {/* Account info */}
            <Text style={[styles.qrModalAccountName, { color: colors.textDark }]}>IsangDiwa Church</Text>
            <Text style={[styles.qrModalAccountNumber, { color: colors.textMuted }]}>0912 345 6789</Text>

            {/* Close button */}
            <View style={styles.qrModalActions}>
              <TouchableOpacity
                style={[styles.qrModalCloseBtn, { backgroundColor: isDark ? '#21262D' : '#F1F5F9' }]}
                onPress={() => setQrModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.qrModalCloseBtnText, { color: colors.textDark }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalOpen(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, { padding: 30, backgroundColor: colors.cardBg }]}>
            <View style={[styles.confirmIconContainer, { backgroundColor: receiptData?.status === "pending" ? C.goldLight : C.greenLight }]}>
              <Text style={{ fontSize: 32, color: receiptData?.status === "pending" ? C.gold : C.green, fontWeight: "900" }}>
                {receiptData?.status === "pending" ? "⏳" : "✅"}
              </Text>
            </View>
            <Text style={[styles.confirmTitle, { color: colors.textDark }]}>
              {receiptData?.status === "pending" ? "Donation Submitted!" : "Donation Recorded!"}
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.textMuted }]}>
              {receiptData?.status === "pending"
                ? "Please wait for the Admin to verify your proof of payment. You will be notified once confirmed."
                : "Thank you for your generous contribution. Your payment details have been logged and you can view this transaction in your history."}
            </Text>
            
            <View style={[styles.confirmButtons, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[styles.confirmBtnCancel, { backgroundColor: C.blue }]}
                onPress={() => setSuccessModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmBtnCancelText, { color: "#FFF" }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Donation Confirmation Modal */}
      <Modal
        visible={confirmModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalOpen(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, { padding: 0, overflow: "hidden", backgroundColor: colors.cardBg, maxWidth: 400, alignItems: "stretch" }]}>
            {/* Header */}
            <View style={{ backgroundColor: C.blue, paddingVertical: s(20), paddingHorizontal: s(24), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: fs(19), fontWeight: "800", color: "#FFF", letterSpacing: 0.2 }}>Confirm Your Donation</Text>
              <TouchableOpacity onPress={() => setConfirmModalOpen(false)} activeOpacity={0.7} style={{ padding: 6 }}>
                <Text style={{ fontSize: fs(22), color: "rgba(255,255,255,0.8)", fontWeight: "bold" }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={{ paddingHorizontal: s(24), paddingTop: s(22), paddingBottom: s(24) }}>
              {[
                { label: "Amount", value: `₱${parseFloat(donationAmount.replace(/,/g, "") || "0").toLocaleString()}` },
                { label: "Category", value: selectedCategory },
                { label: "Community", value: selectedBranch },
                { label: "Payment Method", value: `${selectedPayment === "gcash" ? "E-Wallet" : selectedPayment === "bank" ? "Bank Transfer" : "Cash"} — ${subMethod}` },
                { label: "Type", value: isRecurring ? "Recurring (Monthly)" : "One-time" },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: s(13), borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: colors.cardBorder || "#F1F5F9" }}>
                  <Text style={{ fontSize: fs(14), color: colors.textMuted, fontWeight: "500" }}>{item.label}</Text>
                  <Text style={{ fontSize: fs(14), color: colors.textDark, fontWeight: "700", maxWidth: "58%", textAlign: "right" }}>{item.value}</Text>
                </View>
              ))}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.cardBorder || "#F1F5F9", marginVertical: s(16) }} />

              {/* Acknowledgment Checkbox */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: s(14), paddingVertical: s(8) }}
                onPress={() => setDonorAcknowledged(!donorAcknowledged)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, donorAcknowledged && styles.checkboxActive]}>
                  {donorAcknowledged && <Text style={styles.checkmarkText}>✓</Text>}
                </View>
                <Text style={{ flex: 1, fontSize: fs(13), color: colors.textDark, fontWeight: "500", lineHeight: fs(19) }}>
                  I agree to have my name displayed as a donor
                </Text>
              </TouchableOpacity>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[styles.donateBtn, { marginTop: s(22) }]}
                activeOpacity={0.85}
                onPress={() => {
                  setConfirmModalOpen(false);
                  handleSubmitDonation();
                }}
              >
                <Text style={styles.donateBtnText}>Confirm & Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={receiptModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReceiptModalOpen(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, { padding: 0, paddingBottom: 24, overflow: "hidden", backgroundColor: colors.cardBg }]}>
            <View style={{ backgroundColor: C.blue, padding: s(24), paddingBottom: s(32), alignItems: "center", width: "100%" }}>
              <TouchableOpacity
                style={{ position: 'absolute', top: 12, right: 12, padding: 8, zIndex: 10 }}
                activeOpacity={0.7}
                onPress={() => setReceiptModalOpen(false)}
              >
                <Text style={{ fontSize: fs(22), color: "rgba(255,255,255,0.8)", fontWeight: "bold" }}>✕</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: fs(13), color: "rgba(255,255,255,0.7)", fontWeight: "600", marginBottom: 4 }}>DONATION RECEIPT</Text>
              <Text style={{ fontSize: 32, color: "#FFF", fontWeight: "900" }}>{selectedDonation?.amount}</Text>
            </View>
            
            <View style={{ backgroundColor: colors.cardBg, width: "100%", paddingHorizontal: s(24), marginTop: -16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
              <View style={{ paddingVertical: s(20), borderBottomWidth: 1, borderBottomColor: colors.divider, borderStyle: "dashed" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: "500" }}>Transaction ID</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textDark, fontWeight: "700" }}>{selectedDonation?.id}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: "500" }}>Date</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textDark, fontWeight: "700" }}>{selectedDonation?.date}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: "500" }}>Payment Method</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textDark, fontWeight: "700" }}>{selectedDonation?.method}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: fs(13), color: colors.textMuted, fontWeight: "500" }}>Type</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textDark, fontWeight: "700" }}>{selectedDonation?.status}</Text>
                </View>
              </View>

              <View style={{ paddingVertical: s(20), borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <Text style={{ fontSize: fs(14), color: colors.textDark, fontWeight: "700", marginBottom: 8 }}>Donation Allocation</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Category</Text>
                  <Text style={{ fontSize: fs(13), color: colors.textDark, fontWeight: "600" }}>{selectedDonation?.fund}</Text>
                </View>
                {selectedDonation?.branch && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted }}>Community</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textDark, fontWeight: "600" }}>{selectedDonation?.branch}</Text>
                  </View>
                )}
              </View>
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

            {/* Floating Bottom Tab Bar */}
      <FloatingNavBar
        activeTab="Donations"
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
          <View style={[styles.confirmDialog, { backgroundColor: colors.cardBg }]}>
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

      {/* Donation Receipt Modal */}
      <ReceiptModal
        visible={!!receiptData}
        onClose={() => setReceiptData(null)}
        type="donation"
        data={receiptData || {}}
      />
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
    paddingHorizontal: s(18),
    paddingTop: Platform.OS === "ios" ? s(56) : s(42),
    paddingBottom: 14,
  },
  menuBtn: { padding: 4, justifyContent: "center", gap: 5 },
  menuLine: {
    width: s(22),
    height: 2.2,
    backgroundColor: C.textDark,
    borderRadius: 1.2,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: fs(20),
    fontWeight: "600",
    color: C.textDark,
  },
  topSpacer: { width: 28 },

  scroll: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: s(18),
    paddingTop: s(20),
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: fs(26),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(4),
  },
  headerSubtitle: {
    fontSize: fs(14),
    color: C.textMuted,
    lineHeight: fs(20),
  },

  // Summary Grid
  summaryGrid: {
    paddingHorizontal: s(18),
    flexDirection: "row",
    flexWrap: "wrap",
    gap: s(12),
    marginBottom: 18,
  },
  summaryCard: {
    backgroundColor: C.cardBg,
    borderRadius: s(16),
    padding: s(16),
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
  summaryCardWide: { width: "100%" },
  summaryCardHalf: { width: "48%" },
  summaryLeft: { flex: 1, paddingRight: 10 },
  summaryLabel: { fontSize: 12.5, color: C.textMuted, marginBottom: 6 },
  summaryValue: { fontSize: fs(26), fontWeight: "700", color: C.textDark },
  summaryValueSmall: { fontSize: fs(20), fontWeight: "700", color: C.textDark },
  summaryIconBox: {
    width: s(46),
    height: s(46),
    borderRadius: s(14),
    alignItems: "center",
    justifyContent: "center",
  },
  summaryIcon: { width: s(22), height: 22 },

  // Chart
  chartCard: {
    marginHorizontal: s(18),
    borderRadius: s(16),
    padding: s(16),
    marginBottom: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: s(10),
    padding: 3,
  },
  chartToggleBtn: {
    paddingHorizontal: s(12),
    paddingVertical: 6,
    borderRadius: s(8),
  },
  chartToggleText: {
    fontSize: fs(12),
    fontWeight: "700",
  },
  
  // Custom Native Chart
  nativeChartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 190,
    marginTop: s(20),
    paddingHorizontal: 4,
  },
  nativeBarCol: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    height: "100%",
  },
  nativeBarTrack: {
    width: s(24), // width of the bar
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 6,
    justifyContent: "flex-end",
    marginVertical: 6,
  },
  nativeBarFill: {
    width: "100%",
    borderRadius: 6,
  },
  nativeBarLabel: {
    fontSize: fs(11),
    fontWeight: "600",
    height: 16,
  },
  nativeBarValue: {
    fontSize: fs(10),
    fontWeight: "700",
    color: C.textDimmed,
    height: 14,
  },

  // Donation Form
  donationForm: {
    backgroundColor: C.cardBg,
    marginHorizontal: s(18),
    borderRadius: s(18),
    padding: s(20),
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  formTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(16),
  },
  inputLabel: {
    fontSize: fs(13),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(8),
    marginTop: 4,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: s(12),
    paddingHorizontal: s(14),
    height: s(52),
    marginBottom: s(12),
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  currencySymbol: {
    fontSize: fs(16),
    fontWeight: "700",
    color: C.textDark,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: fs(16),
    color: C.textDark,
    fontWeight: "600",
  },
  calcButton: {
    width: s(36),
    height: s(36),
    borderRadius: s(10),
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  calcIcon: {
    width: s(18),
    height: s(18),
    tintColor: "#FFF",
  },
  errorBox: {
    backgroundColor: "rgba(231,76,60,0.1)",
    borderLeftWidth: 3,
    borderLeftColor: C.red,
    padding: s(14),
    borderRadius: s(12),
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
  },
  errorIcon: { width: s(18), height: s(18), tintColor: C.red },
  errorText: {
    flex: 1,
    fontSize: fs(13),
    color: C.red,
    lineHeight: fs(18),
    fontWeight: "600",
  },

  // Quick Amounts
  quickAmounts: {
    flexDirection: "row",
    gap: s(10),
    marginBottom: s(16),
  },
  quickBtn: {
    flex: 1,
    height: s(40),
    borderRadius: s(12),
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cardBg,
  },
  quickBtnActive: {
    backgroundColor: C.blueLight,
    borderColor: C.blue,
  },
  quickBtnText: {
    fontSize: fs(14),
    fontWeight: "600",
    color: C.textMuted,
  },
  quickBtnTextActive: {
    color: C.blue,
  },

  // Dropdown
  dropdownButton: {
    backgroundColor: C.inputBg,
    borderRadius: s(12),
    paddingHorizontal: s(14),
    height: s(52),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: s(8),
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  dropdownButtonText: {
    fontSize: fs(15),
    color: C.textDark,
    fontWeight: "600",
  },
  dropdownPlaceholder: {
    color: C.textMuted,
    fontWeight: "500",
  },
  dropdownArrow: {
    fontSize: fs(10),
    color: C.textMuted,
  },
  dropdownMenu: {
    backgroundColor: C.cardBg,
    borderRadius: s(12),
    marginBottom: s(16),
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: s(14),
    paddingVertical: s(14),
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  dropdownItemText: {
    fontSize: fs(14),
    color: C.textDark,
    fontWeight: "600",
  },
  dropdownItemTextActive: {
    color: C.blue,
    fontWeight: "700",
  },
  checkIcon: {
    fontSize: fs(16),
    color: C.blue,
    fontWeight: "800",
  },
  searchInputContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    backgroundColor: C.inputBg,
  },
  searchInput: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(8),
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    fontSize: fs(14),
    color: C.textDark,
  },

  // Payment Methods
  paymentMethods: {
    flexDirection: "row",
    gap: s(12),
    marginBottom: s(16),
  },
  paymentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: s(14),
    borderRadius: s(12),
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    backgroundColor: C.cardBg,
  },
  paymentBtnActive: {
    backgroundColor: C.blueLight,
    borderColor: C.blue,
  },
  paymentIconBox: {
    width: s(24),
    height: s(24),
    alignItems: "center",
    justifyContent: "center",
  },
  gcashIcon: { width: s(22), height: s(22),  borderRadius: s(30), },
  bankIcon: { width: s(22), height: 22 },
  paymentText: {
    fontSize: fs(13),
    fontWeight: "700",
    color: C.textMuted,
  },
  paymentTextActive: { color: C.blue },
  
  gatewayBox: {
    backgroundColor: C.inputBg,
    borderRadius: s(12),
    padding: s(16),
    marginBottom: s(20),
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  gatewayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: s(12),
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  gatewayLogo: { width: s(20), height: 20 },
  gatewayTitle: { fontSize: fs(14), fontWeight: "700", color: C.textDark },
  gatewayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: s(6),
  },
  gatewayLabel: { fontSize: fs(13), color: C.textMuted, fontWeight: "500" },
  gatewayValue: { fontSize: fs(13), color: C.textDark, fontWeight: "700" },
  gatewayNote: {
    fontSize: fs(11),
    color: C.textMuted,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center"
  },

  // ── Donation Info Panel ──
  donationInfoOuter: {
    marginTop: s(14),
    marginBottom: s(10),
    borderRadius: s(16),
    borderWidth: 1,
    padding: s(14),
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(59,130,246,0.4)',
  },
  donationInfoInstruction: {
    fontSize: fs(12),
    fontWeight: '500',
    lineHeight: fs(18),
    marginBottom: s(12),
  },
  donationInfoPanel: {
    borderRadius: s(12),
    borderWidth: 1,
    padding: s(14),
    overflow: 'hidden',
  },
  donationInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    marginBottom: s(14),
    paddingBottom: s(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.cardBorder,
  },
  donationInfoLogo: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
  },
  donationInfoTitle: {
    fontSize: fs(12),
    fontWeight: "800",
    lineHeight: fs(16),
  },
  donationInfoSubtitle: {
    fontSize: fs(10),
    fontWeight: "500",
    marginTop: 2,
  },
  officialBadge: {
    borderWidth: 1,
    borderRadius: s(6),
    paddingHorizontal: s(6),
    paddingVertical: s(2),
    alignSelf: 'flex-start',
  },
  officialBadgeText: {
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ewalletTabs: {
    flexDirection: "row",
    gap: s(8),
    marginBottom: s(12),
  },
  ewalletTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: s(6),
    paddingVertical: s(10),
    borderRadius: s(10),
  },
  ewalletTabActiveGcash: {
    backgroundColor: "#007BFF",
  },
  ewalletTabActiveMaya: {
    backgroundColor: "rgba(52,199,89,0.15)",
  },
  ewalletDot: {
    width: s(7),
    height: s(7),
    borderRadius: s(4),
  },
  ewalletTabText: {
    fontSize: fs(13),
    fontWeight: "700",
  },
  ewalletTabTextActiveGcash: {
    color: "#FFFFFF",
  },
  ewalletTabTextActiveMaya: {
    color: "#34C759",
  },
  accountCard: {
    borderWidth: 1,
    borderRadius: s(10),
    padding: s(12),
  },
  qrRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(12),
    marginBottom: s(4),
  },
  qrCode: {
    width: s(100),
    height: s(100),
    borderRadius: s(8),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  qrDetails: {
    flex: 1,
    justifyContent: "center",
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: s(7),
  },
  accountRowStacked: {
    paddingVertical: s(6),
  },
  accountDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: s(1),
  },
  accountLabel: {
    fontSize: fs(11),
    fontWeight: "600",
  },
  accountValue: {
    fontSize: fs(12),
    fontWeight: "800",
    marginTop: 1,
  },
  accountValueNumber: {
    fontSize: fs(14),
    fontWeight: "800",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  copyBtn: {
    borderWidth: 1,
    borderRadius: s(6),
    paddingHorizontal: s(8),
    paddingVertical: s(3),
  },
  copyBtnBlock: {
    borderWidth: 1,
    borderRadius: s(6),
    paddingHorizontal: s(10),
    paddingVertical: s(5),
    alignSelf: "flex-start",
    marginTop: s(6),
  },
  copyBtnText: {
    fontSize: fs(10),
    fontWeight: "700",
  },
  accountHint: {
    fontSize: fs(10),
    fontStyle: "italic",
    marginTop: s(8),
    lineHeight: fs(14),
  },

  // QR Tap Hint
  qrTapHint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderBottomLeftRadius: s(8),
    borderBottomRightRadius: s(8),
    paddingVertical: s(3),
    alignItems: "center",
  },
  qrTapHintText: {
    color: "#FFFFFF",
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // QR Full-Screen Modal
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: s(16),
  },
  qrModalCard: {
    width: "100%",
    borderRadius: s(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  qrModalHeader: {
    backgroundColor: "#007BFF",
    paddingVertical: s(16),
    alignItems: "center",
  },
  qrModalHeaderText: {
    color: "#FFFFFF",
    fontSize: fs(18),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  qrModalImageContainer: {
    alignItems: "center",
    paddingVertical: s(24),
    paddingHorizontal: s(20),
  },
  qrModalImage: {
    width: SCREEN_WIDTH - s(120),
    height: SCREEN_WIDTH - s(120),
    borderRadius: s(12),
  },
  qrModalAccountName: {
    textAlign: "center",
    fontSize: fs(18),
    fontWeight: "800",
    marginBottom: s(4),
  },
  qrModalAccountNumber: {
    textAlign: "center",
    fontSize: fs(14),
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: s(20),
  },
  qrModalActions: {
    paddingHorizontal: s(20),
    paddingBottom: s(20),
    gap: s(10),
  },
  qrModalCloseBtn: {
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: "center",
  },
  qrModalCloseBtnText: {
    fontSize: fs(15),
    fontWeight: "700",
  },

  // ── Sender Information ──
  senderRadioRow: {
    flexDirection: "row",
    gap: s(8),
    marginBottom: s(10),
  },
  senderRadioCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(8),
    padding: s(12),
    borderRadius: s(12),
    borderWidth: 1.5,
  },
  senderRadioDot: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  senderRadioDotActive: {
    borderColor: "#007BFF",
    backgroundColor: "#007BFF",
  },
  senderRadioDotInner: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: "#FFFFFF",
  },
  senderRadioTitle: {
    fontSize: fs(11),
    fontWeight: "800",
  },
  senderRadioSub: {
    fontSize: fs(9),
    fontWeight: "500",
    marginTop: 1,
  },
  senderYouBadge: {
    backgroundColor: "rgba(0,123,255,0.12)",
    borderRadius: s(4),
    paddingHorizontal: s(6),
    paddingVertical: 1,
  },
  senderYouBadgeText: {
    fontSize: fs(8),
    fontWeight: "800",
    color: "#007BFF",
  },
  senderAutoCard: {
    borderWidth: 1,
    borderRadius: s(12),
    padding: s(14),
  },
  senderAutoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: s(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  senderAutoLabel: {
    fontSize: fs(11),
    fontWeight: "600",
  },
  senderAutoValue: {
    fontSize: fs(12),
    fontWeight: "800",
  },
  senderAutoValueMono: {
    fontSize: fs(12),
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  senderAutoFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: s(10),
  },
  senderAutoFilledText: {
    fontSize: fs(10),
    fontWeight: "600",
    color: "#34C759",
  },
  senderUseAnotherLink: {
    fontSize: fs(10),
    fontWeight: "700",
    color: "#007BFF",
  },
  senderAnotherCard: {
    borderWidth: 1,
    borderRadius: s(12),
    padding: s(14),
  },
  senderAnotherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: s(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,123,255,0.15)",
  },
  senderAnotherTitle: {
    fontSize: fs(11),
    fontWeight: "800",
  },
  senderCancelLink: {
    fontSize: fs(9),
    fontWeight: "700",
    color: "#007BFF",
  },
  senderDigitCount: {
    fontSize: fs(10),
    fontWeight: "700",
  },
  senderInputHint: {
    fontSize: fs(9),
    fontWeight: "500",
    marginTop: 2,
    marginBottom: s(6),
  },

  // Recurring
  recurringRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(12),
    marginBottom: 18,
  },
  checkbox: {
    width: s(22),
    height: s(22),
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: C.blue, borderColor: C.blue },
  checkmarkText: { fontSize: fs(14), fontWeight: "700", color: "#FFF" },
  recurringText: { flex: 1 },
  recurringTitle: {
    fontSize: fs(14),
    fontWeight: "600",
    color: C.textDark,
    marginBottom: 2,
  },
  recurringSubtitle: { fontSize: fs(12), color: C.textMuted, lineHeight: 16 },

  // Donate Button
  donateBtn: {
    backgroundColor: C.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: s(16),
    borderRadius: s(14),
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  donateBtnIcon: { width: s(20), height: s(20), tintColor: "#FFF" },
  donateBtnText: { fontSize: 15.5, fontWeight: "700", color: "#FFF" },

  // Proof of Payment & AI Auto-Fill
  formSubtitle: {
    fontSize: fs(12.5),
    color: C.textMuted,
    marginTop: s(2),
    lineHeight: fs(17),
  },
  proofSection: {
    marginBottom: s(16),
  },
  proofHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: s(8),
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,107,240,0.1)",
    borderWidth: 1,
    borderColor: "rgba(46,107,240,0.3)",
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    borderRadius: 999,
  },
  aiBadgeText: {
    fontSize: fs(11),
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.3,
  },
  proofUploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: s(14),
    padding: s(20),
    alignItems: "center",
    marginBottom: s(8),
  },
  cloudIconWrapper: {
    width: s(46),
    height: s(46),
    borderRadius: s(23),
    backgroundColor: "rgba(59,130,246,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(8),
  },
  cloudIconText: {
    fontSize: fs(22),
  },
  proofUploadTitle: {
    fontSize: fs(13.5),
    fontWeight: "700",
    marginBottom: s(3),
    textAlign: "center",
  },
  proofUploadHighlight: {
    fontSize: fs(12),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: s(4),
    paddingHorizontal: s(8),
  },
  proofUploadHint: {
    fontSize: fs(11),
    marginBottom: s(12),
    textAlign: "center",
  },
  proofBtnRow: {
    flexDirection: "row",
    gap: s(10),
  },
  proofBtn: {
    backgroundColor: C.blueLight,
    paddingHorizontal: s(16),
    paddingVertical: s(9),
    borderRadius: s(10),
    borderWidth: 1,
    borderColor: C.blue,
  },
  proofBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
  },
  proofBtnIcon: {
    width: 16,
    height: 16,
    tintColor: C.blue,
  },
  proofBtnText: {
    fontSize: fs(13),
    fontWeight: "700",
    color: C.blue,
  },
  proofPreviewContainer: {
    position: "relative",
    marginBottom: s(10),
    borderRadius: s(14),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  proofPreview: {
    width: "100%",
    height: 200,
    borderRadius: s(14),
  },
  proofRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: s(14),
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  proofRemoveText: {
    color: "#FFF",
    fontSize: fs(14),
    fontWeight: "700",
  },
  proofAttachedBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(52,199,89,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: s(8),
    flexDirection: "row",
    alignItems: "center",
  },
  proofAttachedText: {
    fontSize: fs(11),
    fontWeight: "700",
    color: "#FFF",
  },
  proofErrorBanner: {
    position: "absolute",
    bottom: 34,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: s(6),
  },
  proofErrorBannerText: {
    color: "#FFF",
    fontSize: fs(11),
    textAlign: "center",
    fontWeight: "600",
  },
  autoFillSuccessPill: {
    marginTop: s(8),
    paddingHorizontal: s(12),
    paddingVertical: s(8),
    borderRadius: s(8),
    borderWidth: 1,
  },
  autoFillSuccessText: {
    fontSize: fs(11.5),
    fontWeight: "700",
    textAlign: "center",
  },
  detailsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: s(6),
    marginBottom: s(12),
    paddingBottom: s(6),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  detailsSectionTitle: {
    fontSize: fs(12),
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  detailsSectionSubtitle: {
    fontSize: fs(11.5),
    fontStyle: "italic",
  },
  howToGiveCard: {
    marginTop: s(12),
    borderRadius: s(12),
    borderWidth: 1,
    padding: s(12),
  },
  howToGiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: s(6),
    gap: s(6),
  },
  howToGiveInfoIcon: {
    fontSize: fs(14),
  },
  howToGiveTitle: {
    fontSize: fs(13),
    fontWeight: "700",
  },
  howToGiveSteps: {
    gap: s(4),
    paddingLeft: s(4),
  },
  howToGiveStepText: {
    fontSize: fs(11.5),
    lineHeight: fs(16),
  },

  // Donation History
  historySection: { paddingHorizontal: s(18), marginBottom: 20 },
  historyTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(4),
  },
  filterContainer: {
    marginBottom: s(14),
  },
  filterRow: {
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: s(14),
    paddingVertical: 7,
    borderRadius: s(20),
    backgroundColor: "rgba(0,0,0,0.04)",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: C.blueLight,
    borderColor: C.blue,
  },
  filterChipText: {
    fontSize: fs(12),
    fontWeight: "600",
    color: C.textMuted,
  },
  filterChipTextActive: {
    color: C.blue,
    fontWeight: "700",
  },
  historyCard: {
    backgroundColor: C.cardBg,
    borderRadius: s(16),
    padding: s(16),
    marginBottom: s(12),
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(12),
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  historyIconBox: {
    width: s(40),
    height: s(40),
    borderRadius: s(12),
    backgroundColor: C.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  historyIcon: { width: s(20), height: s(20), tintColor: C.gold },
  historyContent: { flex: 1 },
  historyFund: {
    fontSize: fs(14),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 3,
  },
  historyId: { fontSize: fs(13), color: C.textMuted, marginBottom: 2 },
  historyDate: { fontSize: 11.5, color: C.textMuted, marginBottom: 6 },
  recurringBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.purpleLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  recurringBadgeText: { fontSize: fs(11), fontWeight: "700", color: C.purple },
  historyAmount: { fontSize: fs(16), fontWeight: "700", color: C.textDark },

  bottomPad: { height: 110 },

  // Chat Button
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

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.tabBg,
    borderTopWidth: 1,
    borderTopColor: "rgba(100,140,200,0.2)",
    paddingVertical: s(15),
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH / 5,
    height: s(3),
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
  tabIcon: { width: s(26), height: 26 },
  tabLabel: { fontSize: 10 },

  // Sidebar
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
    backgroundColor: C.sidebarBg,
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
  sidebarTitle: { fontSize: fs(18), fontWeight: "800", color: "#FFF" },
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
  sidebarUserName: { fontSize: fs(14), fontWeight: "800", color: "#FFF" },
  sidebarUserEmail: {
    fontSize: fs(11),
    color: C.textMuted,
    marginTop: 1,
    fontWeight: "600",
  },

  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
    paddingVertical: 6,
  },
  signOutIcon: { width: 30, height: s(40), tintColor: C.red },
  signOutText: { fontSize: fs(14), color: C.red, fontWeight: "800" },

  // Sign Out Confirmation Modal
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
});




