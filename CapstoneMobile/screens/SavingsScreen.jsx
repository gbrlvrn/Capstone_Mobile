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
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import { SkeletonStatCard } from "../components/SkeletonLoader";
import { useTheme } from "../components/ThemeContext";
import { useAlert } from "../components/AlertContext";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLinking from "expo-linking";
import { getPublicSettings, getVerificationStatus, createSavingsDeposit, createSavingsTransfer, getSavingsData, createSavingsWithdrawal, createSavingsGoal } from "../services/AuthService";
import EmptyState from "../components/EmptyState";
import OfflineBanner from "../components/OfflineBanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));
const SIDEBAR_WIDTH = s(260);

const LOGO = require("../assets/puac_logo.png");

const ICONS = {
  wallet: require("../assets/icons/wallet.png"),
  document: require("../assets/icons/document.png"),
  heart: require("../assets/icons/heart.png"),
  camera: require("../assets/icons/camera.png"),
  gcash: require("../assets/icons/gcash.png"),
  bank: require("../assets/icons/bank.png"),
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
  clock: require("../assets/icons/clock.png"),
  check: require("../assets/icons/check.png"),
  notification: require("../assets/icons/bell.png"),
  calendar: require("../assets/icons/calendar.png"),
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

const LOAN_MINIMUM_SAVINGS = 1000;

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export default function SavingsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState("Home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Savings data
  const [deposits, setDeposits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);

  // --- MODALS ---
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [formError, setFormError] = useState("");

  const [selectedPayment, setSelectedPayment] = useState("gcash");
  const [paymentApprovalMethod, setPaymentApprovalMethod] = useState("manual");
  const [subMethod, setSubMethod] = useState("GCash");
  const [subMethodDropdownOpen, setSubMethodDropdownOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofImage, setProofImage] = useState(null);
  const [activeDepositGoalId, setActiveDepositGoalId] = useState(null);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);

  // Success modal & receipt modal
  const [successDeposit, setSuccessDeposit] = useState(null); // holds last submitted deposit info
  const [receiptTxn, setReceiptTxn] = useState(null);         // holds tapped history txn

  // Transfer states
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFromGoalId, setTransferFromGoalId] = useState(null);
  const [transferToGoalId, setTransferToGoalId] = useState(null);
  const [showTransferFromDropdown, setShowTransferFromDropdown] = useState(false);
  const [showTransferToDropdown, setShowTransferToDropdown] = useState(false);

  // Withdrawal states
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawGoalId, setWithdrawGoalId] = useState(null);
  const [withdrawMethod, setWithdrawMethod] = useState("gcash");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [showWithdrawDropdown, setShowWithdrawDropdown] = useState(false);



  // Staggered entrance animations for 3 stat cards
  const statAnims = useRef([0, 1, 2].map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(18),
  }))).current;

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

    return () => { mounted = false; };
  }, [route?.params?.email]);

  // Re-fetch role on focus
  useFocusEffect(
    useCallback(() => {
      if (!userEmail) return;
      (async () => {
        try {
          const data = await getVerificationStatus(userEmail);
          if (data?.role) setUserRole(data.role);
          if (data?.position) setUserPosition(data.position);
        } catch {
          // silently fail
        }
      })();
    }, [userEmail])
  );

  // Load savings data " fetch from backend API, fall back to local cache
  const loadSavingsData = useCallback(async () => {
    if (!userEmail) return;
    try {
      // Fetch fresh data from backend (reflects admin confirmations)
      const response = await getSavingsData();
      const serverDeposits = response?.savings || [];
      const serverGoals = response?.goals || [];

      // Cache to AsyncStorage for offline access
      await AsyncStorage.setItem(`faithly_savings_${userEmail}`, JSON.stringify(serverDeposits));
      await AsyncStorage.setItem(`faithly_savings_goals_${userEmail}`, JSON.stringify(serverGoals));

      setDeposits(serverDeposits);
      
      // Map server goals to mobile app format
      const mappedGoals = serverGoals.map(g => ({
        id: g._id || g.id,
        name: g.name,
        target: g.targetAmount,
        amountSaved: g.savedAmount || 0,
        createdAt: g.createdAt || new Date().toISOString(),
        status: g.status
      }));
      setGoals(mappedGoals);

      // Only count confirmed deposits OR pending gateway deposits toward total savings
      let total = 0;
      serverDeposits.forEach(d => {
        const status = (d.status || "").toLowerCase();
        const isConfirmed = status === 'confirmed';
        const isGatewayPending = paymentApprovalMethod === 'gateway' && 
                                 status === 'pending' && 
                                 d.paymongoSessionId;

        if (isConfirmed || isGatewayPending) {
          if (d.type === "withdrawal") {
            total -= parseFloat(d.amount) || 0;
          } else {
            total += parseFloat(d.amount) || 0;
          }
        }
      });
      setTotalSavings(total);
    } catch (e) {
      if (e.message === 'Invalid or expired token') {
        console.log('Token expired " redirecting to login');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      console.log("Failed to load savings from server, using cache", e);
      // Fall back to local cache if API fails (offline mode)
      try {
        const savedDeposits = await AsyncStorage.getItem(`faithly_savings_${userEmail}`);
        const savedGoals = await AsyncStorage.getItem(`faithly_savings_goals_${userEmail}`);
        const parsedDeposits = savedDeposits ? JSON.parse(savedDeposits) : [];
        const parsedGoals = savedGoals ? JSON.parse(savedGoals) : [];
        
        const mappedCachedGoals = parsedGoals.map(g => ({
          id: g._id || g.id,
          name: g.name,
          target: g.targetAmount || g.target,
          amountSaved: g.savedAmount || g.amountSaved || 0,
          createdAt: g.createdAt || new Date().toISOString(),
          status: g.status
        }));
        
        setDeposits(parsedDeposits);
        setGoals(mappedCachedGoals);

        let total = 0;
        parsedDeposits.forEach(d => {
          const status = (d.status || "").toLowerCase();
          const isConfirmed = status === 'confirmed';
          const isGatewayPending = paymentApprovalMethod === 'gateway' && 
                                   status === 'pending' && 
                                   d.paymongoSessionId;

          if (isConfirmed || isGatewayPending) {
            if (d.type === "withdrawal") {
              total -= parseFloat(d.amount) || 0;
            } else {
              total += parseFloat(d.amount) || 0;
            }
          }
        });
        setTotalSavings(total);
      } catch (cacheErr) {
        console.log("Cache load also failed:", cacheErr);
      }
    }
  }, [userEmail, paymentApprovalMethod]);

  useFocusEffect(
    useCallback(() => {
      loadSavingsData();
    }, [loadSavingsData])
  );

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

  // Deep linking listener
  useEffect(() => {
    const handleDeepLink = (event) => {
      if (event.url && event.url.includes("puac://payment/success?type=savings")) {
        setSuccessModalOpen(true);
        loadSavingsData();
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
  }, [loadSavingsData]);

  // Loading + entrance animations
  useEffect(() => {
    let mounted = true;
    getPublicSettings()
      .then((res) => {
        if (mounted && res && res.paymentApprovalMethod) {
          setPaymentApprovalMethod(res.paymentApprovalMethod);
        }
      })
      .catch((err) => console.log("Failed to fetch settings:", err));

    const timer = setTimeout(() => {
      if (!mounted) return;
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
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navWithEmail = useCallback(
    (screen) => navigation.replace(screen, { email: userEmail }),
    [navigation, userEmail],
  );

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    Animated.timing(slideX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [slideX]);

  const closeSidebar = useCallback(() => {
    Animated.timing(slideX, { toValue: -SIDEBAR_WIDTH, duration: 250, useNativeDriver: true }).start(() => setSidebarOpen(false));
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
      tension: 80, friction: 10, useNativeDriver: true,
    }).start();

    TAB_ITEMS.forEach((tab, vi) => {
      const ai = ALL_TAB_ITEMS.findIndex(t => t.key === tab.key);
      if (ai === -1) return;
      if (vi === index) {
        Animated.parallel([
          Animated.spring(tabAnimations[ai].scale, { toValue: 1.2, tension: 100, friction: 6, useNativeDriver: true }),
          Animated.timing(tabAnimations[ai].bgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(tabAnimations[ai].scale, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
          Animated.timing(tabAnimations[ai].bgOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();
      }
    });
  }, [activeTab, indicatorPosition, tabAnimations, TAB_ITEMS, TAB_WIDTH]);

  // Handle deposit submission
  const handleAddDeposit = async () => {
    setFormError("");
    setSubmitting(true);
    const rawAmount = depositAmount.replace(/,/g, "");
    const amount = parseFloat(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount.");
      setSubmitting(false);
      return;
    }

    if (!activeDepositGoalId) {
      setFormError("Please select a goal.");
      setSubmitting(false);
      return;
    }

    const isManual = paymentApprovalMethod === "manual";
    const isCash = selectedPayment === "cash";

    if (isManual && !isCash) {
      if (!accountName || !accountName.trim()) {
        setFormError("Please enter your account name.");
        setSubmitting(false);
        return;
      }
      if (!accountNumber || !accountNumber.trim()) {
        setFormError("Please enter your account number.");
        setSubmitting(false);
        return;
      }
      if (!proofImage || !proofImage.base64) {
        setFormError("Please upload proof of deposit before submitting.");
        setSubmitting(false);
        return;
      }
    }

    const activeGoal = goals.find(g => g.id === activeDepositGoalId);

    // Build payload matching the web backend API spec exactly:
    // description (not note), paymentMethod as readable string, source field
    const readableMethod = selectedPayment === "gcash" ? "GCash"
                         : selectedPayment === "bank"  ? "Bank Transfer"
                         : "Cash";

    let payload = {
      goalId: activeDepositGoalId,
      amount: amount,
      description: depositNote.trim() || "Savings Deposit",
      source: "Manual",
      paymentMethod: readableMethod,
    };

    let backendPayload = { ...payload };

    // Always include reference number if provided
    if (referenceNumber.trim()) backendPayload.referenceNumber = referenceNumber.trim();

    if (isManual && !isCash) {
      backendPayload.subMethod = subMethod;
      backendPayload.accountName = accountName;
      backendPayload.accountNumber = accountNumber;
      backendPayload.proofOfPayment = proofImage && proofImage.base64 ? `data:image/jpeg;base64,${proofImage.base64}` : null;
      backendPayload.proofFileName = "screenshot.jpg";
    }

    if (!isManual && !isCash) {
      backendPayload.successUrl = ExpoLinking.createURL("payment/success", { queryParams: { type: "savings" } });
      backendPayload.cancelUrl = ExpoLinking.createURL("payment/cancel");
    }

    try {
      const response = await createSavingsDeposit(backendPayload);
      if (!isManual && !isCash && response && response.checkoutUrl) {
        Linking.openURL(response.checkoutUrl);
      } else {
        // Show in-app success modal with deposit details
        setSuccessDeposit({
          amount: parseFloat(backendPayload.amount),
          description: backendPayload.description,
          paymentMethod: backendPayload.paymentMethod,
          referenceNumber: backendPayload.referenceNumber || response?.deposit?.referenceNumber || "",
          goalName: goals.find(g => g.id === activeDepositGoalId)?.name || "Savings",
          date: new Date().toLocaleString(),
        });
        loadSavingsData();
      }
    } catch (e) {
      console.log("Failed to submit deposit:", e?.message || e);
      const msg = e?.message || "Failed to submit deposit.";
      setFormError(msg);
      showAlert("Deposit Error", msg);
      setSubmitting(false);
      return;
    }

    setDepositAmount("");
    setDepositNote("");
    setProofImage(null);
    setAccountName("");
    setAccountNumber("");
    setReferenceNumber("");
    setActiveDepositGoalId(null);
    setDepositModalOpen(false);
    setSubmitting(false);
  };

  const handleTransfer = async () => {
    setFormError("");
    setSubmitting(true);
    const rawAmount = transferAmount.replace(/,/g, "");
    const amount = parseFloat(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount.");
      setSubmitting(false);
      return;
    }

    if (!transferFromGoalId || !transferToGoalId) {
      setFormError("Please select both goals.");
      setSubmitting(false);
      return;
    }

    if (transferFromGoalId === transferToGoalId) {
      setFormError("Cannot transfer to the same goal.");
      setSubmitting(false);
      return;
    }

    const fromGoal = goals.find(g => g.id === transferFromGoalId);
    if (!fromGoal || (fromGoal.amountSaved || 0) < amount) {
      setFormError("Insufficient funds in the source goal.");
      setSubmitting(false);
      return;
    }

    const toGoal = goals.find(g => g.id === transferToGoalId);

    try {
      await createSavingsTransfer({
        fromGoalId: transferFromGoalId,
        toGoalId: transferToGoalId,
        goalName: toGoal?.name || "Transferred Goal",
        goalTarget: toGoal?.target || 0,
        amount: amount
      });
      showAlert("Success", "Transfer completed instantly.");
      
      const updatedGoals = goals.map(g => {
        if (g.id === transferFromGoalId) {
          return { ...g, amountSaved: (g.amountSaved || 0) - amount };
        }
        if (g.id === transferToGoalId) {
          return { ...g, amountSaved: (g.amountSaved || 0) + amount };
        }
        return g;
      });
      setGoals(updatedGoals);
      await AsyncStorage.setItem(`faithly_savings_goals_${userEmail}`, JSON.stringify(updatedGoals));
      
    } catch (err) {
      console.log("Failed transfer:", err);
      setFormError("Failed to process transfer.");
      setSubmitting(false);
      return;
    }

    setTransferAmount("");
    setTransferFromGoalId(null);
    setTransferToGoalId(null);
    setTransferModalOpen(false);
    setSubmitting(false);
  };

  const handleWithdraw = async () => {
    setFormError("");
    setSubmitting(true);
    const rawAmount = withdrawAmount.replace(/,/g, "");
    const amount = parseFloat(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount.");
      setSubmitting(false);
      return;
    }

    if (!withdrawGoalId) {
      setFormError("Please select a goal.");
      setSubmitting(false);
      return;
    }

    const goal = goals.find(g => g.id === withdrawGoalId);
    if (!goal || (goal.amountSaved || 0) < amount) {
      setFormError("Insufficient funds in this goal.");
      setSubmitting(false);
      return;
    }

    if (!withdrawAccount.trim()) {
      setFormError("Please provide account details (GCash number or Bank info).");
      setSubmitting(false);
      return;
    }

    try {
      await createSavingsWithdrawal({
        goalId: withdrawGoalId,
        amount: amount,
        note: withdrawNote.trim() || "Savings Withdrawal",
        method: withdrawMethod === "gcash" ? "GCash" : "Bank Transfer",
        accountDetails: withdrawAccount.trim()
      });
      showAlert("Success", "Withdrawal request submitted for approval.");
      setWithdrawModalOpen(false);
      setWithdrawAmount("");
      setWithdrawNote("");
      setWithdrawAccount("");
      setWithdrawGoalId(null);
      loadSavingsData();
    } catch (e) {
      console.log("Withdrawal error:", e);
      setFormError(e.message || "Failed to submit withdrawal.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle goal creation
  const handleAddGoal = async () => {
    setFormError("");

    if (!goalName.trim()) {
      setFormError("Please enter a goal name.");
      return;
    }

    const rawTarget = goalTarget.replace(/,/g, "");
    const target = parseFloat(rawTarget);

    if (isNaN(target) || target <= 0) {
      setFormError("Please enter a valid target amount.");
      return;
    }

    try {
      const response = await createSavingsGoal({
        name: goalName.trim(),
        targetAmount: target
      });

      showAlert("Success", "Savings goal created successfully!");
      setGoalName("");
      setGoalTarget("");
      setGoalModalOpen(false);
      loadSavingsData(); // refresh from backend
    } catch (e) {
      console.log("Failed to create goal:", e);
      setFormError(e.message || "Failed to create savings goal.");
    }
  };

  // Delete a goal
  const handleDeleteGoal = (goalId) => {
    showAlert(
      "Remove Goal",
      "Are you sure you want to remove this savings goal? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const updatedGoals = goals.filter(g => g.id !== goalId);
            setGoals(updatedGoals);
            try {
              await AsyncStorage.setItem(`faithly_savings_goals_${userEmail}`, JSON.stringify(updatedGoals));
            } catch (e) {
              console.log("Failed to delete goal:", e);
            }
          }
        }
      ]
    );
  };

  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  let thisMonthTotalToDisplay = 0;
  let totalSavingsToDisplay = 0;

  deposits.forEach(d => {
    // Only count strictly confirmed deposits toward total savings to match the web app database
    const isEffectivelyConfirmed = d.status === "confirmed";

    if (isEffectivelyConfirmed) {
      if (d.type === "withdrawal") {
        totalSavingsToDisplay -= parseFloat(d.amount) || 0;
      } else {
        totalSavingsToDisplay += parseFloat(d.amount) || 0;
      }
    }

    try {
      // Handle both ISO date strings from backend and legacy MM/DD/YYYY
      const dateStr = d.date || d.createdAt || "";
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        if ((parsed.getMonth() + 1) === currentMonthNum && parsed.getFullYear() === currentYearNum) {
          if (isEffectivelyConfirmed && d.type !== "withdrawal") {
            thisMonthTotalToDisplay += parseFloat(d.amount) || 0;
          }
        }
      }
    } catch {
      // skip malformed dates
    }
  });
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthName = monthNames[currentMonthNum - 1];

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
        <View style={{ flex: 1, alignItems: "center" }}><Image source={LOGO} style={{ width: s(36), height: 36, borderRadius: 18 }} resizeMode="cover" /></View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications", { email: userEmail })} style={{ padding: 4 }} activeOpacity={0.6}><Image source={ICONS.notification} style={{ width: s(22), height: s(22), tintColor: colors.textDark }} resizeMode="contain" /></TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await loadSavingsData();
            setRefreshing(false);
          }} tintColor="#0D1F45" colors={["#0D1F45"]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.textDark }]}>My Savings</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
              Build your goals and grow your funds
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.headerDepositBtn, { backgroundColor: C.blueLight }]}
                activeOpacity={0.8}
                onPress={() => { setFormError(""); setTransferModalOpen(true); }}
              >
                <Text style={[styles.headerDepositBtnText, { color: C.blue }]}>⇄ Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerDepositBtn}
                activeOpacity={0.8}
                onPress={() => { setFormError(""); setDepositModalOpen(true); }}
              >
                <Text style={styles.headerDepositBtnText}>+ Deposit</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.headerDepositBtn, { backgroundColor: "rgba(231,76,60,0.1)", marginTop: 0, width: "100%", borderColor: "rgba(231,76,60,0.2)", borderWidth: 1 }]}
              activeOpacity={0.8}
              onPress={() => { setFormError(""); setWithdrawModalOpen(true); }}
            >
              <Text style={[styles.headerDepositBtnText, { color: C.red, textAlign: "center" }]}>↓ Withdraw </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PUAC Alert Banner */}
        <View style={styles.puacAlertBox}>
          <Text style={styles.puacAlertText}>
            <Text style={{ fontWeight: "700", color: C.blue }}>Your savings determine your loanable amount. </Text>
            Grow your savings to unlock higher limits for Personal, Emergency, and Short-Term loans.
          </Text>
        </View>

        {/* Stats Cards */}
        {loading ? (
          <View style={styles.statsContainer}>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </View>
        ) : (
          <View style={[styles.statsContainer, { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }]}>
            {/* Total Savings Card */}
            <Animated.View style={[styles.statCardGrid, { backgroundColor: colors.cardBg, borderColor: C.green, opacity: statAnims[0].opacity, transform: [{ translateY: statAnims[0].translateY }] }]}>
              <View style={styles.statHeaderRow}>
                <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: fs(11), textTransform: "uppercase" }]}>Total Savings</Text>
                <Image source={ICONS.wallet} style={{ width: 14, height: 14, tintColor: C.blue }} resizeMode="contain" />
              </View>
              <Text style={[styles.statValue, { color: C.green, marginTop: 4, fontSize: 18 }]}>₱{(totalSavingsToDisplay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 4 }}>Current balance</Text>
            </Animated.View>

            {/* This Month Card */}
            <Animated.View style={[styles.statCardGrid, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: statAnims[0].opacity, transform: [{ translateY: statAnims[0].translateY }] }]}>
              <View style={styles.statHeaderRow}>
                <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: fs(11), textTransform: "uppercase" }]}>This Month</Text>
                <Image source={ICONS.calendar} style={{ width: 14, height: 14, tintColor: C.blue }} resizeMode="contain" />
              </View>
              <Text style={[styles.statValue, { color: colors.textDark, marginTop: 4, fontSize: 18 }]}>₱{thisMonthTotalToDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 4 }}>Deposited in {currentMonthName} {currentYearNum}</Text>
            </Animated.View>

            {/* Active Goals Card */}
            <Animated.View style={[styles.statCardGrid, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: statAnims[0].opacity, transform: [{ translateY: statAnims[0].translateY }] }]}>
              <View style={styles.statHeaderRow}>
                <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: fs(11), textTransform: "uppercase" }]}>Active Goals</Text>
                <Image source={ICONS.check} style={{ width: 14, height: 14, tintColor: C.blue }} resizeMode="contain" />
              </View>
              <Text style={[styles.statValue, { color: colors.textDark, marginTop: 4, fontSize: 18 }]}>{goals.length}</Text>
              <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 4 }}>
                {goals.filter(g => (g.amountSaved || 0) < g.target).length} in progress · {goals.filter(g => (g.amountSaved || 0) >= g.target).length} done
              </Text>
            </Animated.View>

            {/* Max Loanable Card */}
            <Animated.View style={[styles.statCardGrid, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: statAnims[0].opacity, transform: [{ translateY: statAnims[0].translateY }] }]}>
              <View style={styles.statHeaderRow}>
                <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: fs(11), textTransform: "uppercase" }]}>Max Loanable</Text>
                <Image source={ICONS.document} style={{ width: 14, height: 14, tintColor: C.blue }} resizeMode="contain" />
              </View>
              <Text style={[styles.statValue, { color: colors.textDark, marginTop: 4, fontSize: 18 }]}>₱{(totalSavingsToDisplay * 2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 4 }}>Personal loan (2x limits)</Text>
            </Animated.View>
          </View>
        )}

        {/* Savings Goals Section */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Savings goals</Text>
          <TouchableOpacity activeOpacity={0.6} onPress={() => { setFormError(""); setGoalModalOpen(true); }}>
            <Text style={{ color: C.blue, fontWeight: "700", fontSize: 13 }}>+ New goal</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.goalsContainer, { backgroundColor: colors.cardBg }]}>
          {goals.length === 0 ? (
            <View style={{ padding: s(24), alignItems: "center" }}>
              <Text style={{ color: colors.textMuted }}>No goals set up yet.</Text>
            </View>
          ) : (
            goals.map((goal, index) => {
              const amountSaved = goal.amountSaved || 0;
              const progress = Math.min(1, amountSaved / goal.target);
              return (
                <View key={goal.id} style={[styles.sleekGoalItem, index !== goals.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#E8ECF0" }]}>
                   <View style={styles.sleekGoalHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sleekGoalName, { color: colors.textDark }]}>{goal.name}</Text>
                        <Text style={[styles.sleekGoalSub, { color: colors.textMuted }]}>Target ₱{goal.target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.sleekGoalSavedText, { color: colors.textDark }]}>₱{amountSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                        <Text style={[styles.sleekGoalSub, { color: colors.textMuted }]}>of ₱{goal.target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                      </View>
                   </View>
                   
                   <View style={styles.sleekProgressBarRow}>
                      <View style={styles.sleekProgressBg}>
                        <View style={[styles.sleekProgressFill, { width: `${progress * 100}%` }]} />
                      </View>
                      <Text style={styles.sleekProgressPercentText}>{Math.round(progress * 100)}%</Text>
                   </View>
                   <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8, gap: 16 }}>
                     <TouchableOpacity onPress={() => {
                        setActiveDepositGoalId(goal.id);
                        setFormError("");
                        setDepositModalOpen(true);
                     }} activeOpacity={0.6}>
                        <Text style={{ color: C.blue, fontSize: fs(11), fontWeight: "700" }}>Add Savings</Text>
                     </TouchableOpacity>

                     {/* Only allow removal if no money has been saved yet */}
                     {amountSaved === 0 && (
                       <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)} activeOpacity={0.6}>
                          <Text style={{ color: C.red, fontSize: fs(11), fontWeight: "700" }}>Remove</Text>
                       </TouchableOpacity>
                     )}
                   </View>
                </View>
              );
            })
          )}
        </View>

        {/* Transaction History */}
        <View style={[styles.sectionRow, { marginTop: 10 }]}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Transaction history</Text>
          <TouchableOpacity activeOpacity={0.6}>
            <Text style={{ color: C.blue, fontWeight: "700", fontSize: 13 }}>View all</Text>
          </TouchableOpacity>
        </View>

        {deposits.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="No Deposits Yet"
            subtitle="Start adding deposits to track your history here."
            ctaLabel="Deposit Now"
            onCta={() => { setFormError(""); setDepositModalOpen(true); }}
          />
        ) : (
          <View style={[styles.historyList, { backgroundColor: colors.cardBg, marginBottom: 20 }]}>
            {deposits.map((dep, idx) => {
              const displayStatus = (dep.status === "pending" && paymentApprovalMethod !== "manual") ? "confirmed" : (dep.status || "pending");
              const isWithdrawal = dep.type === "withdrawal";
              const dateStr = (() => { try { const dt = new Date(dep.date || dep.createdAt); return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString(); } catch { return ""; } })();
              return (
                <TouchableOpacity
                  key={dep._id || dep.id || idx}
                  activeOpacity={0.7}
                  onPress={() => setReceiptTxn({ ...dep, displayStatus, dateStr })}
                  style={[styles.sleekHistoryItem, idx !== deposits.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#E8ECF0" }]}
                >
                  <View style={[styles.sleekHistoryIconBox, isWithdrawal && { backgroundColor: "rgba(231,76,60,0.1)" }]}>
                    <Text style={{ fontSize: fs(16), color: isWithdrawal ? C.red : C.green }}>{isWithdrawal ? "↓" : "↑"}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={[styles.sleekHistoryTitle, { color: colors.textDark }]}>{isWithdrawal ? "Withdrawal" : "Deposit"} · {dep.description || dep.note || dep.goalName || "Savings"}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                      <Text style={[styles.sleekHistoryDate, { color: colors.textMuted }]}>{dateStr} · {dep.paymentMethod || dep.method || "Manual"}</Text>
                      <View style={[styles.sleekValidatedBadge, displayStatus === "pending" && { backgroundColor: "rgba(255,149,0,0.12)" }, displayStatus === "rejected" && { backgroundColor: "rgba(231,76,60,0.12)" }]}>
                        <Text style={[styles.sleekValidatedText, displayStatus === "pending" && { color: "#FF9500" }, displayStatus === "rejected" && { color: "#E74C3C" }]}>{displayStatus.toUpperCase()}</Text>
                      </View>
                    </View>
                    {dep.referenceNumber ? (
                      <Text style={[styles.sleekHistoryDate, { color: colors.textMuted, marginTop: 2 }]}>Ref: {dep.referenceNumber}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.historyAmount, { color: isWithdrawal ? C.red : C.green }]}>
                    {isWithdrawal ? "-" : "+"}₱{parseFloat(dep.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Floating draggable chat button */}
      <DraggableChatButton onPress={() => setChatbotOpen(true)} />

      <ChatbotModal
        visible={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />

      {/* ── Deposit Success Modal ── */}
      <Modal visible={!!successDeposit} transparent animationType="fade" onRequestClose={() => setSuccessDeposit(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: s(24), padding: 32, alignItems: "center", width: "100%", maxWidth: 360, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 }}>
            {/* Green check circle */}
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#E8FAF0", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <View style={{ width: s(52), height: s(52), borderRadius: 26, backgroundColor: "#34C759", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: fs(26), color: "#fff" }}>✓</Text>
              </View>
            </View>
            <Text style={{ fontSize: fs(20), fontWeight: "800", color: "#0D1F45", marginBottom: 4 }}>Deposit Submitted!</Text>
            <Text style={{ fontSize: fs(13), color: "#6B7FA3", marginBottom: s(24), textAlign: "center" }}>Your deposit is pending admin validation.</Text>

            {/* Receipt rows */}
            {[
              { label: "Goal", value: successDeposit?.goalName },
              { label: "Amount", value: successDeposit ? `₱${successDeposit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "" },
              { label: "Method", value: successDeposit?.paymentMethod },
              { label: "Description", value: successDeposit?.description },
              successDeposit?.referenceNumber ? { label: "Reference ID", value: successDeposit.referenceNumber } : null,
              { label: "Date", value: successDeposit?.date },
            ].filter(Boolean).map((row, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", paddingVertical: 7, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: "#F0F3F8" }}>
                <Text style={{ fontSize: fs(13), color: "#6B7FA3", fontWeight: "500" }}>{row.label}</Text>
                <Text style={{ fontSize: fs(13), color: "#0D1F45", fontWeight: "700", flexShrink: 1, textAlign: "right", marginLeft: 8 }}>{row.value}</Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setSuccessDeposit(null)}
              style={{ marginTop: 24, backgroundColor: "#34C759", borderRadius: s(14), paddingVertical: s(14), paddingHorizontal: 48, width: "100%" }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: fs(15), textAlign: "center" }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Transaction Receipt Modal ── */}
      <Modal visible={!!receiptTxn} transparent animationType="slide" onRequestClose={() => setReceiptTxn(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: s(28), paddingBottom: 40 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: fs(17), fontWeight: "800", color: "#0D1F45" }}>Transaction Receipt</Text>
              <TouchableOpacity onPress={() => setReceiptTxn(null)}>
                <Text style={{ fontSize: fs(22), color: "#6B7FA3", lineHeight: 24 }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Type badge */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 56, height: 56, borderRadius: s(28), backgroundColor: receiptTxn?.type === "withdrawal" ? "rgba(231,76,60,0.1)" : "rgba(52,199,89,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: fs(24), color: receiptTxn?.type === "withdrawal" ? C.red : C.green }}>{receiptTxn?.type === "withdrawal" ? "↓" : "↑"}</Text>
              </View>
              <Text style={{ fontSize: fs(26), fontWeight: "800", color: receiptTxn?.type === "withdrawal" ? C.red : C.green }}>
                {receiptTxn?.type === "withdrawal" ? "-" : "+"}₱{receiptTxn ? parseFloat(receiptTxn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
              </Text>
              <View style={{ marginTop: 6, paddingHorizontal: s(12), paddingVertical: 3, borderRadius: s(20), backgroundColor: receiptTxn?.displayStatus === "confirmed" ? "rgba(52,199,89,0.12)" : receiptTxn?.displayStatus === "rejected" ? "rgba(231,76,60,0.12)" : "rgba(255,149,0,0.12)" }}>
                <Text style={{ fontSize: fs(11), fontWeight: "700", color: receiptTxn?.displayStatus === "confirmed" ? C.green : receiptTxn?.displayStatus === "rejected" ? C.red : "#FF9500" }}>{(receiptTxn?.displayStatus || "").toUpperCase()}</Text>
              </View>
            </View>

            {/* Detail rows */}
            {[
              { label: "Type", value: receiptTxn?.type === "withdrawal" ? "Withdrawal" : "Deposit" },
              { label: "Goal", value: receiptTxn?.goalName || "—" },
              { label: "Description", value: receiptTxn?.description || receiptTxn?.note || "—" },
              { label: "Payment Method", value: receiptTxn?.paymentMethod || receiptTxn?.method || "Manual" },
              { label: "Reference ID", value: receiptTxn?.referenceNumber || "—" },
              { label: "Date", value: receiptTxn?.dateStr || "—" },
            ].map((row, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: s(10), borderBottomWidth: 1, borderBottomColor: "#F0F3F8" }}>
                <Text style={{ fontSize: fs(13), color: "#6B7FA3", fontWeight: "500" }}>{row.label}</Text>
                <Text style={{ fontSize: fs(13), color: "#0D1F45", fontWeight: "700", flexShrink: 1, textAlign: "right", marginLeft: 16 }}>{row.value}</Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setReceiptTxn(null)}
              style={{ marginTop: s(22), backgroundColor: "#0D1F45", borderRadius: s(14), paddingVertical: 14 }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: fs(15), textAlign: "center" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

            {/* Floating Bottom Tab Bar */}
      {/* Sidebar overlay */}
      {sidebarOpen ? (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSidebar} />
      ) : null}

      {/* Sidebar drawer */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideX }] }]}>
        <View style={styles.sidebarHeader}>
          <Image source={LOGO} style={styles.sidebarLogo} resizeMode="contain" />
          <Text style={styles.sidebarTitle}>IsangDiwa</Text>
        </View>

        <View style={styles.sidebarNav}>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = item.key === "Savings";
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => {
                  if (item.key === "Savings") {
                    closeSidebar();
                    return;
                  }
                  setActiveTab(item.key);
                  closeSidebar();
                  navWithEmail(item.key);
                }}
                activeOpacity={0.6}
              >
                <Image
                  source={item.icon}
                  style={[styles.sidebarIcon, { tintColor: isActive ? C.blue : C.textMuted }]}
                  resizeMode="contain"
                />
                <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>
                  {item.key}
                </Text>
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
              <Text style={styles.sidebarUserName}>
                {userRole === "officer" && userPosition ? userPosition : "Member"}
              </Text>
              <Text style={styles.sidebarUserEmail} numberOfLines={1} ellipsizeMode="tail">
                {userEmail || "No email loaded"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutRow}
            activeOpacity={0.6}
            onPress={() => setShowSignOutConfirm(true)}
          >
            <Image source={ICONS.signout} style={styles.signOutIcon} resizeMode="contain" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Sign Out Confirmation Modal */}
      <Modal visible={showSignOutConfirm} transparent animationType="fade" onRequestClose={() => setShowSignOutConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmDialog, { backgroundColor: colors.cardBg }]}>
            <View style={styles.confirmIconContainer}>
              <Image source={ICONS.signout} style={styles.confirmIcon} resizeMode="contain" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.textDark }]}>Sign Out</Text>
            <Text style={[styles.confirmMessage, { color: colors.textMuted }]}>
              Are you sure you want to sign out of your account?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmBtnCancel} activeOpacity={0.7} onPress={() => setShowSignOutConfirm(false)}>
                <Text style={[styles.confirmBtnCancelText, { color: colors.textDark }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtnSignOut} activeOpacity={0.7} onPress={handleSignOut}>
                <Text style={styles.confirmBtnSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Deposit Modal */}
      <Modal visible={depositModalOpen} transparent animationType="fade" onRequestClose={() => setDepositModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.cardBg, padding: 0 }]}>
              
              <View style={{ padding: s(24), paddingBottom: 0 }}>
                <View style={[styles.modalHeaderRow, { marginBottom: 20 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textDark, fontSize: fs(18), marginBottom: 2 }]}>Deposit to savings</Text>
                    <Text style={{ color: "#6B7FA3", fontSize: 13 }}>Choose a goal and enter the amount you'd like to add.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDepositModalOpen(false)} style={styles.modalCloseIconBtn}>
                    <Text style={styles.modalCloseIconText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_WIDTH * 1.2 }}>
                  <Text style={styles.customLabel}>GOAL</Text>
                  <View style={{ zIndex: 10, position: "relative" }}>
                    <TouchableOpacity style={styles.dropdownSelectBox} activeOpacity={0.8} onPress={() => setShowGoalDropdown(!showGoalDropdown)}>
                      <Text style={[styles.dropdownSelectedText, !activeDepositGoalId && {color: "#6B7FA3"}]}>
                        {activeDepositGoalId 
                          ? (() => { const g = goals.find(x => x.id === activeDepositGoalId); return g ? `${g.name} · ₱${(g.amountSaved || 0).toLocaleString()} saved` : "Select a goal"; })()
                          : "Select a goal"}
                      </Text>
                      <Text style={{ color: "#6B7FA3", fontSize: 16 }}>▾</Text>
                    </TouchableOpacity>
                    {showGoalDropdown && (
                      <View style={styles.dropdownOptionsContainer}>
                        {goals.map(g => (
                          <TouchableOpacity key={g.id} style={styles.dropdownOption} onPress={() => { setActiveDepositGoalId(g.id); setShowGoalDropdown(false); }}>
                            <Text style={styles.dropdownOptionText}>{g.name} · ₱{(g.amountSaved || 0).toLocaleString()} saved</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text style={[styles.customLabel, { marginTop: 18 }]}>AMOUNT</Text>
                  <View style={styles.amountInputOuter}>
                    <Text style={styles.amountInputPrefix}>₱</Text>
                    <TextInput
                      style={styles.amountInputInner}
                      placeholder="0.00"
                      placeholderTextColor="#6B7FA3"
                      keyboardType="numeric"
                      value={depositAmount}
                      onChangeText={(t) => { setDepositAmount(t); if(formError) setFormError(""); }}
                    />
                  </View>
                  <View style={styles.quickPillsRow}>
                    {[500, 1000, 2000, 5000].map(amt => (
                      <TouchableOpacity key={amt} style={styles.quickPill} activeOpacity={0.7} onPress={() => setDepositAmount(amt.toString())}>
                        <Text style={styles.quickPillText}>₱{amt.toLocaleString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.customLabel, { marginTop: 18 }]}>PAYMENT METHOD</Text>
                  <View style={styles.radioMethodRow}>
                    <TouchableOpacity style={[styles.radioMethodBox, selectedPayment === "cash" && styles.radioMethodBoxActive]} activeOpacity={0.9} onPress={() => setSelectedPayment("cash")}>
                      <View style={[styles.radioOuter, selectedPayment === "cash" && styles.radioOuterActive]}>
                        {selectedPayment === "cash" && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioMethodText} numberOfLines={1} adjustsFontSizeToFit>Cash</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.radioMethodBox, selectedPayment === "gcash" && styles.radioMethodBoxActive]} activeOpacity={0.9} onPress={() => setSelectedPayment("gcash")}>
                      <View style={[styles.radioOuter, selectedPayment === "gcash" && styles.radioOuterActive]}>
                        {selectedPayment === "gcash" && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioMethodText} numberOfLines={1} adjustsFontSizeToFit>E-Wallet</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.radioMethodBox, selectedPayment === "bank" && styles.radioMethodBoxActive]} activeOpacity={0.9} onPress={() => setSelectedPayment("bank")}>
                      <View style={[styles.radioOuter, selectedPayment === "bank" && styles.radioOuterActive]}>
                        {selectedPayment === "bank" && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioMethodText} numberOfLines={1} adjustsFontSizeToFit>Bank Transfer</Text>
                    </TouchableOpacity>
                  </View>

                  {paymentApprovalMethod === "manual" && selectedPayment !== "cash" && (
                    <View style={{ marginTop: 18 }}>
                      <Text style={styles.customLabel}>SUB-METHOD</Text>
                      <View style={{ zIndex: 9, position: "relative" }}>
                        <TouchableOpacity style={styles.dropdownSelectBox} activeOpacity={0.8} onPress={() => setSubMethodDropdownOpen(!subMethodDropdownOpen)}>
                          <Text style={[styles.dropdownSelectedText]}>
                            {subMethod || "Select sub-method"}
                          </Text>
                          <Text style={{ color: "#6B7FA3", fontSize: 16 }}>▾</Text>
                        </TouchableOpacity>
                        {subMethodDropdownOpen && (
                          <View style={styles.dropdownOptionsContainer}>
                            {(selectedPayment === "gcash" ? ["GCash", "Maya"] : ["BDO", "BPI"]).map((sm) => (
                              <TouchableOpacity key={sm} style={styles.dropdownOption} onPress={() => { setSubMethod(sm); setSubMethodDropdownOpen(false); }}>
                                <Text style={styles.dropdownOptionText}>{sm}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      <Text style={[styles.customLabel, { marginTop: 18 }]}>ACCOUNT NAME</Text>
                      <TextInput
                        style={styles.noteInputBox}
                        placeholder="Juan Dela Cruz"
                        placeholderTextColor="#6B7FA3"
                        value={accountName}
                        onChangeText={setAccountName}
                      />

                      <Text style={[styles.customLabel, { marginTop: 18 }]}>ACCOUNT NUMBER</Text>
                      <TextInput
                        style={styles.noteInputBox}
                        placeholder="09123456789"
                        placeholderTextColor="#6B7FA3"
                        keyboardType="numeric"
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                      />

                      <Text style={[styles.customLabel, { marginTop: 18 }]}>REFERENCE / TRANSACTION ID <Text style={{ textTransform: "none", color: "#6B7FA3", fontWeight: "400" }}>(optional)</Text></Text>
                      <TextInput
                        style={styles.noteInputBox}
                        placeholder="e.g. 1234567890"
                        placeholderTextColor="#6B7FA3"
                        value={referenceNumber}
                        onChangeText={setReferenceNumber}
                      />
                    </View>
                  )}

                  <Text style={[styles.customLabel, { marginTop: 18 }]}>NOTE <Text style={{ textTransform: "none", color: "#6B7FA3", fontWeight: "400" }}>(optional)</Text></Text>
                  <TextInput
                    style={styles.noteInputBox}
                    placeholder="e.g. March paycheck"
                    placeholderTextColor="#6B7FA3"
                    value={depositNote}
                    onChangeText={setDepositNote}
                  />

                  {paymentApprovalMethod === "manual" && selectedPayment !== "cash" && (
                    <View>
                      <Text style={[styles.customLabel, { marginTop: 18 }]}>PROOF OF PAYMENT *</Text>
                      {proofImage ? (
                        <View style={styles.proofPreviewContainer}>
                          <Image source={{ uri: proofImage.uri }} style={styles.proofPreview} resizeMode="cover" />
                          <TouchableOpacity style={styles.proofRemoveBtn} onPress={() => setProofImage(null)}>
                            <Text style={styles.proofRemoveText}>×</Text>
                          </TouchableOpacity>
                          <View style={styles.proofAttachedBadge}>
                            <Text style={styles.proofAttachedText}>✓ Attached</Text>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.uploadDashedBox} activeOpacity={0.7} onPress={async () => {
                          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, mediaTypes: "images", base64: true });
                          if (!result.canceled && result.assets?.[0]?.base64) {
                            setProofImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 }); setFormError("");
                          }
                        }}>
                          <Image source={ICONS.document} style={styles.uploadDashedIcon} resizeMode="contain" />
                          <Text style={styles.uploadDashedText}>Click to upload screenshot or receipt</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {formError ? <Text style={[styles.formError, { marginTop: 10, textAlign: "center", marginBottom: 10 }]}>{formError}</Text> : <View style={{ height: 20 }} />}
                </ScrollView>
              </View>

              <View style={styles.depositFooterBtns}>
                 <TouchableOpacity style={styles.depositCancelBtn} activeOpacity={0.7} onPress={() => { setDepositModalOpen(false); setFormError(""); setProofImage(null); setShowGoalDropdown(false); }}>
                   <Text style={styles.depositCancelText}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.depositConfirmBtn, submitting && { opacity: 0.7 }]} activeOpacity={0.8} onPress={handleAddDeposit} disabled={submitting}>
                   {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.depositConfirmText}>{paymentApprovalMethod === "gateway" && selectedPayment !== "cash" ? "Proceed to Payment" : "Confirm deposit"}</Text>}
                 </TouchableOpacity>
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={withdrawModalOpen} transparent animationType="fade" onRequestClose={() => setWithdrawModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.cardBg, padding: 0 }]}>
              
              <View style={{ padding: s(24), paddingBottom: 0 }}>
                <View style={[styles.modalHeaderRow, { marginBottom: 20 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textDark, fontSize: fs(18), marginBottom: 2 }]}>Withdraw from savings</Text>
                    <Text style={{ color: "#6B7FA3", fontSize: 13 }}>Funds will be sent to your preferred account after approval.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setWithdrawModalOpen(false)} style={styles.modalCloseIconBtn}>
                    <Text style={styles.modalCloseIconText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_WIDTH * 1.2 }}>
                  <Text style={styles.customLabel}>WITHDRAW FROM GOAL</Text>
                  <View style={{ zIndex: 10, position: "relative" }}>
                    <TouchableOpacity style={styles.dropdownSelectBox} activeOpacity={0.8} onPress={() => setShowWithdrawDropdown(!showWithdrawDropdown)}>
                      <Text style={[styles.dropdownSelectedText, !withdrawGoalId && {color: "#6B7FA3"}]}>
                        {withdrawGoalId 
                          ? (() => { const g = goals.find(x => x.id === withdrawGoalId); return g ? `${g.name} · ₱${(g.amountSaved || 0).toLocaleString()} available` : "Select a goal"; })()
                          : "Select a goal"}
                      </Text>
                      <Text style={{ color: "#6B7FA3", fontSize: 16 }}>▾</Text>
                    </TouchableOpacity>
                    {showWithdrawDropdown && (
                      <View style={styles.dropdownOptionsContainer}>
                        {goals.filter(g => (g.amountSaved || 0) > 0).map(g => (
                          <TouchableOpacity key={g.id} style={styles.dropdownOption} onPress={() => { setWithdrawGoalId(g.id); setShowWithdrawDropdown(false); }}>
                            <Text style={styles.dropdownOptionText}>{g.name} · ₱{(g.amountSaved || 0).toLocaleString()} available</Text>
                          </TouchableOpacity>
                        ))}
                        {goals.filter(g => (g.amountSaved || 0) > 0).length === 0 && (
                          <View style={styles.dropdownOption}>
                            <Text style={[styles.dropdownOptionText, { color: "#6B7FA3" }]}>No goals with balance found.</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <Text style={[styles.customLabel, { marginTop: 18 }]}>AMOUNT TO WITHDRAW</Text>
                  <View style={styles.amountInputOuter}>
                    <Text style={styles.amountInputPrefix}>₱</Text>
                    <TextInput
                      style={styles.amountInputInner}
                      placeholder="0.00"
                      placeholderTextColor="#6B7FA3"
                      keyboardType="numeric"
                      value={withdrawAmount}
                      onChangeText={(t) => { setWithdrawAmount(t); if(formError) setFormError(""); }}
                    />
                  </View>

                  <Text style={[styles.customLabel, { marginTop: 18 }]}>RECEIVE VIA</Text>
                  <View style={styles.radioMethodRow}>
                    <TouchableOpacity style={[styles.radioMethodBox, withdrawMethod === "gcash" && styles.radioMethodBoxActive]} activeOpacity={0.9} onPress={() => setWithdrawMethod("gcash")}>
                      <View style={[styles.radioOuter, withdrawMethod === "gcash" && styles.radioOuterActive]}>
                        {withdrawMethod === "gcash" && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioMethodText}>GCash</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.radioMethodBox, withdrawMethod === "bank" && styles.radioMethodBoxActive]} activeOpacity={0.9} onPress={() => setWithdrawMethod("bank")}>
                      <View style={[styles.radioOuter, withdrawMethod === "bank" && styles.radioOuterActive]}>
                        {withdrawMethod === "bank" && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioMethodText}>Bank Transfer</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.customLabel, { marginTop: 18 }]}>{withdrawMethod === "gcash" ? "GCASH NUMBER" : "BANK DETAILS (Name/Acc #)"}</Text>
                  <TextInput
                    style={styles.noteInputBox}
                    placeholder={withdrawMethod === "gcash" ? "09xx xxx xxxx" : "BDO - Juan Dela Cruz - 1234567890"}
                    placeholderTextColor="#6B7FA3"
                    value={withdrawAccount}
                    onChangeText={setWithdrawAccount}
                  />

                  <Text style={[styles.customLabel, { marginTop: 18 }]}>REASON FOR WITHDRAWAL <Text style={{ textTransform: "none", color: "#6B7FA3", fontWeight: "400" }}>(optional)</Text></Text>
                  <TextInput
                    style={styles.noteInputBox}
                    placeholder="e.g. Medical emergency"
                    placeholderTextColor="#6B7FA3"
                    value={withdrawNote}
                    onChangeText={setWithdrawNote}
                  />

                  {formError ? <Text style={[styles.formError, { marginTop: 10, textAlign: "center", marginBottom: 10 }]}>{formError}</Text> : <View style={{ height: 20 }} />}
                </ScrollView>
              </View>

              <View style={styles.depositFooterBtns}>
                 <TouchableOpacity style={styles.depositCancelBtn} activeOpacity={0.7} onPress={() => { setWithdrawModalOpen(false); setFormError(""); setShowWithdrawDropdown(false); }}>
                   <Text style={styles.depositCancelText}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.depositConfirmBtn, { backgroundColor: C.red }, submitting && { opacity: 0.7 }]} activeOpacity={0.8} onPress={handleWithdraw} disabled={submitting}>
                   {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.depositConfirmText}>Request Withdrawal</Text>}
                 </TouchableOpacity>
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Transfer Modal */}
      <Modal visible={transferModalOpen} transparent animationType="fade" onRequestClose={() => setTransferModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.cardBg, padding: 0 }]}>
              
              <View style={{ padding: s(24), paddingBottom: 0 }}>
                <View style={[styles.modalHeaderRow, { marginBottom: 20 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textDark, fontSize: fs(18), marginBottom: 2 }]}>Instant Transfer</Text>
                    <Text style={{ color: "#6B7FA3", fontSize: 13 }}>Move funds instantly between your savings goals.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setTransferModalOpen(false)} style={styles.modalCloseIconBtn}>
                    <Text style={styles.modalCloseIconText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_WIDTH * 1.2 }}>
                  <Text style={styles.customLabel}>FROM GOAL</Text>
                  <View style={{ zIndex: 11, position: "relative", marginBottom: 18 }}>
                    <TouchableOpacity style={styles.dropdownSelectBox} activeOpacity={0.8} onPress={() => { setShowTransferFromDropdown(!showTransferFromDropdown); setShowTransferToDropdown(false); }}>
                      <Text style={[styles.dropdownSelectedText, !transferFromGoalId && {color: "#6B7FA3"}]}>
                        {transferFromGoalId 
                          ? (() => { const g = goals.find(x => x.id === transferFromGoalId); return g ? `${g.name} · ₱${(g.amountSaved || 0).toLocaleString()} available` : "Select source goal"; })()
                          : "Select source goal"}
                      </Text>
                      <Text style={{ color: "#6B7FA3", fontSize: 16 }}>▾</Text>
                    </TouchableOpacity>
                    {showTransferFromDropdown && (
                      <View style={styles.dropdownOptionsContainer}>
                        {goals.map(g => (
                          <TouchableOpacity key={g.id} style={styles.dropdownOption} onPress={() => { setTransferFromGoalId(g.id); setShowTransferFromDropdown(false); }}>
                            <Text style={styles.dropdownOptionText}>{g.name} · ₱{(g.amountSaved || 0).toLocaleString()} available</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text style={styles.customLabel}>TO GOAL</Text>
                  <View style={{ zIndex: 10, position: "relative", marginBottom: 18 }}>
                    <TouchableOpacity style={styles.dropdownSelectBox} activeOpacity={0.8} onPress={() => { setShowTransferToDropdown(!showTransferToDropdown); setShowTransferFromDropdown(false); }}>
                      <Text style={[styles.dropdownSelectedText, !transferToGoalId && {color: "#6B7FA3"}]}>
                        {transferToGoalId 
                          ? (() => { const g = goals.find(x => x.id === transferToGoalId); return g ? `${g.name}` : "Select destination goal"; })()
                          : "Select destination goal"}
                      </Text>
                      <Text style={{ color: "#6B7FA3", fontSize: 16 }}>▾</Text>
                    </TouchableOpacity>
                    {showTransferToDropdown && (
                      <View style={styles.dropdownOptionsContainer}>
                        {goals.map(g => (
                          <TouchableOpacity key={g.id} style={styles.dropdownOption} onPress={() => { setTransferToGoalId(g.id); setShowTransferToDropdown(false); }}>
                            <Text style={styles.dropdownOptionText}>{g.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text style={[styles.customLabel, { marginTop: 4 }]}>AMOUNT</Text>
                  <View style={styles.amountInputOuter}>
                    <Text style={styles.amountInputPrefix}>₱</Text>
                    <TextInput
                      style={styles.amountInputInner}
                      placeholder="0.00"
                      placeholderTextColor="#6B7FA3"
                      keyboardType="numeric"
                      value={transferAmount}
                      onChangeText={(t) => { setTransferAmount(t); if(formError) setFormError(""); }}
                    />
                  </View>

                  {formError ? <Text style={[styles.formError, { marginTop: s(16), textAlign: "center", marginBottom: 10 }]}>{formError}</Text> : <View style={{ height: 20 }} />}
                </ScrollView>
              </View>

              <View style={styles.depositFooterBtns}>
                 <TouchableOpacity style={styles.depositCancelBtn} activeOpacity={0.7} onPress={() => { setTransferModalOpen(false); setFormError(""); }}>
                   <Text style={styles.depositCancelText}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.depositConfirmBtn, submitting && { opacity: 0.7 }]} activeOpacity={0.8} onPress={handleTransfer} disabled={submitting}>
                   {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.depositConfirmText}>Transfer Now</Text>}
                 </TouchableOpacity>
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Goal Modal */}
      <Modal visible={goalModalOpen} transparent animationType="fade" onRequestClose={() => setGoalModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.cardBg }]}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }} contentContainerStyle={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>New Savings Goal</Text>
              <Text style={[styles.modalSubtext, { color: colors.textMuted }]}>
                Set a target to work towards
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Goal Name</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.cardBorder }]}
                placeholder="e.g., Emergency Fund"
                placeholderTextColor={C.textMuted}
                value={goalName}
                onChangeText={(t) => {
                  setGoalName(t);
                  if (formError) setFormError("");
                }}
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Target Amount (?)</Text>
              <TextInput
                style={[styles.input, { color: colors.textDark, borderColor: colors.cardBorder }]}
                placeholder="0.00"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                value={goalTarget}
                onChangeText={(t) => {
                  setGoalTarget(t);
                  if (formError) setFormError("");
                }}
              />

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}

              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: colors.cardBorder }]}>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalBtnCancel}
                    activeOpacity={0.7}
                    onPress={() => { setGoalModalOpen(false); setFormError(""); }}
                  >
                    <Text style={[styles.modalBtnCancelText, { color: colors.textDark }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnSubmit} activeOpacity={0.85} onPress={handleAddGoal}>
                    <Text style={styles.modalBtnSubmitText}>Create Goal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingHorizontal: s(18),
    paddingTop: Platform.OS === "ios" ? s(56) : s(42),
    paddingBottom: 14,
  },
  menuBtn: { padding: 4, justifyContent: "center", gap: 5 },
  menuLine: { width: s(22), height: 2.2, backgroundColor: C.textDark, borderRadius: 1.2 },
  topTitle: {
    flex: 1, textAlign: "center", fontSize: fs(20), fontWeight: "600", color: C.textDark,
  },
  topSpacer: { width: 28 },

  scroll: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: s(18),
    paddingTop: s(20),
    paddingBottom: s(16),
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  pageTitle: { fontSize: fs(26), fontWeight: "700", color: C.textDark, marginBottom: 4 },
  pageSubtitle: { fontSize: fs(14), color: C.textMuted, lineHeight: 20 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.blue,
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    borderRadius: s(12),
    gap: s(6),
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnPlus: { fontSize: fs(18), fontWeight: "700", color: "#FFF" },
  addBtnText: { fontSize: fs(13), fontWeight: "700", color: "#FFF" },

  // Stats
  statsContainer: { paddingHorizontal: s(18), gap: s(12), marginBottom: 20 },
  statCard: {
    backgroundColor: C.cardBg,
    borderRadius: s(16),
    padding: s(18),
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
  statLabel: { fontSize: fs(13), color: C.textMuted, marginBottom: s(6), fontWeight: "600" },
  statValue: { fontSize: fs(26), fontWeight: "700", color: C.textDark },
  statIconBox: {
    width: s(46), height: s(46), borderRadius: s(14),
    alignItems: "center", justifyContent: "center",
  },
  statIcon: { width: s(22), height: 22 },

  // Loan Eligibility
  eligibilityCard: {
    marginHorizontal: s(18),
    borderRadius: s(16),
    padding: s(18),
    borderWidth: 1,
    marginBottom: s(20),
  },
  eligibilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(14),
  },
  eligibilityIconBox: {
    width: s(44), height: s(44), borderRadius: s(14),
    alignItems: "center", justifyContent: "center",
  },
  eligibilityTitle: { fontSize: fs(15), fontWeight: "700", marginBottom: 3 },
  eligibilitySubtext: { fontSize: fs(13), lineHeight: 18 },
  eligibilityProgressBg: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: s(4),
    marginTop: 14,
    overflow: "hidden",
  },
  eligibilityProgressFill: {
    height: "100%",
    backgroundColor: C.gold,
    borderRadius: s(4),
  },

  // Section
  section: { paddingHorizontal: s(18), marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: s(12),
  },
  sectionTitle: { fontSize: fs(18), fontWeight: "700", color: C.textDark, marginBottom: 8 },
  addGoalText: { fontSize: fs(14), fontWeight: "700", color: C.blue },

  // Goals
  emptyGoalCard: {
    borderRadius: s(16),
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  emptyGoalTitle: { fontSize: fs(16), fontWeight: "700", marginBottom: 4 },
  emptyGoalSub: { fontSize: fs(13), textAlign: "center", lineHeight: 18 },

  goalCard: {
    borderRadius: s(16),
    padding: s(18),
    borderWidth: 1,
    marginBottom: s(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: s(14),
  },
  goalName: { fontSize: fs(16), fontWeight: "700", marginBottom: 4 },
  goalAmount: { fontSize: fs(13), fontWeight: "500" },
  goalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  goalBadgeText: { fontSize: fs(12), fontWeight: "700" },
  goalProgressBg: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: s(4),
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: s(4),
  },

  // History
  historyList: {
    borderRadius: s(16),
    borderWidth: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: s(16),
    gap: s(14),
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  historyIconBox: {
    width: 42, height: 42, borderRadius: s(12),
    alignItems: "center", justifyContent: "center",
  },
  historyIcon: { width: s(20), height: 20 },
  historyTitle: { fontSize: fs(14), fontWeight: "600", marginBottom: 3 },
  historyDate: { fontSize: 12 },
  historyAmount: { fontSize: fs(16), fontWeight: "700" },

  bottomPad: { height: 110 },

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
    bottom: 0, left: 0,
    height: s(3),
    backgroundColor: C.tabActive,
  },
  tabItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 8, position: "relative",
  },
  tabBgCircle: {
    position: "absolute",
    width: 75, height: 62, borderRadius: 15,
    backgroundColor: "rgba(46,107,240,0.15)",
    top: -8,
  },
  tabIcon: { width: s(26), height: 26 },
  tabLabel: { fontSize: 10 },

  // Sidebar
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.overlay, zIndex: 998, elevation: 998,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: C.sidebarBg, zIndex: 1000, elevation: 1000, flexDirection: "column",
  },
  sidebarHeader: {
    flexDirection: "row", alignItems: "center", gap: s(12),
    paddingTop: Platform.OS === "ios" ? s(58) : s(44),
    paddingBottom: 22, paddingHorizontal: s(20),
  },
  sidebarLogo: { width: s(46), height: s(46), borderRadius: 45 },
  sidebarTitle: { fontSize: fs(18), fontWeight: "900", color: "#FFF" },

  sidebarNav: { flex: 1, paddingHorizontal: 12 },
  sidebarItem: {
    flexDirection: "row", alignItems: "center", gap: s(14),
    paddingVertical: s(13), paddingHorizontal: s(14),
    borderRadius: s(12), marginBottom: s(6),
  },
  sidebarItemActive: { backgroundColor: "rgba(46,107,240,0.1)" },
  sidebarIcon: { width: s(20), height: 20 },
  sidebarItemText: { fontSize: fs(15), color: C.textMuted, fontWeight: "600" },
  sidebarItemTextActive: { color: C.blue },

  sidebarFooter: {
    borderTopWidth: 1, borderTopColor: C.cardBorder,
    paddingHorizontal: s(18), paddingTop: s(16),
    paddingBottom: Platform.OS === "ios" ? s(34) : s(18),
  },
  sidebarUserRow: { flexDirection: "row", alignItems: "center", gap: s(12), marginBottom: 16 },
  sidebarAvatar: {
    width: s(36), height: s(36), borderRadius: s(18),
    backgroundColor: "rgba(31, 102, 255, 0.93)",
    alignItems: "center", justifyContent: "center",
  },
  sidebarAvatarIcon: { width: s(18), height: s(18), tintColor: "#FFFFFF" },
  sidebarUserName: { fontSize: fs(14), fontWeight: "900", color: "#FFF" },
  sidebarUserEmail: { fontSize: fs(11), color: C.textMuted, marginTop: 1, fontWeight: "700" },

  signOutRow: { flexDirection: "row", alignItems: "center", gap: s(10), paddingVertical: 6 },
  signOutIcon: { width: 30, height: s(40), tintColor: C.red },
  signOutText: { fontSize: fs(14), color: C.red, fontWeight: "900" },

  // Confirm Modal
  confirmOverlay: {
    flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: s(24),
  },
  confirmDialog: {
    backgroundColor: C.cardBg, borderRadius: s(20), padding: s(28),
    width: "100%", maxWidth: 340, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  confirmIconContainer: {
    width: s(64), height: s(64), borderRadius: s(32),
    backgroundColor: "rgba(231, 76, 60, 0.1)",
    alignItems: "center", justifyContent: "center", marginBottom: s(20),
  },
  confirmIcon: { width: 32, height: 32, tintColor: C.red },
  confirmTitle: { fontSize: fs(22), fontWeight: "800", marginBottom: s(12), textAlign: "center" },
  confirmMessage: { fontSize: fs(15), textAlign: "center", lineHeight: fs(22), marginBottom: 28 },
  confirmButtons: { flexDirection: "row", gap: s(12), width: "100%" },
  confirmBtnCancel: {
    flex: 1, backgroundColor: C.secondaryBtnBg, borderRadius: s(12),
    paddingVertical: s(14), alignItems: "center", justifyContent: "center",
  },
  confirmBtnCancelText: { fontSize: fs(15), fontWeight: "700" },
  confirmBtnSignOut: {
    flex: 1, backgroundColor: C.red, borderRadius: s(12),
    paddingVertical: s(14), alignItems: "center", justifyContent: "center",
  },
  confirmBtnSignOutText: { fontSize: fs(15), fontWeight: "700", color: "#FFFFFF" },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: s(20),
  },
  modalBox: {
    width: "100%", borderRadius: s(24), padding: 0, overflow: "hidden", maxHeight: "85%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 8,
    display: "flex", flexDirection: "column",
  },
  modalContent: { padding: s(28), paddingBottom: 20 },
  modalFooter: {
    padding: s(20),
    paddingTop: s(16),
    borderTopWidth: 1,
  },
  modalTitle: { fontSize: fs(22), fontWeight: "800", marginBottom: 6 },
  modalSubtext: { fontSize: fs(14), lineHeight: fs(20), marginBottom: 24 },
  inputLabel: { fontSize: fs(13), fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: s(12), paddingHorizontal: s(16), paddingVertical: s(14),
    fontSize: fs(15), marginBottom: 18, backgroundColor: "rgba(0,0,0,0.02)",
  },
  formError: { fontSize: fs(13), color: C.red, marginBottom: s(14), fontWeight: "500" },
  modalButtons: { flexDirection: "row", gap: s(12), marginTop: 4 },
  modalBtnCancel: {
    flex: 1, backgroundColor: C.secondaryBtnBg, borderRadius: s(12),
    paddingVertical: s(14), alignItems: "center",
  },
  modalBtnCancelText: { fontSize: fs(15), fontWeight: "700" },
  modalBtnSubmit: {
    flex: 1, backgroundColor: C.blue, borderRadius: s(12),
    paddingVertical: s(14), alignItems: "center",
    shadowColor: C.blue, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  modalBtnSubmitText: { fontSize: fs(15), fontWeight: "700", color: "#FFF" },

  // Payment Method & Proof
  paymentMethodRow: { flexDirection: "row", gap: s(12), marginBottom: 16 },
  paymentMethodBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: s(14), borderRadius: s(12), borderWidth: 1, borderColor: C.cardBorder,
  },
  paymentMethodIcon: { width: s(18), height: 18 },
  paymentMethodText: { fontSize: fs(14), fontWeight: "600", color: C.textDark },

  gatewayBox: {
    backgroundColor: C.inputBg, borderRadius: s(12), padding: s(16), marginBottom: s(20),
    borderWidth: 1, borderColor: C.cardBorder,
  },
  gatewayHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: s(12),
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  gatewayLogo: { width: s(20), height: 20 },
  gatewayTitle: { fontSize: fs(14), fontWeight: "700", color: C.textDark },
  gatewayRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  gatewayLabel: { fontSize: fs(13), color: C.textMuted, fontWeight: "500" },
  gatewayValue: { fontSize: fs(13), color: C.textDark, fontWeight: "700" },
  gatewayNote: { fontSize: fs(11), color: C.textMuted, fontStyle: "italic", marginTop: 8, textAlign: "center" },

  proofUploadBox: {
    borderWidth: 2, borderColor: "#D1D5DB", borderStyle: "dashed", borderRadius: s(14),
    padding: s(24), alignItems: "center", marginBottom: 18, backgroundColor: "rgba(0,0,0,0.015)",
  },
  proofUploadIconImg: { width: 32, height: 32, tintColor: C.textMuted, marginBottom: 10 },
  proofUploadTitle: { fontSize: fs(14), fontWeight: "700", color: C.textDark, marginBottom: 4 },
  proofUploadHint: { fontSize: fs(12), color: C.textMuted, marginBottom: 14 },
  proofBtnRow: { flexDirection: "row", gap: 10 },
  proofBtn: {
    backgroundColor: C.blueLight, paddingHorizontal: s(16), paddingVertical: s(10),
    borderRadius: s(10), borderWidth: 1, borderColor: C.blue,
  },
  proofBtnInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  proofBtnIcon: { width: 16, height: 16, tintColor: C.blue },
  proofBtnText: { fontSize: fs(13), fontWeight: "700", color: C.blue },
  proofPreviewContainer: {
    position: "relative", marginBottom: 18, borderRadius: s(14), overflow: "hidden",
    borderWidth: 1, borderColor: C.cardBorder,
  },
  proofPreview: { width: "100%", height: 200, borderRadius: 14 },
  proofRemoveBtn: {
    position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: s(14),
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
  },
  proofRemoveText: { color: "#FFF", fontSize: fs(14), fontWeight: "700" },
  proofAttachedBadge: {
    position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(52,199,89,0.9)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: s(8),
  },
  proofAttachedText: { fontSize: fs(11), color: "#FFF", fontWeight: "700" },

  // --- NEW SLEEK UI STYLES ---
  headerDepositBtn: {
    backgroundColor: C.navBg, paddingHorizontal: s(16), paddingVertical: s(10),
    borderRadius: s(8), marginTop: 6,
  },
  headerDepositBtnText: { color: "#FFF", fontSize: fs(13), fontWeight: "700" },

  puacAlertBox: {
    marginHorizontal: s(18), marginTop: 18, marginBottom: s(16), 
    padding: s(16), borderRadius: s(12), borderWidth: 1, 
    borderColor: "rgba(46,107,240,0.15)", backgroundColor: "rgba(46,107,240,0.04)"
  },
  puacAlertText: { fontSize: fs(13), color: C.textDark, lineHeight: 20 },

  statCardGrid: {
    width: "48%", borderRadius: s(14), padding: 12, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1
  },
  statHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: s(18), marginTop: 24, marginBottom: 12 },
  
  goalsContainer: { marginHorizontal: s(18), borderRadius: s(16), borderWidth: 1, borderColor: C.cardBorder, overflow: "hidden" },
  sleekGoalItem: { padding: 18 },
  sleekGoalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
  sleekGoalName: { fontSize: fs(15), fontWeight: "700", marginBottom: 2 },
  sleekGoalSub: { fontSize: 11 },
  sleekGoalSavedText: { fontSize: fs(14), fontWeight: "700", marginBottom: 2 },
  sleekProgressBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sleekProgressBg: { flex: 1, height: s(4), backgroundColor: C.cardBorder, borderRadius: 2, overflow: "hidden" },
  sleekProgressFill: { height: "100%", backgroundColor: C.gold, borderRadius: 2 },
  sleekProgressPercentText: { fontSize: fs(11), color: C.textDark, fontWeight: "600", width: 30, textAlign: "right" },

  loanableBannerBlock: { marginHorizontal: s(18), marginTop: 18, backgroundColor: "#EEF8EE", borderRadius: s(12), padding: s(16), borderWidth: 1, borderColor: "rgba(52,199,89,0.2)" },
  loanableBannerHeader: { marginBottom: 12 },
  loanableBannerTitle: { fontSize: fs(14), fontWeight: "700", color: "#2E5C3B", marginBottom: 2 },
  loanableBannerSub: { fontSize: fs(12), color: "#4B7E58" },
  loanableBadgeItem: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(52,199,89,0.08)", paddingHorizontal: s(12), paddingVertical: 6, borderRadius: 6 },
  loanableBadgeLabel: { fontSize: fs(12), fontWeight: "600", color: "#2E5C3B", flex: 0.8 },
  loanableBadgeSeparator: { fontSize: fs(12), color: "rgba(46,92,59,0.3)", marginHorizontal: 8 },
  loanableBadgeValue: { fontSize: fs(12), fontWeight: "700", color: "#164121", flex: 1 },

  sleekHistoryItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  sleekHistoryIconBox: { width: s(36), height: s(36), borderRadius: s(18), backgroundColor: "rgba(52,199,89,0.1)", alignItems: "center", justifyContent: "center" },
  sleekHistoryTitle: { fontSize: fs(13), fontWeight: "600" },
  sleekHistoryDate: { fontSize: 11 },
  sleekValidatedBadge: { backgroundColor: "rgba(52,199,89,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: s(4), marginLeft: 8 },
  sleekValidatedText: { fontSize: 9, color: C.green, fontWeight: "800" },

  // --- NEW MODAL STYLES ---
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modalCloseIconBtn: { padding: 4, backgroundColor: C.secondaryBtnBg, borderRadius: s(16), width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  modalCloseIconText: { fontSize: fs(16), color: C.textMuted, fontWeight: "600" },
  customLabel: { fontSize: fs(11), fontWeight: "700", color: C.textMuted, marginBottom: s(8), letterSpacing: 0.5 },
  dropdownSelectBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: C.cardBorder, borderRadius: s(10), paddingHorizontal: s(14), paddingVertical: 12 },
  dropdownSelectedText: { fontSize: fs(14), color: C.textDark },
  dropdownOptionsContainer: { position: "absolute", top: 50, left: 0, right: 0, backgroundColor: C.cardBg, borderRadius: s(10), borderWidth: 1, borderColor: C.cardBorder, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, elevation: 4 },
  dropdownOption: { paddingHorizontal: s(14), paddingVertical: s(12), borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  dropdownOptionText: { fontSize: fs(14), color: C.textDark },
  amountInputOuter: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.cardBorder, borderRadius: s(10), paddingHorizontal: s(14), height: 48 },
  amountInputPrefix: { fontSize: fs(16), color: C.textMuted, marginRight: 8, fontWeight: "600" },
  amountInputInner: { flex: 1, fontSize: fs(16), color: C.textDark },
  quickPillsRow: { flexDirection: "row", gap: s(8), marginTop: 10 },
  quickPill: { flex: 1, backgroundColor: C.secondaryBtnBg, paddingVertical: s(8), borderRadius: s(16), alignItems: "center", justifyContent: "center" },
  quickPillText: { fontSize: fs(12), color: C.textMuted, fontWeight: "600" },
  radioMethodRow: { flexDirection: "row", gap: s(6) },
  radioMethodBox: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.cardBorder, borderRadius: s(10), paddingHorizontal: s(6), paddingVertical: s(12), backgroundColor: C.cardBg },
  radioMethodBoxActive: { borderColor: C.navBg, backgroundColor: "rgba(13,31,69,0.06)" },
  radioOuter: { width: s(16), height: s(16), borderRadius: s(8), borderWidth: 2, borderColor: C.cardBorder, marginRight: s(5), alignItems: "center", justifyContent: "center" },
  radioOuterActive: { borderColor: C.navBg },
  radioInner: { width: s(7), height: s(7), borderRadius: s(3.5), backgroundColor: C.navBg },
  radioMethodText: { flex: 1, fontSize: fs(12), color: C.textDark, fontWeight: "600", textAlign: "left" },
  noteInputBox: { borderWidth: 1, borderColor: C.cardBorder, borderRadius: s(10), paddingHorizontal: s(14), paddingVertical: s(12), fontSize: fs(14), color: C.textDark },
  uploadDashedBox: { borderWidth: 1, borderStyle: "dashed", borderColor: C.cardBorder, borderRadius: s(10), alignItems: "center", justifyContent: "center", paddingVertical: 24, paddingHorizontal: 20 },
  uploadDashedIcon: { width: s(24), height: s(24), tintColor: C.textMuted, marginBottom: 8 },
  uploadDashedText: { fontSize: fs(13), color: C.textMuted, textAlign: "center" },
  depositFooterBtns: { flexDirection: "row", gap: s(12), padding: s(24), borderTopWidth: 1, borderTopColor: C.cardBorder, marginTop: s(20), backgroundColor: C.cardBg, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  depositCancelBtn: { flex: 0.4, backgroundColor: C.secondaryBtnBg, paddingVertical: s(14), borderRadius: s(10), alignItems: "center" },
  depositCancelText: { fontSize: fs(14), color: C.textDark, fontWeight: "700" },
  depositConfirmBtn: { flex: 0.6, backgroundColor: "#1E3A8A", paddingVertical: s(14), borderRadius: s(10), alignItems: "center" },
  depositConfirmText: { fontSize: fs(14), color: "#FFF", fontWeight: "700" }
});




