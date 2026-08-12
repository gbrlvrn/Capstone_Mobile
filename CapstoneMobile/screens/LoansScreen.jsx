import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
  KeyboardAvoidingView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import FloatingNavBar from "../components/FloatingNavBar";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getPublicSettings, getVerificationStatus, createLoan, getLoans, submitLoanPayment, getMyLoanPayments, cancelLoan, getLoanSchedule, verifyIdImage } from "../services/AuthService";
import { addNotification } from "./NotificationsScreen";
import LoanProgressCircle from "../components/LoanProgressCircle";
import EmptyState from "../components/EmptyState";
import { SkeletonStatCard } from "../components/SkeletonLoader";
import { useTheme } from "../components/ThemeContext";
import { useAlert } from "../components/AlertContext";
import ReceiptModal from "../components/ReceiptModal";
import LoanCalendar from "../components/LoanCalendar";
import NoteModal from "../components/NoteModal";
import OfflineBanner from "../components/OfflineBanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));
const SIDEBAR_WIDTH = s(260);

const LOGO = require("../assets/puac_logo.png");

const ICONS = {
  document: require("../assets/icons/document.png"),
  wallet: require("../assets/icons/wallet.png"),
  loans: require("../assets/icons/loans.png"),
  home: require("../assets/icons/home-v3.png"),
  donations: require("../assets/icons/donations.png"),
  attendance: require("../assets/icons/attendance.png"),
  branches: require("../assets/icons/branches.png"),
  profile: require("../assets/icons/profile.png"),
  settings: require("../assets/icons/settings.png"),
  person: require("../assets/icons/person.png"),
  signout: require("../assets/icons/signout.png"),
  chat: require("../assets/icons/chat.png"),
  lock: require("../assets/icons/lock.png"),
  clock: require("../assets/icons/clock.png"),
  camera: require("../assets/icons/camera.png"),
  idCard: require("../assets/icons/id-card.png"),
  bank: require("../assets/icons/bank.png"),
  gcash: require("../assets/icons/gcash.png"),
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
  orange: "#FF9500",
  orangeLight: "rgba(255,149,0,0.1)",
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

// Removed redundant tab pages from sidebar
const SIDEBAR_ITEMS = [
  { key: "Announcements", icon: ICONS.notification },
  { key: "Savings", icon: ICONS.wallet },
  { key: "Profile", icon: ICONS.profile },
  { key: "Settings", icon: ICONS.settings },
];

const LOAN_TYPES = [
  {
    label: "Personal Loan",
    value: "Personal",
    multiplier: 2,
    multiplierLabel: "2x savings",
    description: "For everyday needs, big purchases, or personal goals.",
    rateLabel: "2% / mo",
    monthsLabel: "3-12 mo",
  },
  {
    label: "Emergency Loan",
    value: "Emergency",
    multiplier: 1.5,
    multiplierLabel: "1.5x savings",
    description: "Fast-tracked for urgent and unexpected situations.",
    rateLabel: "1.5% / mo",
    monthsLabel: "1-6 mo",
  },
  {
    label: "Short-Term Loan",
    value: "Short-term",
    multiplier: 1,
    multiplierLabel: "1x savings",
    description: "Quick, low-interest loan for short bridge financing.",
    rateLabel: "1% / mo",
    monthsLabel: "1-3 mo",
  },
];

const SUMMARY_DATA = [
  {
    label: "Total Borrowed",
    value: "₱0",
    icon: ICONS.document,
    iconColor: C.blue,
    iconBg: C.blueLight,
  },
  {
    label: "Remaining Balance",
    value: "₱0",
    icon: ICONS.wallet,
    iconColor: C.red,
    iconBg: "rgba(231,76,60,0.1)",
  },
  {
    label: "Active Loans",
    value: "0",
    icon: ICONS.loans,
    iconColor: C.green,
    iconBg: C.greenLight,
  },
];

const LOANS_DATA = [];

const isValidPhone = (p) => {
  // Phone should be exactly +63 followed by 10 digits
  const digits = p.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('63');
};

export default function LoansScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState("Loans");
  // Email reflection
  const [userEmail, setUserEmail] = useState("");
  const [paymentApprovalMethod, setPaymentApprovalMethod] = useState("manual");

  // --- Calendar & Notes State ---
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [loanNotes, setLoanNotes] = useState({});
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const loadNotes = async () => {
      if (!userEmail) return;
      try {
        const saved = await AsyncStorage.getItem("faithly_loan_notes_" + userEmail);
        if (saved) setLoanNotes(JSON.parse(saved));
      } catch (e) { console.log("Load notes error:", e); }
    };
    loadNotes();
  }, [userEmail]);

  const handleSaveNote = async () => {
    if (!selectedCalendarDate) return;
    setSavingNote(true);
    try {
      const dateKey = selectedCalendarDate.toISOString().split('T')[0];
      const updatedNotes = { ...loanNotes, [dateKey]: newNoteText };
      setLoanNotes(updatedNotes);
      if (userEmail) {
        await AsyncStorage.setItem("faithly_loan_notes_" + userEmail, JSON.stringify(updatedNotes));
      }
      setNoteModalOpen(false);
    } catch (e) {
      Alert.alert("Error", "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const emailFromParams = route?.params?.email;
        if (emailFromParams) {
          if (mounted) setUserEmail(emailFromParams);

          // keep in storage so other screens can read it if params are missing
          const old = await AsyncStorage.getItem("faithly_user");
          const parsed = old ? JSON.parse(old) : {};
          await AsyncStorage.setItem(
            "faithly_user",
            JSON.stringify({ ...parsed, email: emailFromParams }),
          );
          return;
        }

        const saved = await AsyncStorage.getItem("faithly_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (mounted) setUserEmail(parsed?.email || "");
        }
      } catch (e) {
        // don't crash
      }
    })();

    return () => {
      mounted = false;
    };
  }, [route?.params?.email]);

  // always pass email to next screen
  const navWithEmail = useCallback(
    (screen) => navigation.replace(screen, { email: userEmail }),
    [navigation, userEmail],
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [requirementsModalOpen, setRequirementsModalOpen] = useState(false);

  // Loan application form state
  const [loanType, setLoanType] = useState("");
  const [expandedLoanType, setExpandedLoanType] = useState(null);

  // Face verification camera state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState(null); // "selfie" or "id"
  const [cameraCountdown, setCameraCountdown] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [loanAmount, setLoanAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+63 ");
  const [purposeCategory, setPurposeCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [monthsToPay, setMonthsToPay] = useState("");
  const [selfie, setSelfie] = useState(null);
  const [validId, setValidId] = useState(null);
  // AI ID Verification States
  const [idVerifying, setIdVerifying] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [idRejected, setIdRejected] = useState(false);
  const [idVerifyResult, setIdVerifyResult] = useState(null); // { idType, reason }
  const [coeDoc, setCoeDoc] = useState(null);
  const [itrDoc, setItrDoc] = useState(null);
  const [payslipDoc, setPayslipDoc] = useState(null);
  const [activeLoanDoc, setActiveLoanDoc] = useState(null);
  const [hasExistingLoan, setHasExistingLoan] = useState(null);
  const [disbursementMethod, setDisbursementMethod] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loanLoading, setLoanLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Draft persistence helpers for loan application
  const clearLoanDraft = useCallback(async () => {
    if (!userEmail) return;
    try {
      await AsyncStorage.removeItem(`faithly_loan_draft_${userEmail}`);
    } catch (e) {
      console.log("Failed to clear loan draft:", e);
    }
  }, [userEmail]);

  const saveLoanDraft = useCallback(async (data) => {
    if (!userEmail) return;
    try {
      await AsyncStorage.setItem(`faithly_loan_draft_${userEmail}`, JSON.stringify(data));
    } catch (e) {
      console.log("Failed to save loan draft:", e);
    }
  }, [userEmail]);

  const loadLoanDraft = useCallback(async () => {
    if (!userEmail) return;
    try {
      const saved = await AsyncStorage.getItem(`faithly_loan_draft_${userEmail}`);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.loanType) setLoanType(draft.loanType);
        if (draft.loanAmount) setLoanAmount(draft.loanAmount);
        if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);
        if (draft.purposeCategory) setPurposeCategory(draft.purposeCategory);
        if (draft.purpose) setPurpose(draft.purpose);
        if (draft.monthsToPay) setMonthsToPay(draft.monthsToPay);
        if (draft.disbursementMethod) setDisbursementMethod(draft.disbursementMethod);
        if (draft.accountNumber) setAccountNumber(draft.accountNumber);
      }
    } catch (e) {
      console.log("Failed to load loan draft:", e);
    }
  }, [userEmail]);

  // Auto-save draft whenever inputs change while apply modal is open
  useEffect(() => {
    if (!applyModalOpen) return;
    const isDirty = Boolean(
      loanType || loanAmount || (phoneNumber && phoneNumber !== "+63 ") || purposeCategory || purpose || monthsToPay || disbursementMethod || accountNumber
    );
    if (isDirty) {
      saveLoanDraft({
        loanType,
        loanAmount,
        phoneNumber,
        purposeCategory,
        purpose,
        monthsToPay,
        disbursementMethod,
        accountNumber,
      });
    }
  }, [applyModalOpen, loanType, loanAmount, phoneNumber, purposeCategory, purpose, monthsToPay, disbursementMethod, accountNumber, saveLoanDraft]);

  const handleOpenApplyModal = useCallback(() => {
    setFormError("");
    loadLoanDraft();
    setApplyModalOpen(true);
  }, [loadLoanDraft]);

  const handleCloseApplyModal = useCallback((force = false) => {
    const isDirty = Boolean(
      loanType || loanAmount || (phoneNumber && phoneNumber !== "+63 ") || purposeCategory || purpose || monthsToPay || disbursementMethod || accountNumber
    );

    if (!force && isDirty) {
      Alert.alert(
        "Unsaved Loan Application",
        "You have unsaved changes in your loan form. Would you like to save your draft or discard?",
        [
          {
            text: "Save Draft",
            onPress: () => {
              saveLoanDraft({
                loanType,
                loanAmount,
                phoneNumber,
                purposeCategory,
                purpose,
                monthsToPay,
                disbursementMethod,
                accountNumber,
              });
              setApplyModalOpen(false);
            },
          },
          {
            text: "Discard Draft",
            style: "destructive",
            onPress: () => {
              clearLoanDraft();
              setLoanType("");
              setLoanAmount("");
              setPhoneNumber("+63 ");
              setPurposeCategory("");
              setPurpose("");
              setMonthsToPay("");
              setSelfie(null);
              setValidId(null);
              setIdVerified(false);
              setIdRejected(false);
              setIdVerifying(false);
              setIdVerifyResult(null);
              setCoeDoc(null);
              setItrDoc(null);
              setPayslipDoc(null);
              setActiveLoanDoc(null);
              setHasExistingLoan(null);
              setDisbursementMethod("");
              setAccountNumber("");
              setAgreedToTerms(false);
              setFormError("");
              setApplyModalOpen(false);
            },
          },
          {
            text: "Keep Editing",
            style: "cancel",
          },
        ]
      );
    } else {
      setFormError("");
      setApplyModalOpen(false);
    }
  }, [loanType, loanAmount, phoneNumber, purposeCategory, purpose, monthsToPay, disbursementMethod, accountNumber, saveLoanDraft, clearLoanDraft]);

  // Pay Now modal state
  const [payNowModalOpen, setPayNowModalOpen] = useState(false);
  const [payNowLoan, setPayNowLoan] = useState(null);
  const [payType, setPayType] = useState("regular"); // "regular", "custom", "full"
  const [customPayAmount, setCustomPayAmount] = useState("");
  const [customPayMonths, setCustomPayMonths] = useState(0);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("gcash");
  const [payProof, setPayProof] = useState(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const paySubmittingRef = useRef(false);

  // Schedule modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleLoan, setScheduleLoan] = useState(null);
  const [loanPayments, setLoanPayments] = useState([]);

  // Savings tracking
  const [totalSavings, setTotalSavings] = useState(0);
  const isEligibleForLoan = totalSavings >= 1000;
  const eligibilityProgress = Math.min(1, totalSavings / 1000);


  // Staggered entrance animations for 3 summary cards
  const summaryAnims = useRef([0, 1, 2].map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(18),
  }))).current;

  const pickImage = useCallback(async (setter, useCamera = false) => {
    try {
      const permResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permResult.granted) {
        showAlert(
          "Permission Required",
          useCamera
            ? "Camera access is needed to take a photo."
            : "Photo library access is needed to select an image."
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 0.8,
            allowsEditing: true,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            quality: 0.8,
            allowsEditing: true,
            base64: true,
          });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const fileName =
          asset.fileName || asset.uri.split("/").pop() || "photo.jpg";
        const type = asset.mimeType || "image/jpeg";
        setter({ uri: asset.uri, fileName, type, base64: asset.base64 });
      }
    } catch (err) {
      showAlert("Error", "Failed to pick image.");
    }
  }, []);

  // Open face verification camera - closes apply modal first to avoid Android nested modal conflict
  const openVerificationCamera = useCallback(async (mode) => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        showAlert("Permission Required", "Camera access is needed for identity verification.");
        return;
      }
    }
    setCameraMode(mode);
    setCameraReady(false);
    setCameraCountdown(0);
    // Reset ID verification state when retaking
    if (mode === "id") {
      setIdVerifying(false);
      setIdVerified(false);
      setIdRejected(false);
      setIdVerifyResult(null);
      setValidId(null);
    }
    // Close the apply modal first - Android cannot render CameraView inside nested Modals
    setApplyModalOpen(false);
    // Small delay so apply modal fully dismisses before camera modal opens
    setTimeout(() => {
      setCameraModalOpen(true);
    }, 350);
  }, [cameraPermission, requestCameraPermission]);

  // Start countdown when user taps capture
  const startCameraCountdown = useCallback((captureFn) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCameraCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      setCameraCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          // Auto-capture
          captureFn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Capture photo from CameraView
  const captureFromCamera = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
      });
      if (photo) {
        const imageData = {
          uri: photo.uri,
          fileName: `capture_${Date.now()}.jpg`,
          type: "image/jpeg",
          base64: photo.base64,
        };

        if (cameraMode === "selfie") {
          setSelfie(imageData);
          setCameraModalOpen(false);
          setTimeout(() => setApplyModalOpen(true), 350);

        } else if (cameraMode === "id") {
          // Close camera, reopen apply modal, start AI verification
          setCameraModalOpen(false);
          setTimeout(async () => {
            setApplyModalOpen(true);
            // Small extra delay so modal is visible before spinner shows
            await new Promise(r => setTimeout(r, 200));
            setIdVerifying(true);
            setIdVerified(false);
            setIdRejected(false);
            setIdVerifyResult(null);
            setValidId(imageData); // store temporarily so preview shows
            try {
              const result = await verifyIdImage(imageData.base64, "image/jpeg");
              if (result.valid) {
                setIdVerified(true);
                setIdRejected(false);
                setIdVerifyResult({ idType: result.idType, reason: result.reason });
              } else {
                setIdVerified(false);
                setIdRejected(true);
                setIdVerifyResult({ idType: null, reason: result.reason });
                setValidId(null); // clear the rejected image
              }
            } catch (verifyErr) {
              console.log("ID verify error:", verifyErr);
              // On network error, mark as rejected with a retake prompt
              setIdVerified(false);
              setIdRejected(true);
              setIdVerifyResult({ idType: null, reason: "Verification service unavailable. Please retake your ID photo." });
              setValidId(null);
            } finally {
              setIdVerifying(false);
            }
          }, 350);
        }
      }
    } catch (err) {
      console.log("Camera capture error:", err);
      showAlert("Error", "Failed to capture photo. Please try again.");
    }
  }, [cameraMode]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const showImageOptions = useCallback(
    (setter, label) => {
      Alert.alert(`Upload ${label}`, "Choose a method", [
        { text: "Camera", onPress: () => pickImage(setter, true) },
        { text: "Gallery", onPress: () => pickImage(setter, false) },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [pickImage]
  );

  const handlePhone = (raw) => {
    // Always keep +63 prefix
    if (!raw.startsWith('+63')) {
      setPhoneNumber("+63 ");
      return;
    }
    
    // Extract only digits after +63
    const digitsOnly = raw.slice(3).replace(/\D/g, "");
    
    // Limit to 10 digits
    const limitedDigits = digitsOnly.slice(0, 10);
    
    // Format as +63 XXXXXXXXXX
    setPhoneNumber("+63 " + limitedDigits);
  };

  const isValidPhone = (phone) => {
    return /^(\+63 )\d{10}$/.test(phone);
  };

  // Predictive Analytics State
  const [interestAmount, setInterestAmount] = useState(0);
  const [totalRepayment, setTotalRepayment] = useState(0);
  const [monthlyInstallment, setMonthlyInstallment] = useState(0);
  const [approvalProbability, setApprovalProbability] = useState(100);
  
  // Real-time calculation effect
  useEffect(() => {
    const rawLoanAmount = loanAmount.replace(/,/g, "");
    const principal = parseFloat(rawLoanAmount) || 0;
    const months = parseInt(monthsToPay) || 0;
    
    // Dynamic Interest Rates based on Loan Type
    let rate = 0.01; // Default (Short-term = 1x)
    if (loanType === "Emergency") rate = 0.015; // 1.5x
    if (loanType === "Personal") rate = 0.02; // 2x

    const interest = principal * rate * months;
    const total = principal + interest;
    
    setInterestAmount(interest);
    setTotalRepayment(total);
    setMonthlyInstallment(months > 0 ? total / months : 0);

    // Calculate initial approval odds
    let probability = 85;

    // Type factors
    if (loanType === "Emergency") probability += 10;
    if (loanType === "Short-term") probability += 5;

    // Amount factors
    if (principal > 5000) {
      probability -= ((principal - 5000) / 1000) * 5; // Drops heavily over 5k
    }

    // Months factors
    if (monthsToPay === "12") probability -= 10;
    if (monthsToPay === "3") probability += 5;
    
    if (!loanType) probability -= 10;
    
    // Clamp between 5% and 98%
    setApprovalProbability(Math.max(5, Math.min(98, Math.round(probability))));
  }, [loanAmount, monthsToPay, loanType]);

  // Loans data state
  const [loansData, setLoansData] = useState([]);
  const [summaryData, setSummaryData] = useState(SUMMARY_DATA);
  const [userRole, setUserRole] = useState(null); // null = loading

  const existingLoanBalance = loansData.reduce((acc, loan) => {
    if (loan.status !== "rejected" && loan.status !== "completed") {
      const val = loan.remainingBalance || loan.amountNum || 0;
      return acc + val;
    }
    return acc;
  }, 0);

  // Load loans from backend API (reflects admin status changes)
  const loadLoansFromAPI = useCallback(async () => {
    if (!userEmail) return;
    try {
      const response = await getLoans();
      const serverLoans = response?.loans || [];

      // Map server data to UI format
      const mapped = serverLoans.map(loan => ({
        id: loan.loanId,
        _id: loan._id,
        type: loan.loanType,
        amount: loan.amount,
        amountNum: loan.amount,
        status: loan.status,
        monthlyPayment: loan.monthlyPayment,
        remainingBalance: loan.remainingBalance,
        totalRepayment: loan.totalRepayment,
        totalInterest: loan.totalInterest,
        termMonths: loan.termMonths,
        paidMonths: loan.paidMonths || 0,
        disbursed: loan.disbursed,
        nextPayment: loan.nextPayment || "-",
        applied: loan.appliedDate,
        purpose: loan.purpose,
        phoneNumber: loan.phoneNumber,
        memberName: loan.memberName,
        disbursementMethod: loan.disbursementMethod,
        accountNumber: loan.accountNumber,
        interestRate: loan.interestRate,
        adminModified: loan.adminModified || false,
        originalAmount: loan.originalAmount || null,
        originalTermMonths: loan.originalTermMonths || null,
      }));
      setLoansData(mapped);
      await AsyncStorage.setItem(`faithly_loans_${userEmail}`, JSON.stringify(mapped));

      // Calculate summaries from API data
      let totalBorrowed = 0;
      let totalRemaining = 0;
      let activeCount = 0;
      mapped.forEach(loan => {
        if (loan.status === "active" || loan.status === "completed") {
          totalBorrowed += loan.amountNum || 0;
        }
        if (loan.status === "active") {
          totalRemaining += loan.remainingBalance || 0;
          activeCount++;
        }
      });

      const newSummary = [...SUMMARY_DATA];
      newSummary[0] = { ...newSummary[0], value: `₱${totalBorrowed.toLocaleString()}` };
      newSummary[1] = { ...newSummary[1], value: `₱${totalRemaining.toLocaleString()}` };
      newSummary[2] = { ...newSummary[2], value: String(activeCount) };
      setSummaryData(newSummary);
    } catch (e) {
      console.log("Failed to load loans from API:", e);
    }
  }, [userEmail]);

  useFocusEffect(
    useCallback(() => {
      loadLoansFromAPI();
    }, [loadLoansFromAPI])
  );

  // Load savings total for loan eligibility check
  useFocusEffect(
    useCallback(() => {
      const loadSavings = async () => {
        if (!userEmail) return;
        try {
          const saved = await AsyncStorage.getItem(`faithly_savings_${userEmail}`);
          if (saved) {
            const arr = JSON.parse(saved);
            let total = 0;
            arr.forEach(d => { total += parseFloat(d.amount) || 0; });
            setTotalSavings(total);
          } else {
            setTotalSavings(0);
          }
        } catch (e) {
          console.log("Savings load error:", e);
        }
      };
      loadSavings();
    }, [userEmail])
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
      if (event.url && event.url.includes("puac://payment/success?type=loan")) {
        // Find if we had an active pay now modal, close it
        setPayNowModalOpen(false);
        Alert.alert("Payment Successful", "Your loan payment has been processed.");
        loadLoansFromAPI();
      } else if (event.url && event.url.includes("puac://payment/cancel")) {
        Alert.alert("Payment Canceled", "The payment process was canceled.");
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
  }, [loadLoansFromAPI]);

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
      setLoanLoading(false);
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
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for unread notifications
  useFocusEffect(
    useCallback(() => {
      const checkUnread = async () => {
        if (!userEmail) return;
        try {
          const savedData = await AsyncStorage.getItem(`faithly_notifications_${userEmail}`);
          if (savedData) {
            const notifs = JSON.parse(savedData);
            const hasUnread = notifs.some(n => !n.read);
            setHasUnreadNotifs(hasUnread);
          }
        } catch (e) {
          // ignore
        }
      };
      
      checkUnread();
    }, [userEmail])
  );

  const [verifStatus, setVerifStatus] = useState("none");
  const [userPosition, setUserPosition] = useState("");

  // Always show all tabs on the Loans screen since the user must be an officer to be here
  const TAB_ITEMS = ALL_TAB_ITEMS;
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

  // Re-fetch role every time screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!userEmail) return;
      (async () => {
        try {
          const data = await getVerificationStatus(userEmail);
          if (data?.role) setUserRole(data.role);
          if (data?.position) setUserPosition(data.position);
        } catch {
          setUserRole("member");
        }
      })();
    }, [userEmail])
  );

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
            toValue: 1.2, tension: 100, friction: 6, useNativeDriver: true,
          }),
          Animated.timing(tabAnimations[ai].bgOpacity, {
            toValue: 1, duration: 250, useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(tabAnimations[ai].scale, {
            toValue: 1, tension: 100, friction: 6, useNativeDriver: true,
          }),
          Animated.timing(tabAnimations[ai].bgOpacity, {
            toValue: 0, duration: 250, useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [activeTab, indicatorPosition, tabAnimations, TAB_ITEMS, TAB_WIDTH]);

  // Real-time field validation for loan form
  useEffect(() => {
    if (!applyModalOpen) return;
    const errors = {};
    if (!loanType) errors.loanType = "Please select a loan type.";
    const rawAmt = loanAmount.replace(/,/g, "");
    const principal = parseFloat(rawAmt);
    if (!loanAmount || isNaN(principal) || principal <= 0) errors.amount = "Please enter a valid loan amount.";
    else if (principal < 1000) errors.amount = "Minimum loan amount: ₱1,000.";
    if (!phoneNumber.trim() || phoneNumber.trim() === "+63 ") errors.phone = "Please enter your phone number.";
    else if (!isValidPhone(phoneNumber)) errors.phone = "Enter exactly 10 digits after +63.";
    const finalPurpose = purposeCategory === "Other" ? purpose.trim() : purposeCategory;
    if (!finalPurpose) errors.purpose = "Please specify the purpose of the loan.";
    if (!monthsToPay || parseInt(monthsToPay) <= 0) errors.months = "Please select the months to pay.";
    if (!disbursementMethod) errors.disbursement = "Please select a disbursement method.";
    if ((disbursementMethod === "GCash" || disbursementMethod === "Bank Transfer") && !accountNumber.trim()) {
      errors.accountNumber = `Please provide your ${disbursementMethod} account number.`;
    }
    if (!agreedToTerms) errors.terms = "Please agree to the Loan Terms & Conditions.";
    if (!idVerified) errors.validId = "Please capture and verify your government ID.";
    setFieldErrors(errors);
  }, [applyModalOpen, loanType, loanAmount, phoneNumber, purposeCategory, purpose, monthsToPay, disbursementMethod, accountNumber, agreedToTerms, idVerified]);

  // Handle loan application submission
  const handleSubmitLoan = async () => {
    // Ref-based guard prevents double-submission from rapid taps — checked FIRST
    if (submittingRef.current) return;
    submittingRef.current = true; // Lock immediately before anything else
    setFormError(""); 
    
    const showError = (msg) => {
      submittingRef.current = false; // Unlock so user can retry
      setFormError(msg);
      Alert.alert("Validation Error", msg);
    };

    // Validation
    if (!loanType) return showError("Please select a loan type.");
    
    const rawLoanAmount = loanAmount.replace(/,/g, "");
    const principal = parseFloat(rawLoanAmount);
    if (isNaN(principal) || principal <= 0) return showError("Please enter a valid loan amount.");

    if (!phoneNumber.trim() || phoneNumber.trim() === "+63 ") return showError("Please enter your phone number.");
    if (!isValidPhone(phoneNumber)) return showError("Enter exactly 10 digits after +63");
    
    const finalPurpose = purposeCategory === "Other" ? purpose.trim() : purposeCategory;
    if (!finalPurpose) return showError("Please specify the purpose of the loan.");
    if (!monthsToPay || parseInt(monthsToPay) <= 0) return showError("Please select the months to pay.");
    if (!disbursementMethod) return showError("Please select a disbursement method.");
    if ((disbursementMethod === "GCash" || disbursementMethod === "Bank Transfer") && !accountNumber.trim()) {
      return showError(`Please provide your ${disbursementMethod} account number.`);
    }
    if (!agreedToTerms) return showError("Please agree to the Loan Terms & Conditions.");
    if (principal < 1000) return showError("Minimum Loan Amount: ₱1,000.");
    if (!idVerified) return showError("Your government ID has not been verified. Please retake your ID photo.");

    let multiplier = loanType === "Emergency" ? 1.5 : (loanType === "Personal" ? 2 : 1);
    const baseLimit = totalSavings * multiplier;
    const maxLimit = Math.max(0, baseLimit - existingLoanBalance);

    if (principal > maxLimit) {
      return showError(`Insufficient Limit:\nYour max limit for a ${loanType} loan is ₱${baseLimit.toLocaleString()} (${multiplier}x of your ₱${totalSavings.toLocaleString()} savings). You have ₱${existingLoanBalance.toLocaleString()} in active unpaid loans, leaving ₱${maxLimit.toLocaleString()} available.`);
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const capturedLoanType = loanType;
      const capturedMonths = parseInt(monthsToPay);

      // Build backend payload
      const backendPayload = {
        amount: principal,
        loanType: capturedLoanType.toLowerCase().replace(" ", "-"),
        type: capturedLoanType.toLowerCase().replace(" ", "-"),
        termMonths: capturedMonths,
        disbursementMethod: disbursementMethod === "GCash" ? "e-wallet" : disbursementMethod === "Bank Transfer" ? "bank" : "cash",
        disbursementAccount: (disbursementMethod === "GCash" || disbursementMethod === "Bank Transfer") ? accountNumber.trim() : "",
        accountNumber: (disbursementMethod === "GCash" || disbursementMethod === "Bank Transfer") ? accountNumber.trim() : "",
        purpose: finalPurpose,
        phoneNumber: phoneNumber.trim(),
        selfieData: selfie?.base64 ? `data:image/jpeg;base64,${selfie.base64}` : "",
        idData: validId?.base64 ? `data:image/jpeg;base64,${validId.base64}` : "",
        coeData: coeDoc?.base64 ? `data:image/jpeg;base64,${coeDoc.base64}` : "",
        itrData: itrDoc?.base64 ? `data:image/jpeg;base64,${itrDoc.base64}` : "",
        payslipData: payslipDoc?.base64 ? `data:image/jpeg;base64,${payslipDoc.base64}` : "",
        hasActiveLoan: hasExistingLoan === "Yes",
        activeLoanScreenshotData: activeLoanDoc?.base64 ? `data:image/jpeg;base64,${activeLoanDoc.base64}` : null,
        activeLoanScreenshotFileName: activeLoanDoc ? "active_loan.jpg" : null,
      };

      const result = await createLoan(backendPayload);
      const serverLoan = result?.loan || {};

      if (userEmail) {
        addNotification(
          userEmail,
          "loan",
          "Loan Application Received",
          `Your application for a ${capturedLoanType} loan of ₱${principal.toLocaleString()} is being processed. You will be notified once it is approved.`
        );
      }

      // Reset form & clear saved draft
      await clearLoanDraft();
      setLoanType("");
      setLoanAmount("");
      setPhoneNumber("+63 ");
      setPurposeCategory("");
      setPurpose("");
      setMonthsToPay("");
      setSelfie(null);
      setValidId(null);
      setIdVerified(false);
      setIdRejected(false);
      setIdVerifying(false);
      setIdVerifyResult(null);
      setCoeDoc(null);
      setItrDoc(null);
      setPayslipDoc(null);
      setActiveLoanDoc(null);
      setHasExistingLoan(null);
      setDisbursementMethod("");
      setAccountNumber("");
      setAgreedToTerms(false);

      // Close apply modal and refresh dashboard
      setApplyModalOpen(false);
      await loadLoansFromAPI();

      // Show loan receipt modal successfully
      setReceiptData({
        id: serverLoan.loanId || "-",
        type: capturedLoanType,
        amount: principal,
        monthsToPay: capturedMonths,
        interestRate: serverLoan.totalInterest ? (serverLoan.totalInterest / (principal * capturedMonths)) : 0.02,
        monthlyPayment: serverLoan.monthlyPayment || 0,
        totalRepayment: serverLoan.totalRepayment || 0,
        status: "pending",
        statusBg: C.orangeLight,
        appliedDate: new Date().toLocaleDateString(),
        paymentsMade: 0,
        totalPayments: capturedMonths,
        purpose: backendPayload.purpose,
      });
      setSuccessModalOpen(true);

    } catch (err) {
      console.log("Submit loan err", err);
      Alert.alert("Submission Failed", err.message || "Could not submit your loan application at this time.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Handle accepting an approved loan
  const handleAcceptLoan = async (loanId) => {
    Alert.alert(
      "Accept Loan",
      "By accepting, you agree to the loan terms and repayment schedule. The secretary will then disburse the funds.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              await acceptLoan(loanId);
              Alert.alert("Loan Accepted", "Your loan has been accepted. Funds will be disbursed by the secretary.");
              addNotification(
                userEmail,
                "loan",
                "Loan Accepted",
                `You accepted loan ${loanId}. Awaiting fund disbursement.`
              );
              await loadLoansFromAPI();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to accept loan.");
            }
          },
        },
      ]
    );
  };

  // Open Pay Now modal
  const handleOpenPayNow = (loan) => {
    // Open immediately to avoid blocking user
    setPayNowLoan(loan);
    setPayType("regular");
    setCustomPayAmount("");
    setCustomPayMonths(0);
    setShowMonthPicker(false);
    setPayAmount(String(loan.monthlyPayment || 0));
    setPayMethod("gcash");
    setPayProof(null);
    setPayNowModalOpen(true);
    
    // Refresh data in background
    loadLoansFromAPI().then(() => {
       // Optional: Check if status changed in background
       AsyncStorage.getItem(`faithly_loans_${userEmail}`).then(latest => {
         if (latest) {
           const current = JSON.parse(latest).find(l => l.id === loan.id);
           if (current && current.status === "completed") {
             setPayNowModalOpen(false);
             Alert.alert("Loan Completed", "This loan has already been fully paid.");
           }
         }
       });
    });
  };

  // Submit a loan payment
  const handleSubmitPayment = async () => {
    if (paySubmittingRef.current) return;
    if (!payNowLoan) return;

    let amount = 0;
    if (payType === "regular") {
      // Server auto-calculates — use local value only for UI display
      amount = Number(payNowLoan.monthlyPayment || payNowLoan.upcomingPaymentAmount || 1);
    } else if (payType === "full") {
      // Server auto-calculates the full remaining balance
      amount = Number(payNowLoan.remainingBalance || payNowLoan.totalRepayment || 1);
    } else if (payType === "custom") {
      amount = Number(customPayAmount.replace(/,/g, "")) || 0;
      if (amount < 500) {
        return Alert.alert("Error", "Minimum custom payment amount is ₱500.");
      }
      if (amount <= 0) {
        return Alert.alert("Error", "Please enter a valid payment amount.");
      }
    }

    const isManual = paymentApprovalMethod === "manual";
    const isCash = payMethod === "cash";

    // Require proof for GCash and Bank Transfer
    if (isManual && !isCash && !payProof) {
      return Alert.alert("Proof Required", "Please upload proof of payment for this payment method.");
    }

    paySubmittingRef.current = true;
    setPaySubmitting(true);
    try {
      // Exact mapping per web dev's API spec:
      // paymentMethod: lowercase "cash" | "gcash" | "bank"
      // paymentType: "regular" | "advance" | "full"
      // amount: only required for "advance" — server auto-calculates regular & full
      const apiMethod = payMethod === "gcash" ? "gcash"
                      : payMethod === "bank"  ? "bank"
                      : "cash";

      // "custom" in UI → "advance" in API
      const paymentType = payType === "regular" ? "regular"
                        : payType === "full"    ? "full"
                        : "advance";

      const payload = {
        paymentMethod: apiMethod,
        paymentType,
        // Only send amount for advance (custom) payments
        ...(paymentType === "advance" ? { amount, advanceMonths: customPayMonths || undefined } : {}),
      };

      if (!isManual && !isCash) {
        // Gateway payment — pass redirect URLs
        payload.successUrl = "puac://payment/success?type=loan";
        payload.cancelUrl  = "puac://payment/cancel";
      }

      if (isManual && !isCash) {
        // Manual GCash / Bank Transfer — attach proof
        payload.subMethod     = apiMethod;
        payload.proofData     = payProof?.base64 ? `data:image/jpeg;base64,${payProof.base64}` : "";
        payload.proofFileName = "gcash_receipt.jpg";
      }

      // Use MongoDB _id for the route param (web backend resolves by _id or loanId)
      const loanId = payNowLoan._id || payNowLoan.id;
      const response = await submitLoanPayment(loanId, payload);




      if (!isManual && !isCash && response && response.checkoutUrl) {
        // Assume Linking is imported, but we need to verify import.
        import('react-native').then(({ Linking }) => Linking.openURL(response.checkoutUrl));
      } else {
        Alert.alert("Payment Submitted", "Your payment has been submitted and is pending admin confirmation.");
        addNotification(
          userEmail,
          "loan",
          "Payment Submitted",
          `Payment of ₱${amount.toLocaleString()} for loan ${payNowLoan.id} is pending confirmation.`
        );
      }
      
      setPayNowModalOpen(false);
      setPayProof(null);
      await loadLoansFromAPI();
    } catch (err) {
      // Enhanced error reporting to help diagnose the issue
      Alert.alert(
        "Payment Failed",
        `${err.message}\n\nLoan ID: ${payNowLoan.id}\nStatus: ${payNowLoan.status}`
      );
    } finally {
      paySubmittingRef.current = false;
      setPaySubmitting(false);
    }
  };

  // Open View Schedule modal
  const handleOpenSchedule = async (loan) => {
    setScheduleLoan(loan);
    setScheduleModalOpen(true);
    try {
      // Use getMyLoanPayments (new endpoint: GET /loans/my-payments)
      const res = await getMyLoanPayments();
      const allPayments = res?.payments || [];
      // Filter to this loan's payments
      setLoanPayments(allPayments.filter(p => p.loanId === loan.id || p.loanId === loan._id || p._id === loan.id));
    } catch {
      setLoanPayments([]);
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
            await loadLoansFromAPI();
            setRefreshing(false);
          }} tintColor="#0D1F45" colors={["#0D1F45"]} />
        }
      >

        {/* Main Loans Content */}
        <>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.textDark }]}>My Loans</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
              Manage your loan applications and payments
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.applyBtn, !isEligibleForLoan && { opacity: 0.5 }]}
            activeOpacity={0.85}
            onPress={() => {
              if (!isEligibleForLoan) return;
              const hasOngoingLoan = loansData.some(l => ["pending", "approved", "member_accepted", "active"].includes(l.status?.toLowerCase()));
              if (hasOngoingLoan) {
                return showAlert("Wait just a moment", "You already have an active loan or an ongoing application. Please complete or settle it before applying for a new one.");
              }
              handleOpenApplyModal();
            }}
            disabled={!isEligibleForLoan}
          >
            <Text style={styles.applyBtnPlus}>+</Text>
            <Text style={styles.applyBtnText}>Apply for Loan</Text>
          </TouchableOpacity>
        </View>

        {/* Savings Eligibility Banner */}
        {!isEligibleForLoan && (
          <TouchableOpacity
            style={{
              backgroundColor: "rgba(231,76,60,0.06)",
              borderWidth: 1,
              borderColor: "rgba(231,76,60,0.3)",
              borderRadius: s(16),
              paddingHorizontal: s(16),
              paddingTop: s(16),
              paddingBottom: 5,
              marginBottom: s(16),
            }}
            activeOpacity={0.8}
            onPress={() => navigation.replace("Savings", { email: userEmail })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: s(44), height: s(44), borderRadius: s(12), backgroundColor: 'rgba(231,76,60,0.15)',
                alignItems: 'center', justifyContent: 'center', marginRight: 14
              }}>
                <Image source={ICONS.lock} style={{ width: s(22), height: s(22), tintColor: C.red }} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fs(16), fontWeight: '800', color: C.red }}>Savings Required</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
                  <Text style={{ fontSize: fs(13), color: C.red, opacity: 0.85, lineHeight: 18 }}>
                    Requires ₱1,000 threshold.{"\n"}Current balances: ₱{totalSavings.toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: fs(13), fontWeight: '700', color: C.red, marginBottom: 2 }}>
                    Go to Savings →
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: 3, marginTop: 10, width: "100%", overflow: "hidden" }}>
                <View style={{ height: "100%", backgroundColor: C.red, borderRadius: 3, width: `${Math.min(100, eligibilityProgress * 100)}%` }} />
            </View>
          </TouchableOpacity>
        )}

        {/* œ... Summary Grid */}
        {loanLoading ? (
          <View style={styles.summaryGrid}>
            <SkeletonStatCard style={styles.summaryCardWide} />
            <SkeletonStatCard style={styles.summaryCardHalf} />
            <SkeletonStatCard style={styles.summaryCardHalf} />
          </View>
        ) : (
        <View style={styles.summaryGrid}>
          {summaryData.map((item, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.summaryCard,
                idx === 0 ? styles.summaryCardWide : styles.summaryCardHalf,
                { opacity: summaryAnims[idx].opacity, transform: [{ translateY: summaryAnims[idx].translateY }] },
              ]}
            >
              <View style={styles.summaryLeft}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{item.label}</Text>
                <Text style={[styles.summaryValue, { color: colors.textDark }]}>{item.value}</Text>
              </View>
              <View
                style={[styles.summaryIconBg, { backgroundColor: item.iconBg }]}
              >
                <Image
                  source={item.icon}
                  style={[styles.summaryIcon, { tintColor: item.iconColor }]}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          ))}
        </View>
        )}

        {/* Loan Timeline Calendar */}
        {isEligibleForLoan && (
          <LoanCalendar
            loans={loansData}
            notes={loanNotes}
            onDatePress={(date) => {
              setSelectedCalendarDate(date);
              const dateKey = date.toISOString().split('T')[0];
              setNewNoteText(loanNotes[dateKey] || "");
              setNoteModalOpen(true);
            }}
            colors={colors}
            currentMonth={currentCalendarMonth}
            setCurrentMonth={setCurrentCalendarMonth}
          />
        )}

        {/* All Loans Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>All Loans</Text>

          {loansData.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No Loans Yet"
              subtitle="Your loan applications will appear here once you apply."
            />
          ) : (
          loansData.map((loan, idx) => (
            <View key={idx} style={[styles.loanCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {/* Section label for active loans */}
              {loan.status === "active" && (
                <Text style={{ fontSize: fs(15), fontWeight: "800", color: colors.textDark, marginBottom: 14 }}>Active Loan</Text>
              )}

              {/* Loan Header */}
              <View style={styles.loanHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <Text style={[styles.loanId, { color: colors.textDark, marginBottom: 0 }]}>{loan.id}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { marginBottom: 0, backgroundColor: 
                          loan.status === "active" ? C.greenLight :
                          loan.status === "approved" || loan.status === "member_accepted" ? "rgba(46,107,240,0.1)" :
                          loan.status === "completed" ? "rgba(52,199,89,0.15)" :
                          loan.status === "rejected" ? "rgba(231,76,60,0.1)" :
                          C.orangeLight
                        },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: 
                          loan.status === "active" ? C.green :
                          loan.status === "approved" || loan.status === "member_accepted" ? "#0D1F45" :
                          loan.status === "completed" ? C.green :
                          loan.status === "rejected" ? C.red :
                          C.orange
                        }]}
                      >
                        {loan.status === "member_accepted" ? "Accepted" : loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.loanApplied, { color: colors.textMuted }]}>
                    {loan.applied ? new Date(loan.applied).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"} · {loan.type} Loan
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                 {/* Show the original applied amount; if admin modified, show both */}
                 <Text style={[styles.loanAmount, { color: colors.textDark }]}>
                   ₱{((loan.adminModified && loan.originalAmount) ? loan.originalAmount : (loan.amountNum || loan.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                 </Text>
                 {loan.adminModified && loan.originalAmount && loan.originalAmount !== (loan.amountNum || loan.amount) ? (
                   <Text style={{ fontSize: fs(11), color: C.orange, marginTop: 2 }}>Modified → ₱{(loan.amountNum || loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                 ) : (
                   <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 2 }}>Applied amount</Text>
                 )}
                </View>
              </View>

              {/* Accept Button - only shown when admin modified the loan terms */}
              {loan.status === "approved" && loan.adminModified && (
                <View style={{ marginBottom: s(8), marginHorizontal: 4 }}>
                  <View style={{ backgroundColor: "rgba(255,149,0,0.08)", paddingVertical: s(10), paddingHorizontal: s(14), borderRadius: s(8), marginBottom: s(8), borderWidth: 1, borderColor: "rgba(255,149,0,0.2)" }}>
                    <Text style={{ color: C.orange, fontSize: fs(12), fontWeight: "700", marginBottom: 4 }}>š ï¸ Admin Modified Your Loan Terms:</Text>
                    {loan.originalAmount != null && loan.originalAmount !== loan.amountNum && (
                      <Text style={{ color: colors.textDark, fontSize: fs(12), marginBottom: 2 }}>
                        * Amount: ₱{loan.originalAmount.toLocaleString()} → ₱{(loan.amountNum || 0).toLocaleString()}
                      </Text>
                    )}
                    {loan.originalTermMonths != null && loan.originalTermMonths !== loan.termMonths && (
                      <Text style={{ color: colors.textDark, fontSize: fs(12), marginBottom: 2 }}>
                        * Term: {loan.originalTermMonths} months → {loan.termMonths} months
                      </Text>
                    )}
                    <Text style={{ color: colors.textMuted, fontSize: fs(11), marginTop: 4 }}>Please review and accept the updated terms below.</Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: "#0D1F45", paddingVertical: s(10), paddingHorizontal: s(20), borderRadius: s(8), alignItems: "center" }}
                    activeOpacity={0.8}
                    onPress={() => handleAcceptLoan(loan.id)}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>✓ Accept Modified Loan Terms</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Awaiting disbursement message */}
              {loan.status === "member_accepted" && (
                <View style={{ backgroundColor: "rgba(46,107,240,0.08)", paddingVertical: s(10), paddingHorizontal: s(14), borderRadius: s(8), marginBottom: s(8), marginHorizontal: 4 }}>
                  <Text style={{ color: "#0D1F45", fontSize: fs(12), fontWeight: "600", textAlign: "center" }}>⌛ Awaiting fund disbursement by secretary</Text>
                </View>
              )}

              {/*  ▬▬ Active Loan: Repayment Progress + Stats + 3 Buttons  ▬▬ */}
              {loan.status === "active" && (
                <>
                  {/* Repayment Progress */}
                  <View style={{ marginTop: 4, marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ fontSize: fs(12), color: "#0D1F45", fontWeight: "600" }}>Repayment progress</Text>
                      <Text style={{ fontSize: fs(12), color: colors.textMuted }}>{loan.paidMonths || 0} of {loan.termMonths || 0} payments made</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.inputBg || "#E8ECF0", borderRadius: 3, overflow: "hidden" }}>
                      <View style={{ height: "100%", backgroundColor: "#0D1F45", borderRadius: 3, width: `${loan.termMonths ? Math.min(100, ((loan.paidMonths || 0) / loan.termMonths) * 100) : 0}%` }} />
                    </View>
                  </View>

                  {/* Stats Row - 3 cards */}
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                    <View style={{ flex: 1, backgroundColor: colors.inputBg || "#F5F7FA", borderRadius: s(10), padding: 12 }}>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted, marginBottom: s(4), fontWeight: "600" }}>Monthly payment</Text>
                      <Text style={{ fontSize: fs(14), fontWeight: "700", color: colors.textDark }}>₱{(loan.monthlyPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.inputBg || "#F5F7FA", borderRadius: s(10), padding: 12 }}>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted, marginBottom: s(4), fontWeight: "600" }}>Remaining balance</Text>
                      <Text style={{ fontSize: fs(14), fontWeight: "700", color: colors.textDark }}>₱{(loan.remainingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.inputBg || "#F5F7FA", borderRadius: s(10), padding: 12 }}>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted, marginBottom: s(4), fontWeight: "600" }}>Next due date</Text>
                      <Text style={{ fontSize: fs(14), fontWeight: "700", color: colors.textDark }}>{loan.nextPayment || "-"}</Text>
                    </View>
                  </View>

                  {/* 3 Action Buttons: View schedule, Loan details, Pay now */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder || "#E0E5EC", borderRadius: s(8), paddingVertical: s(10), alignItems: "center", backgroundColor: colors.cardBg }}
                      activeOpacity={0.7}
                      onPress={() => handleOpenSchedule(loan)}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.textDark }}>View schedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, borderWidth: 1, borderColor: colors.cardBorder || "#E0E5EC", borderRadius: s(8), paddingVertical: s(10), alignItems: "center", backgroundColor: colors.cardBg }}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedLoan(loan);
                        setDetailsModalOpen(true);
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.textDark }}>Loan details</Text>
                    </TouchableOpacity>
                    {loan.status === "active" && (
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: C.blue, borderRadius: s(8), paddingVertical: s(10), alignItems: "center" }}
                        activeOpacity={0.8}
                        onPress={() => handleOpenPayNow(loan)}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#FFF" }}>Pay now</Text>
                      </TouchableOpacity>
                    )}
                    {loan.status === "completed" && (
                      <View style={{ flex: 1, backgroundColor: "rgba(52,199,89,0.1)", borderRadius: s(8), paddingVertical: s(10), alignItems: "center" }}>
                        <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.green }}>Fully Paid</Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/*  ▬▬ Non-active loan: Awaiting Release / Completed UI  ▬▬ */}
              {loan.status !== "active" && loan.status !== "completed" && (
                <>
                  {loan.status === "approved" && (
                    <Text style={{ fontSize: fs(12), color: colors.textMuted, marginBottom: s(12), marginTop: -4 }}>
                      Review and accept the terms above to proceed.
                    </Text>
                  )}
                  {loan.status === "member_accepted" && (
                    <Text style={{ fontSize: fs(12), color: colors.textMuted, marginBottom: s(12), marginTop: -4, textAlign: "center" }}>
                      Your loan will become active once funds are disbursed.
                    </Text>
                  )}
                  {loan.status === "pending" && (
                    <Text style={{ fontSize: fs(12), color: colors.textMuted, marginBottom: s(12), marginTop: -4 }}>
                      Your application is under review by the administration.
                    </Text>
                  )}
                  <TouchableOpacity 
                    style={styles.detailsBtn} 
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedLoan(loan);
                      setDetailsModalOpen(true);
                    }}
                  >
                    <Text style={styles.detailsBtnText}>View Details</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))
          )}
        </View>

        <View style={styles.bottomPad} />
        </>
      </ScrollView>

      {/* Floating draggable chat button */}
      <DraggableChatButton onPress={() => setChatbotOpen(true)} />

      <ChatbotModal visible={chatbotOpen} onClose={() => setChatbotOpen(false)} />

      {/* Face Verification Camera Modal */}
      <Modal
        visible={cameraModalOpen}
        animationType="slide"
        onRequestClose={() => {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setCameraModalOpen(false);
          setTimeout(() => setApplyModalOpen(true), 350);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            ref={cameraRef}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            facing={cameraMode === "selfie" ? "front" : "back"}
            active={cameraModalOpen}
            onCameraReady={() => setCameraReady(true)}
          />
          {/* UI overlay */}
          <View style={{ flex: 1, zIndex: 10, elevation: 10 }}>
            {/* Top bar */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 50, paddingHorizontal: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                  setCameraModalOpen(false);
                  // Reopen the apply modal when user cancels camera
                  setTimeout(() => setApplyModalOpen(true), 350);
                }}
                style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
              >
                <Text style={{ color: "#fff", fontSize: fs(16), fontWeight: "700" }}>✕ Close</Text>
              </TouchableOpacity>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: s(12), paddingVertical: 6, borderRadius: 15 }}>
                <Text style={{ color: "#fff", fontSize: fs(13), fontWeight: "700" }}>
                  {cameraMode === "selfie" ? "SELFIE VERIFICATION" : "ID CAPTURE"}
                </Text>
              </View>
            </View>

            {/* Guide frame area */}
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              {cameraMode === "selfie" ? (
                /* Oval face guide for selfie */
                <View style={{
                  width: 240, height: 320,
                  borderRadius: 120,
                  borderWidth: 3,
                  borderColor: cameraCountdown > 0 ? "#34C759" : "rgba(255,255,255,0.8)",
                  borderStyle: "dashed",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }}>
                  {cameraCountdown > 0 ? (
                    <Text style={{ color: "#34C759", fontSize: 72, fontWeight: "900", textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 }}>{cameraCountdown}</Text>
                  ) : (
                    <Text style={{ color: "#fff", fontSize: fs(16), fontWeight: "600", textAlign: "center", textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
                      Position your face{"\n"}within the oval
                    </Text>
                  )}
                </View>
              ) : (
                /* Rectangle document guide for ID */
                <View style={{
                  width: '85%', height: 240,
                  borderRadius: s(16),
                  borderWidth: 3,
                  borderColor: cameraCountdown > 0 ? "#34C759" : "rgba(255,255,255,0.8)",
                  borderStyle: "dashed",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }}>
                  {cameraCountdown > 0 ? (
                    <Text style={{ color: "#34C759", fontSize: 72, fontWeight: "900", textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 }}>{cameraCountdown}</Text>
                  ) : (
                    <Text style={{ color: "#fff", fontSize: fs(16), fontWeight: "600", textAlign: "center", textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
                      Align your ID{"\n"}within the frame
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Bottom Controls Area */}
            <View style={{ paddingBottom: 40, alignItems: "center" }}>
              {/* Instruction text */}
              <View style={{ alignItems: "center", paddingHorizontal: 40, marginBottom: 20 }}>
                <Text style={{ color: "#fff", fontSize: fs(14), fontWeight: "500", textAlign: "center", textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
                  {cameraMode === "selfie"
                    ? "Hold your ID next to your face with today's date visible"
                    : "Place your government ID flat and well-lit"}
                </Text>
              </View>

              {/* Capture button */}
              <TouchableOpacity
                style={{
                  width: 80, height: 80, borderRadius: 40,
                  borderWidth: 5, borderColor: "#fff",
                  backgroundColor: cameraCountdown > 0 ? "#34C759" : "rgba(255,255,255,0.3)",
                  justifyContent: "center", alignItems: "center",
                  marginBottom: s(10),
                  shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5
                }}
                onPress={() => {
                  if (cameraCountdown > 0) return;
                  startCameraCountdown(captureFromCamera);
                }}
                disabled={cameraCountdown > 0}
                activeOpacity={0.7}
              >
                <View style={{
                  width: s(60), height: s(60), borderRadius: s(30),
                  backgroundColor: cameraCountdown > 0 ? "#34C759" : "#fff",
                }} />
              </TouchableOpacity>

              {/* Hint */}
              <Text style={{ color: "#fff", fontSize: fs(13), fontWeight: "600", opacity: 0.8 }}>
                {cameraCountdown > 0 ? "Hold still..." : "Tap to start 3-second capture"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loan Application Modal */}
      <Modal
        visible={applyModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => handleCloseApplyModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: C.overlay }}
            activeOpacity={1}
            onPress={() => handleCloseApplyModal(false)}
          />

          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Apply for Loan</Text>
              <TouchableOpacity
                onPress={() => handleCloseApplyModal(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >


              {/* Loan Type Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textDark }]}>Select Loan Type *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: s(10), paddingBottom: 10 }}>
                  {LOAN_TYPES.map((type) => {
                    const isSelected = loanType === type.value;
                    const isExpanded = expandedLoanType === type.value;
                    const maxLimit = totalSavings * type.multiplier;
                    return (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.loanTypeCard,
                          { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                          isSelected && styles.loanTypeCardActive,
                        ]}
                        onPress={() => {
                          setLoanType(type.value);
                          setMonthsToPay("");
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.loanTypeHeader}>
                          <Image source={ICONS.document} style={[styles.loanTypeIcon, isSelected && { tintColor: C.blue }]} resizeMode="contain" />
                          <View style={styles.loanTypeTitleGroup}>
                            <Text style={[styles.loanTypeTitle, isSelected && { color: C.blue }]}>{type.label}</Text>
                            <View style={styles.loanTypeBadge}>
                              <Text style={styles.loanTypeBadgeText}>{type.multiplierLabel}</Text>
                            </View>
                          </View>
                        </View>
                        
                        <TouchableOpacity
                          style={styles.moreInfoBtn}
                          onPress={() => setExpandedLoanType(isExpanded ? null : type.value)}
                        >
                          <Text style={styles.moreInfoText}>
                            {isExpanded ? "∧ Less Info" : "∨ More Info"}
                          </Text>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.expandedInfo}>
                            <Text style={styles.expandedDesc}>{type.description}</Text>
                            <View style={styles.expandedBadges}>
                              <View style={styles.expandedBadge}><Text style={styles.expandedBadgeText}>{type.rateLabel}</Text></View>
                              <View style={styles.expandedBadge}><Text style={styles.expandedBadgeText}>{type.monthsLabel}</Text></View>
                            </View>
                            <Text style={[styles.expandedMax, isSelected && { color: C.blue }]}>Max: ₱{maxLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              {fieldErrors.loanType && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: -6, marginBottom: 4 }}>{fieldErrors.loanType}</Text>}

              {/* Loan Amount */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textDark }]}>Loan Amount *</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Text style={[styles.currencySymbol, { color: colors.textDark }]}>₱</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.textDark }]}
                    placeholder="Enter amount"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={loanAmount}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, "");
                      const formatted = numericText.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                      setLoanAmount(formatted);
                    }}
                  />
                </View>
                {loanType ? (() => {
                  let multiplier = 1;
                  if (loanType === "Emergency") multiplier = 1.5;
                  if (loanType === "Personal") multiplier = 2;
                  const baseLimit = totalSavings * multiplier;
                  const maxLimit = Math.max(0, baseLimit - existingLoanBalance);
                  return (
                    <Text style={[styles.formHint, { color: colors.textMuted, marginTop: 6 }]}>
                      Maximum limit: ₱{baseLimit.toLocaleString()} ({multiplier}x of ₱{totalSavings.toLocaleString()} savings).{"\n"}
                      Active Balance: ₱{existingLoanBalance.toLocaleString()} | Available Limit: ₱{maxLimit.toLocaleString()}
                    </Text>
                  );
                })() : null}
                {fieldErrors.amount && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4 }}>{fieldErrors.amount}</Text>}
              </View>

              {/* Months to Pay */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textDark }]}>Months to Pay *</Text>
                <View style={styles.typeGrid}>
                  {(loanType === "Emergency" ? ["1", "3", "6"] : loanType === "Short-term" ? ["1", "2", "3"] : ["3", "6", "9", "12"]).map((months) => (
                    <TouchableOpacity
                      key={months}
                      style={[
                        styles.typeCard,
                        { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                        monthsToPay === months && styles.typeCardActive,
                      ]}
                      onPress={() => setMonthsToPay(months)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.typeCardText,
                          monthsToPay === months && styles.typeCardTextActive,
                        ]}
                      >
                        {months} Months
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {fieldErrors.months && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4 }}>{fieldErrors.months}</Text>}
              </View>

              {/* Phone Number */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textDark }]}>Phone Number *</Text>
                <TextInput
                  style={[styles.textInputFull, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textDark }]}
                  placeholder="+63 0000000000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={handlePhone}
                  maxLength={14}
                />
                {fieldErrors.phone && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4 }}>{fieldErrors.phone}</Text>}
              </View>

              {/* Purpose */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textDark }]}>Purpose *</Text>
                
                <View style={[styles.typeGrid, { marginBottom: purposeCategory === "Other" ? 12 : 0 }]}>
                  {["Education", "Medical", "Home Repair", "Business", "Bills", "Other"].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.typeCard,
                        { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, minWidth: "30%" },
                        purposeCategory === cat && styles.typeCardActive,
                      ]}
                      onPress={() => setPurposeCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.typeCardText,
                          { textAlign: "center" },
                          purposeCategory === cat && styles.typeCardTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {purposeCategory === "Other" && (
                  <TextInput
                    style={[styles.textInputFull, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textDark }]}
                    placeholder="Briefly describe the purpose of this loan"
                    placeholderTextColor={colors.textMuted}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={purpose}
                    onChangeText={setPurpose}
                  />
                )}
                {fieldErrors.purpose && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4 }}>{fieldErrors.purpose}</Text>}
              </View>

              {/* ****** Capture Documents ****** */}
              <View style={styles.formGroup}>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Capture Documents</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Use your device camera to capture live photos for identity verification. Gallery uploads are not allowed.</Text>
                
                <View style={styles.docRow}>
                  {/* Selfie with ID & Current Date */}
                  <View style={styles.docCol}>
                    <Text style={[styles.docLabel, { color: colors.textDark }]}>Selfie with ID & Current Date</Text>
                    <TouchableOpacity
                      style={[styles.captureBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, selfie && styles.captureBoxDone]}
                      activeOpacity={0.7}
                      onPress={() => openVerificationCamera("selfie")}
                    >
                      {selfie ? (
                        <Image source={{ uri: selfie.uri }} style={styles.docPreviewImg} resizeMode="cover" />
                      ) : (
                        <>
                          <Image source={ICONS.camera} style={[styles.captureIcon, { tintColor: C.blue }]} resizeMode="contain" />
                          <Text style={[styles.captureText, { color: colors.textDark }]}>Click to capture</Text>
                          <Text style={[styles.captureHint, { color: colors.textMuted }]}>Live camera only</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Valid Government ID — AI-Verified */}
                  <View style={styles.docCol}>
                    <Text style={[styles.docLabel, { color: colors.textDark }]}>Valid Government ID</Text>

                    {/* EMPTY state */}
                    {!idVerifying && !idVerified && !idRejected && !validId && (
                      <TouchableOpacity
                        style={[styles.captureBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                        activeOpacity={0.7}
                        onPress={() => openVerificationCamera("id")}
                      >
                        <Image source={ICONS.idCard} style={[styles.captureIcon, { tintColor: C.blue }]} resizeMode="contain" />
                        <Text style={[styles.captureText, { color: colors.textDark }]}>Capture Government ID</Text>
                        <Text style={[styles.captureHint, { color: colors.textMuted }]}>AI-verified · Live only</Text>
                      </TouchableOpacity>
                    )}

                    {/* VERIFYING state */}
                    {idVerifying && (
                      <View style={[styles.captureBox, { backgroundColor: "rgba(13,31,69,0.04)", borderColor: C.blue, borderStyle: "solid" }]}>
                        <ActivityIndicator color={C.blue} size="large" style={{ marginBottom: 10 }} />
                        <Text style={{ fontSize: fs(13), fontWeight: "700", color: C.blue, textAlign: "center" }}>🔍 Verifying your ID...</Text>
                        <Text style={{ fontSize: fs(11), color: colors.textMuted, textAlign: "center", marginTop: 4 }}>Gemini AI is checking your document</Text>
                      </View>
                    )}

                    {/* VERIFIED ✅ state */}
                    {idVerified && validId && !idVerifying && (
                      <TouchableOpacity
                        style={[styles.captureBox, styles.captureBoxDone, { borderColor: C.green, borderWidth: 2 }]}
                        activeOpacity={0.7}
                        onPress={() => openVerificationCamera("id")}
                      >
                        <Image source={{ uri: validId.uri }} style={[styles.docPreviewImg, { borderRadius: 10 }]} resizeMode="cover" />
                        <View style={{
                          position: "absolute", bottom: 8, left: 8, right: 8,
                          backgroundColor: "rgba(52,199,89,0.92)", borderRadius: s(8),
                          paddingHorizontal: 8, paddingVertical: 5,
                          flexDirection: "row", alignItems: "center", gap: 5,
                        }}>
                          <Text style={{ fontSize: fs(13), fontWeight: "800", color: "#fff" }}>✅</Text>
                          <Text style={{ fontSize: fs(11), fontWeight: "700", color: "#fff", flex: 1 }} numberOfLines={1}>
                            {idVerifyResult?.idType || "ID Verified"}
                          </Text>
                        </View>
                        <View style={{
                          position: "absolute", top: 8, right: 8,
                          backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6,
                          paddingHorizontal: 7, paddingVertical: 3,
                        }}>
                          <Text style={{ fontSize: fs(10), color: "#fff", fontWeight: "600" }}>Tap to retake</Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* REJECTED ❌ state */}
                    {idRejected && !idVerifying && (
                      <TouchableOpacity
                        style={[styles.captureBox, { backgroundColor: "rgba(231,76,60,0.04)", borderColor: C.red, borderWidth: 2, borderStyle: "solid" }]}
                        activeOpacity={0.7}
                        onPress={() => openVerificationCamera("id")}
                      >
                        <Text style={{ fontSize: fs(28), marginBottom: 6 }}>❌</Text>
                        <Text style={{ fontSize: fs(13), fontWeight: "800", color: C.red, textAlign: "center" }}>Not a Valid ID</Text>
                        <Text style={{ fontSize: fs(11), color: colors.textMuted, textAlign: "center", marginTop: 4, paddingHorizontal: 8 }} numberOfLines={3}>
                          {idVerifyResult?.reason || "No government ID detected in the photo."}
                        </Text>
                        <View style={{ marginTop: 10, backgroundColor: C.red, borderRadius: s(8), paddingHorizontal: s(16), paddingVertical: 7 }}>
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>📷 Retake Photo</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* ****** Upload Additional Documents ****** */}
              <View style={styles.formGroup}>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Upload Additional Documents</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Please upload your COE, ITR, and Payslip in image or PDF format.</Text>
                
                <View style={styles.docRow}>
                  {/* Certificate of Employment (COE) */}
                  <View style={styles.docCol}>
                    <Text style={[styles.docLabel, { color: colors.textDark }]}>Certificate of Employment (COE)</Text>
                    <TouchableOpacity
                      style={[styles.captureBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, coeDoc && styles.captureBoxDone]}
                      activeOpacity={0.7}
                      onPress={() => pickImage(setCoeDoc, false)}
                    >
                      {coeDoc ? (
                        <Image source={{ uri: coeDoc.uri }} style={styles.docPreviewImg} resizeMode="cover" />
                      ) : (
                        <>
                          <Text style={[styles.uploadArrow, { color: C.blue }]}>→</Text>
                          <Text style={[styles.captureText, { color: colors.textDark }]}>Click to upload</Text>
                          <Text style={[styles.captureHint, { color: colors.textMuted }]}>Image or PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Income Tax Return (ITR) */}
                  <View style={styles.docCol}>
                    <Text style={[styles.docLabel, { color: colors.textDark }]}>Income Tax Return (ITR)</Text>
                    <TouchableOpacity
                      style={[styles.captureBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, itrDoc && styles.captureBoxDone]}
                      activeOpacity={0.7}
                      onPress={() => pickImage(setItrDoc, false)}
                    >
                      {itrDoc ? (
                        <Image source={{ uri: itrDoc.uri }} style={styles.docPreviewImg} resizeMode="cover" />
                      ) : (
                        <>
                          <Text style={[styles.uploadArrow, { color: C.blue }]}>→</Text>
                          <Text style={[styles.captureText, { color: colors.textDark }]}>Click to upload</Text>
                          <Text style={[styles.captureHint, { color: colors.textMuted }]}>Image or PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Payslip */}
                  <View style={styles.docCol}>
                    <Text style={[styles.docLabel, { color: colors.textDark }]}>Payslip</Text>
                    <TouchableOpacity
                      style={[styles.captureBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }, payslipDoc && styles.captureBoxDone]}
                      activeOpacity={0.7}
                      onPress={() => pickImage(setPayslipDoc, false)}
                    >
                      {payslipDoc ? (
                        <Image source={{ uri: payslipDoc.uri }} style={styles.docPreviewImg} resizeMode="cover" />
                      ) : (
                        <>
                          <Text style={[styles.uploadArrow, { color: C.blue }]}>→</Text>
                          <Text style={[styles.captureText, { color: colors.textDark }]}>Click to upload</Text>
                          <Text style={[styles.captureHint, { color: colors.textMuted }]}>Image or PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* ****** Existing Loan Question ****** */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textDark }]}>Do you have an existing/active loan with another entity?</Text>
                <View style={{ flexDirection: "row", gap: s(12), marginTop: 8 }}>
                  {["Yes", "No"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.radioOption,
                        { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                        hasExistingLoan === option && styles.radioOptionActive,
                      ]}
                      onPress={() => setHasExistingLoan(option)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.radioCircle,
                        { borderColor: hasExistingLoan === option ? C.blue : colors.textMuted },
                      ]}>
                        {hasExistingLoan === option && (
                          <View style={[styles.radioCircleFilled, { backgroundColor: C.blue }]} />
                        )}
                      </View>
                      <Text style={[
                        styles.radioText,
                        { color: hasExistingLoan === option ? C.blue : colors.textDark },
                      ]}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Conditional upload if Yes is selected */}
                {hasExistingLoan === "Yes" && (
                  <View style={{ marginTop: 14, padding: s(14), backgroundColor: colors.inputBg, borderRadius: s(12), borderWidth: 1.5, borderColor: C.blue + '44' }}>
                    <Text style={[styles.docLabel, { color: colors.textDark, marginBottom: 6 }]}>
                      📎 Upload Active Loan Screenshot
                    </Text>
                    <Text style={[styles.formHint, { color: colors.textMuted, marginBottom: 10 }]}>
                      Please provide a screenshot of your current active loan (statement or balance).
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.captureBox,
                        { backgroundColor: colors.cardBg, borderColor: activeLoanDoc ? C.green : colors.inputBorder },
                        activeLoanDoc && styles.captureBoxDone,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => showImageOptions(setActiveLoanDoc, "Active Loan Screenshot")}
                    >
                      {activeLoanDoc ? (
                        <Image source={{ uri: activeLoanDoc.uri }} style={styles.docPreviewImg} resizeMode="cover" />
                      ) : (
                        <>
                          <Image source={ICONS.document} style={[styles.captureIcon, { tintColor: C.blue }]} resizeMode="contain" />
                          <Text style={[styles.captureText, { color: colors.textDark }]}>Tap to upload</Text>
                          <Text style={[styles.captureHint, { color: colors.textMuted }]}>Image or Screenshot</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {activeLoanDoc && (
                      <TouchableOpacity
                        onPress={() => setActiveLoanDoc(null)}
                        style={{ alignSelf: 'flex-end', marginTop: 6 }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: C.red, fontSize: fs(12), fontWeight: '600' }}>✕ Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Disbursement Method */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textDark }]}>Disbursement Method *</Text>
                <Text style={[styles.formHint, { color: colors.textMuted }]}>How would you like to receive your loan once approved?</Text>
                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.typeCard,
                      { 
                        backgroundColor: colors.inputBg, 
                        borderColor: colors.inputBorder, 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'flex-start',
                        paddingHorizontal: s(12),
                        marginBottom: s(8),
                      },
                      disbursementMethod === "Cash (Pick up at office)" && styles.typeCardActive,
                    ]}
                    onPress={() => setDisbursementMethod("Cash (Pick up at office)")}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 16, height: 16, borderRadius: s(8), borderWidth: 1.5, 
                      borderColor: disbursementMethod === "Cash (Pick up at office)" ? C.blue : colors.textMuted,
                      marginRight: 8, alignItems: 'center', justifyContent: 'center'
                    }}>
                      {disbursementMethod === "Cash (Pick up at office)" && (
                        <View style={{ width: 8, height: 8, borderRadius: s(4), backgroundColor: C.blue }} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.typeCardText,
                        { textAlign: 'left', fontSize: 13 },
                        disbursementMethod === "Cash (Pick up at office)" && styles.typeCardTextActive,
                      ]}
                    >
                      Cash (Pick up at office)
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', width: '100%' }}>
                    {["GCash", "Bank Transfer"].map((method, index) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.typeCard,
                          { 
                            backgroundColor: colors.inputBg, 
                            borderColor: colors.inputBorder, 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'flex-start',
                            paddingHorizontal: 10,
                            flex: 1,
                            marginLeft: index === 1 ? 8 : 0,
                          },
                          disbursementMethod === method && styles.typeCardActive,
                        ]}
                        onPress={() => setDisbursementMethod(method)}
                        activeOpacity={0.7}
                      >
                        <View style={{
                          width: 16, height: 16, borderRadius: s(8), borderWidth: 1.5, 
                          borderColor: disbursementMethod === method ? C.blue : colors.textMuted,
                          marginRight: 6, alignItems: 'center', justifyContent: 'center'
                        }}>
                          {disbursementMethod === method && (
                            <View style={{ width: 8, height: 8, borderRadius: s(4), backgroundColor: C.blue }} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.typeCardText,
                            { textAlign: 'left', fontSize: fs(12), flexShrink: 1 },
                            disbursementMethod === method && styles.typeCardTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {(disbursementMethod === "GCash" || disbursementMethod === "Bank Transfer") && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.formLabel, { color: colors.textDark, fontSize: fs(13), marginBottom: 4 }]}>
                      {disbursementMethod} Account Number *
                    </Text>
                    <TextInput
                      style={[styles.textInputFull, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textDark }]}
                      placeholder={disbursementMethod === "GCash" ? "e.g. 09123456789" : "e.g. 1234 5678 9012"}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                    />
                  </View>
                )}
                {fieldErrors.disbursement && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4 }}>{fieldErrors.disbursement}</Text>}
                {fieldErrors.accountNumber && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4 }}>{fieldErrors.accountNumber}</Text>}
              </View>

              {/* Loan Terms & Conditions */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textDark }]}>Loan Terms & Conditions *</Text>
                
                <View style={{ 
                  backgroundColor: colors.inputBg || '#F0F2F5', 
                  borderColor: colors.inputBorder || '#E8ECF0', 
                  borderWidth: 1, 
                  borderRadius: s(12), 
                  height: 180, 
                  marginTop: 8,
                  overflow: 'hidden'
                }}>
                  <ScrollView nestedScrollEnabled={true} style={{ padding: 12 }}>
                    <Text style={{ fontWeight: '700', fontSize: fs(14), color: colors.textDark, marginBottom: 4 }}>10. Repayment Terms</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 2 }}>• Payments are monthly based on the selected term.</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 2 }}>• Due dates are fixed upon approval.</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 12 }}>• Accepted payment methods: Cash, Bank transfer, GCash.</Text>

                    <Text style={{ fontWeight: '700', fontSize: fs(14), color: colors.textDark, marginBottom: 4 }}>11. Early Payment Policy</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 2 }}>• Members may repay early at any time.</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 2 }}>• Interest is charged only up to the payment date.</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 12 }}>• No penalties for early settlement.</Text>

                    <Text style={{ fontWeight: '700', fontSize: fs(14), color: colors.textDark, marginBottom: 4 }}>12. Late Payment and Penalties</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 2 }}>• Late payments may incur an ongoing penalty fee.</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 2 }}>• Accounts past due beyond 60 days will be escalated.</Text>
                    <Text style={{ fontSize: fs(13), color: colors.textMuted, marginBottom: 12 }}>• Reach out to administration to apply for extension.</Text>
                    <View style={{ height: 12 }} />
                  </ScrollView>
                </View>

                {/* Checkbox */}
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }} 
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: s(22), height: s(22), borderRadius: s(4), borderWidth: 2, 
                    borderColor: agreedToTerms ? C.blue : colors.textMuted,
                    alignItems: 'center', justifyContent: 'center', marginRight: 10,
                    backgroundColor: agreedToTerms ? C.blue : 'transparent'
                  }}>
                    {agreedToTerms && <Text style={{ color: '#FFF', fontSize: fs(14), fontWeight: 'bold' }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: fs(14), color: colors.textDark, flex: 1, fontWeight: '500' }}>
                    I have read and agree to the Loan Terms & Conditions and policies above.
                  </Text>
                </TouchableOpacity>
                {fieldErrors.terms && <Text style={{ color: "#E74C3C", fontSize: fs(12), fontWeight: "600", marginTop: 4 }}>{fieldErrors.terms}</Text>}
              </View>

              {/* Predictive Approval Score */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Predictive Approval</Text>
                <View style={[
                  styles.scoreBox, 
                  approvalProbability >= 80 ? styles.scoreHigh 
                    : approvalProbability >= 50 ? styles.scoreMed 
                    : styles.scoreLow
                ]}>
                  <Text style={[
                    styles.scoreText, 
                    approvalProbability >= 80 ? { color: C.green } 
                      : approvalProbability >= 50 ? { color: C.orange } 
                      : { color: C.red }
                  ]}>
                    {approvalProbability}% Approval Odds
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View style={[
                      styles.progressBarFill, 
                      { width: `${approvalProbability}%` },
                      approvalProbability >= 80 ? { backgroundColor: C.green } 
                        : approvalProbability >= 50 ? { backgroundColor: C.orange } 
                        : { backgroundColor: C.red }
                    ]} />
                  </View>
                </View>
              </View>

              <View style={styles.breakdownBox}>
                <Text style={styles.breakdownTitle}>Financial Breakdown</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Principal:</Text>
                  <Text style={styles.breakdownValue}>₱{(parseFloat(loanAmount) || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Interest ({loanType === "Emergency" ? "1.5%/mo" : loanType === "Personal" ? "2%/mo" : "1%/mo"}):</Text>
                  <Text style={[styles.breakdownValue, { color: C.red }]}>+ ₱{interestAmount.toLocaleString()}</Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                  <Text style={styles.breakdownLabelTotal}>Total Repayment:</Text>
                  <Text style={styles.breakdownValueTotal}>₱{totalRepayment.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Monthly Installment:</Text>
                  <Text style={[styles.breakdownValue, { color: C.blue, fontWeight: "800" }]}>
                    ₱{monthlyInstallment.toLocaleString(undefined, { maximumFractionDigits: 2 })} / mo
                  </Text>
                </View>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Your loan application will be reviewed by our team. You'll
                  receive a notification once it's approved.
                </Text>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Fixed Footer - Error + Submit Button */}
            <View style={{ paddingHorizontal: s(20), paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 16, borderTopWidth: 1, borderTopColor: colors.cardBorder || '#E8ECF0' }}>
              {formError ? (
                <View style={[styles.errorBox, { marginBottom: 12 }]}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                activeOpacity={0.8}
                onPress={handleSubmitLoan}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>



      {/* Success Modal */}
      <Modal
        visible={successModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.successModalContent]}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successSub}>
              Your loan application has been received and is currently under review by the administration.
            </Text>
            
            <TouchableOpacity 
              style={styles.successBtn}
              activeOpacity={0.8}
              onPress={() => setSuccessModalOpen(false)}
            >
              <Text style={styles.successBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={detailsModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDetailsModalOpen(false)}
          />

          <View style={styles.modalContent}>
            {selectedLoan && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Loan Details</Text>
                  <TouchableOpacity
                    onPress={() => setDetailsModalOpen(false)}
                    style={styles.closeBtn}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailsHeader}>
                    <View style={styles.loanIconBg}>
                      <Image source={ICONS.document} style={styles.loanIcon} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.detailsId}>{selectedLoan.id}</Text>
                      <Text style={styles.detailsType}>{selectedLoan.type} Loan</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: selectedLoan.statusBg, marginBottom: 0 },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: selectedLoan.statusColor }]}>
                        {selectedLoan.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsCard}>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Principal Amount</Text>
                      <Text style={styles.detailsValue}>{selectedLoan.amount}</Text>
                    </View>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Months to Pay</Text>
                      <Text style={styles.detailsValue}>{selectedLoan.monthsToPay} Months</Text>
                    </View>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Monthly Installment</Text>
                      <Text style={styles.detailsValue}>{selectedLoan.monthlyPayment}</Text>
                    </View>
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Total Repayment</Text>
                      <Text style={styles.detailsValue}>{selectedLoan.remainingBalance}</Text>
                    </View>
                    <View style={[styles.detailsRow, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
                      <Text style={styles.detailsLabel}>Date Applied</Text>
                      <Text style={styles.detailsValue}>{selectedLoan.applied}</Text>
                    </View>
                  </View>

                  <View style={styles.purposeBox}>
                    <Text style={styles.purposeTitle}>Purpose</Text>
                    <Text style={styles.purposeText}>{selectedLoan.purpose}</Text>
                  </View>

                  {selectedLoan.status === "awaiting_member_approval" ? (
                    <View style={{ marginBottom: s(16), backgroundColor: C.cardBg, borderColor: C.blue, borderWidth: 1, padding: s(16), borderRadius: 12 }}>
                      <Text style={{ fontSize: fs(14), fontWeight: "700", color: C.textDark, marginBottom: s(12), textAlign: "center" }}>
                        Admin response is ready. Please review and accept the approved terms to finalize your loan.
                      </Text>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <TouchableOpacity
                          style={[styles.submitBtn, { flex: 1, backgroundColor: "rgba(231,76,60,0.1)", elevation: 0 }]}
                          activeOpacity={0.8}
                          onPress={async () => {
                            try {
                              await updateLoanStatus(selectedLoan.id, "Rejected");
                              showAlert("Success", "Loan offer declined.");
                              setDetailsModalOpen(false);
                            } catch (e) {
                              showAlert("Error", "Could not process your decision.");
                            }
                          }}
                        >
                          <Text style={[styles.submitBtnText, { color: C.red }]}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.submitBtn, { flex: 1, backgroundColor: C.green }]}
                          activeOpacity={0.8}
                          onPress={async () => {
                            try {
                              await updateLoanStatus(selectedLoan.id, "Active");
                              showAlert("Success", "Loan terms accepted. Your loan is now active.");
                              setDetailsModalOpen(false);
                            } catch (e) {
                              showAlert("Error", "Could not process your decision.");
                            }
                          }}
                        >
                          <Text style={styles.submitBtnText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: C.textDark }]}
                    activeOpacity={0.8}
                    onPress={() => setDetailsModalOpen(false)}
                  >
                    <Text style={styles.submitBtnText}>Close Details</Text>
                  </TouchableOpacity>
                  
                  <View style={{ height: 30 }} />
                </ScrollView>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* - Pay Now Modal - */}
      <Modal
        visible={payNowModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPayNowModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: C.overlay }}
            activeOpacity={1}
            onPress={() => setPayNowModalOpen(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textDark }]}>Pay now</Text>
                {payNowLoan && (
                  <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>
                    {payNowLoan.id} · Payment due {payNowLoan.nextPayment || "-"}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setPayNowModalOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: s(20), paddingTop: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {payNowLoan && (
                <>
                  {/* SELECT PAYMENT TYPE */}
                  <Text style={{ fontSize: fs(10), fontWeight: "800", color: colors.textMuted, letterSpacing: 0.8, marginBottom: s(8), textTransform: "uppercase" }}>Select Payment Type</Text>

                  {/* Regular Payment */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", padding: 12, borderRadius: s(10), borderWidth: 1.5, borderColor: payType === "regular" ? C.blue : (colors.cardBorder || "#E8ECF0"), backgroundColor: payType === "regular" ? "rgba(46,107,240,0.04)" : colors.cardBg, marginBottom: 8 }}
                    activeOpacity={0.7}
                    onPress={() => setPayType("regular")}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(13), fontWeight: "700", color: colors.textDark }}>Regular Payment</Text>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted }}>Pay the current monthly installment</Text>
                    </View>
                    <View style={{ width: s(20), height: s(20), borderRadius: s(10), borderWidth: 2, borderColor: payType === "regular" ? C.blue : (colors.textMuted || "#AAB4C8"), alignItems: "center", justifyContent: "center" }}>
                      {payType === "regular" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue }} />}
                    </View>
                  </TouchableOpacity>

                  {/* Custom Payment */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", padding: 12, borderRadius: s(10), borderWidth: 1.5, borderColor: payType === "custom" ? C.blue : (colors.cardBorder || "#E8ECF0"), backgroundColor: payType === "custom" ? "rgba(46,107,240,0.04)" : colors.cardBg, marginBottom: 8 }}
                    activeOpacity={0.7}
                    onPress={() => setPayType("custom")}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(13), fontWeight: "700", color: colors.textDark }}>Custom Payment</Text>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted }}>Enter any amount - months covered are computed automatically</Text>
                    </View>
                    <View style={{ width: s(20), height: s(20), borderRadius: s(10), borderWidth: 2, borderColor: payType === "custom" ? C.blue : (colors.textMuted || "#AAB4C8"), alignItems: "center", justifyContent: "center" }}>
                      {payType === "custom" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue }} />}
                    </View>
                  </TouchableOpacity>

                  {/* Full Payment */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", padding: 12, borderRadius: s(10), borderWidth: 1.5, borderColor: payType === "full" ? C.blue : (colors.cardBorder || "#E8ECF0"), backgroundColor: payType === "full" ? "rgba(46,107,240,0.04)" : colors.cardBg, marginBottom: 16 }}
                    activeOpacity={0.7}
                    onPress={() => setPayType("full")}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(13), fontWeight: "700", color: colors.textDark }}>Full Payment</Text>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted }}>Settle the entire remaining balance at once</Text>
                    </View>
                    <View style={{ width: s(20), height: s(20), borderRadius: s(10), borderWidth: 2, borderColor: payType === "full" ? C.blue : (colors.textMuted || "#AAB4C8"), alignItems: "center", justifyContent: "center" }}>
                      {payType === "full" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue }} />}
                    </View>
                  </TouchableOpacity>

                  {/* Custom Payment Details */}
                  {payType === "custom" && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: fs(10), fontWeight: "800", color: colors.textMuted, letterSpacing: 0.8, marginBottom: s(8), textTransform: "uppercase" }}>How many months do you want to pay?</Text>
                      <TouchableOpacity
                        style={{ backgroundColor: colors.inputBg, borderColor: customPayMonths > 0 ? C.blue : (colors.inputBorder || "#E8ECF0"), borderWidth: 1, borderRadius: s(8), paddingHorizontal: s(12), paddingVertical: s(12), flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}
                        activeOpacity={0.7}
                        onPress={() => setShowMonthPicker(!showMonthPicker)}
                      >
                        <Text style={{ color: customPayMonths > 0 ? colors.textDark : colors.textMuted, fontSize: fs(14), fontWeight: customPayMonths > 0 ? "700" : "600" }}>
                          {customPayMonths > 0 ? `${customPayMonths} month${customPayMonths > 1 ? "s" : ""} — ₱${(customPayMonths * (payNowLoan?.monthlyPayment || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "- Select months -"}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 14 }}>{showMonthPicker ? "▲" : "▼"}</Text>
                      </TouchableOpacity>

                      {/* Month picker grid */}
                      {showMonthPicker && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: s(6), marginTop: 6, marginBottom: 8 }}>
                          {(() => {
                            const remaining = (payNowLoan?.termMonths || 12) - (payNowLoan?.paidMonths || 0);
                            const maxMonths = Math.max(1, remaining);
                            return Array.from({ length: maxMonths }, (_, i) => i + 1).map(m => (
                              <TouchableOpacity
                                key={m}
                                onPress={() => {
                                  setCustomPayMonths(m);
                                  const amt = m * (payNowLoan?.monthlyPayment || 0);
                                  setCustomPayAmount(Math.round(amt).toLocaleString());
                                  setShowMonthPicker(false);
                                }}
                                style={{
                                  paddingHorizontal: s(14), paddingVertical: s(8), borderRadius: s(8),
                                  borderWidth: 1.5,
                                  borderColor: customPayMonths === m ? C.blue : (colors.cardBorder || "#E8ECF0"),
                                  backgroundColor: customPayMonths === m ? "rgba(46,107,240,0.08)" : colors.cardBg,
                                  minWidth: 52, alignItems: "center",
                                }}
                              >
                                <Text style={{ fontSize: fs(13), fontWeight: "700", color: customPayMonths === m ? C.blue : colors.textDark }}>{m}mo</Text>
                                <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 1 }}>₱{Math.round(m * (payNowLoan?.monthlyPayment || 0)).toLocaleString()}</Text>
                              </TouchableOpacity>
                            ));
                          })()}
                        </View>
                      )}

                      <Text style={{ fontSize: fs(10), fontWeight: "800", color: colors.textMuted, letterSpacing: 0.8, marginBottom: s(8), marginTop: s(12), textTransform: "uppercase" }}>Or enter a custom amount (Min ₱500)</Text>
                      <View style={{ backgroundColor: colors.inputBg, borderColor: colors.inputBorder || "#E8ECF0", borderWidth: 1, borderRadius: s(8), paddingHorizontal: s(12), paddingVertical: s(10), flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Text style={{ color: colors.textDark, fontSize: fs(16), fontWeight: "700", marginRight: 8 }}>₱</Text>
                        <TextInput
                          style={{ flex: 1, color: colors.textDark, fontSize: fs(16), fontWeight: "600" }}
                          placeholder="e.g. 5,000"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          value={customPayAmount}
                          onChangeText={(text) => {
                            const numericText = text.replace(/[^0-9]/g, "");
                            const formatted = numericText.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                            setCustomPayAmount(formatted);
                            setCustomPayMonths(0); // clear month selection when typing manually
                          }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Amount Due Card */}
                  <View style={{ backgroundColor: colors.inputBg || "#F5F7FA", borderRadius: s(12), padding: s(14), marginBottom: 20 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Text style={{ fontSize: fs(12), color: colors.textMuted, fontWeight: "600" }}>Payment amount</Text>
                      {payType === "regular" && (
                        <View style={{ backgroundColor: "rgba(255,149,0,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ fontSize: fs(13), fontWeight: "700", color: C.orange }}>Due soon</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: fs(26), fontWeight: "800", color: colors.textDark, marginBottom: 2 }}>
                      ₱{payType === "regular" ? (payNowLoan.monthlyPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : payType === "full" ? (payNowLoan.remainingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : customPayAmount ? customPayAmount : "0.00"}
                    </Text>
                    <Text style={{ fontSize: fs(11), color: colors.textMuted }}>{payType === "full" ? "Full Remaining Balance" : payType === "custom" ? "Custom Amount" : `Due ${payNowLoan.nextPayment || "-"}`}</Text>
                  </View>

                  {/* SELECT PAYMENT METHOD */}
                  <Text style={{ fontSize: fs(10), fontWeight: "800", color: colors.textMuted, letterSpacing: 0.8, marginBottom: s(8), textTransform: "uppercase" }}>Select Payment Method</Text>

                  {/* Cash Option */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", padding: 12, borderRadius: s(10), borderWidth: 1.5, borderColor: payMethod === "cash" ? C.blue : (colors.cardBorder || "#E8ECF0"), backgroundColor: payMethod === "cash" ? "rgba(46,107,240,0.04)" : colors.cardBg, marginBottom: 8 }}
                    activeOpacity={0.7}
                    onPress={() => { setPayMethod("cash"); setPayProof(null); }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: s(10), backgroundColor: payMethod === "cash" ? "rgba(46,107,240,0.1)" : (colors.inputBg || "#F0F2F5"), alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Image source={ICONS.wallet} style={{ width: s(20), height: s(20), tintColor: payMethod === "cash" ? C.blue : colors.textMuted }} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(13), fontWeight: "700", color: colors.textDark }}>Cash</Text>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted }}>Pay in person at the office or cashier</Text>
                    </View>
                    <View style={{ width: s(20), height: s(20), borderRadius: s(10), borderWidth: 2, borderColor: payMethod === "cash" ? C.blue : (colors.textMuted || "#AAB4C8"), alignItems: "center", justifyContent: "center" }}>
                      {payMethod === "cash" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue }} />}
                    </View>
                  </TouchableOpacity>

                  {/* Bank Transfer Option */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", padding: 12, borderRadius: s(10), borderWidth: 1.5, borderColor: payMethod === "bank" ? C.blue : (colors.cardBorder || "#E8ECF0"), backgroundColor: payMethod === "bank" ? "rgba(46,107,240,0.04)" : colors.cardBg, marginBottom: 8 }}
                    activeOpacity={0.7}
                    onPress={() => { setPayMethod("bank"); setPayProof(null); }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: s(10), backgroundColor: payMethod === "bank" ? "rgba(46,107,240,0.1)" : (colors.inputBg || "#F0F2F5"), alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Image source={ICONS.bank} style={{ width: s(20), height: s(20), tintColor: payMethod === "bank" ? C.blue : colors.textMuted }} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(13), fontWeight: "700", color: colors.textDark }}>Bank transfer</Text>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted }}>Transfer via online banking or over-the-counter</Text>
                    </View>
                    <View style={{ width: s(20), height: s(20), borderRadius: s(10), borderWidth: 2, borderColor: payMethod === "bank" ? C.blue : (colors.textMuted || "#AAB4C8"), alignItems: "center", justifyContent: "center" }}>
                      {payMethod === "bank" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue }} />}
                    </View>
                  </TouchableOpacity>

                  {/* GCash Option */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", padding: 12, borderRadius: s(10), borderWidth: 1.5, borderColor: payMethod === "gcash" ? C.blue : (colors.cardBorder || "#E8ECF0"), backgroundColor: payMethod === "gcash" ? "rgba(46,107,240,0.04)" : colors.cardBg, marginBottom: 14 }}
                    activeOpacity={0.7}
                    onPress={() => { setPayMethod("gcash"); setPayProof(null); }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: s(10), backgroundColor: payMethod === "gcash" ? "rgba(0,126,51,0.08)" : (colors.inputBg || "#F0F2F5"), alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Image source={ICONS.gcash} style={{ width: s(22), height: 22 }} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fs(13), fontWeight: "700", color: colors.textDark }}>GCash</Text>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted }}>Send via GCash wallet instantly</Text>
                    </View>
                    <View style={{ width: s(20), height: s(20), borderRadius: s(10), borderWidth: 2, borderColor: payMethod === "gcash" ? C.blue : (colors.textMuted || "#AAB4C8"), alignItems: "center", justifyContent: "center" }}>
                      {payMethod === "gcash" && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue }} />}
                    </View>
                  </TouchableOpacity>

                  {/* Proof of Payment -  only for GCash and Bank in manual mode */}
                  {paymentApprovalMethod === "manual" && (payMethod === "gcash" || payMethod === "bank") && (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={{ fontSize: fs(12), fontWeight: "800", color: colors.textDark, marginBottom: 6 }}>
                        Proof of Payment *
                      </Text>
                      <Text style={{ fontSize: fs(11), color: colors.textMuted, marginBottom: 8 }}>
                        Upload a screenshot or photo of your {payMethod === "gcash" ? "GCash" : "bank transfer"} receipt
                      </Text>
                      <TouchableOpacity
                        style={[styles.uploadBox, { height: 130 }, payProof && styles.uploadBoxDone]}
                        activeOpacity={0.7}
                        onPress={() => showImageOptions(setPayProof, "Proof of Payment")}
                      >
                        {payProof ? (
                          <Image source={{ uri: payProof.uri }} style={styles.previewImg} />
                        ) : (
                          <>
                            <Image source={ICONS.camera} style={[styles.uploadIconImg, { marginBottom: 4 }]} resizeMode="contain" />
                            <Text style={{ fontSize: fs(12), color: colors.textMuted }}>Tap to upload proof</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* How to pay instructions */}
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder || "#E8ECF0", paddingTop: 14, marginBottom: 10 }}>
                    <Text style={{ fontSize: fs(13), fontWeight: "800", color: colors.textDark, marginBottom: 10 }}>
                      How to pay via {payMethod === "cash" ? "Cash" : payMethod === "bank" ? "Bank Transfer" : "GCash"}
                    </Text>

                    {payMethod === "cash" && (
                      <>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: s(8), gap: 10 }}>
                          <View style={{ width: s(22), height: s(22), borderRadius: 11, backgroundColor: colors.inputBg || "#F0F2F5", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>1</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: fs(12), color: colors.textMuted, lineHeight: 17 }}>Visit the office or authorized cashier during business hours.</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                          <View style={{ width: s(22), height: s(22), borderRadius: 11, backgroundColor: colors.inputBg || "#F0F2F5", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>2</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: fs(12), color: colors.textMuted, lineHeight: 17 }}>Present your Loan ID: {payNowLoan.id} to the cashier.</Text>
                        </View>
                      </>
                    )}

                    {payMethod === "bank" && (
                      <>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: s(8), gap: 10 }}>
                          <View style={{ width: s(22), height: s(22), borderRadius: 11, backgroundColor: colors.inputBg || "#F0F2F5", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>1</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: fs(12), color: colors.textMuted, lineHeight: 17 }}>Transfer ₱{(payNowLoan.monthlyPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} to the church bank account.</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: s(8), gap: 10 }}>
                          <View style={{ width: s(22), height: s(22), borderRadius: 11, backgroundColor: colors.inputBg || "#F0F2F5", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>2</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: fs(12), color: colors.textMuted, lineHeight: 17 }}>Use Loan ID ({payNowLoan.id}) as the reference number.</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                          <View style={{ width: s(22), height: s(22), borderRadius: 11, backgroundColor: colors.inputBg || "#F0F2F5", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>3</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: fs(12), color: colors.textMuted, lineHeight: 17 }}>Upload your receipt above - admin will verify.</Text>
                        </View>
                      </>
                    )}

                    {payMethod === "gcash" && (
                      <>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: s(8), gap: 10 }}>
                          <View style={{ width: s(22), height: s(22), borderRadius: 11, backgroundColor: colors.inputBg || "#F0F2F5", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>1</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: fs(12), color: colors.textMuted, lineHeight: 17 }}>Send ₱{(payNowLoan.monthlyPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} via GCash to 09608326569</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                          <View style={{ width: s(22), height: s(22), borderRadius: 11, backgroundColor: colors.inputBg || "#F0F2F5", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>2</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: fs(12), color: colors.textMuted, lineHeight: 17 }}>Upload your GCash receipt above for verification.</Text>
                        </View>
                      </>
                    )}
                  </View>

                  <View style={{ height: 6 }} />
                </>
              )}
            </ScrollView>

            {/* Fixed Footer - Cancel + Submit */}
            <View style={{ flexDirection: "row", gap: s(12), paddingHorizontal: s(20), paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 16, borderTopWidth: 1, borderTopColor: colors.cardBorder || '#E8ECF0' }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: s(14), borderRadius: s(12), alignItems: "center", borderWidth: 1.5, borderColor: colors.cardBorder || "#E0E5EC", backgroundColor: colors.cardBg }}
                activeOpacity={0.7}
                onPress={() => setPayNowModalOpen(false)}
              >
                <Text style={{ fontSize: fs(14), fontWeight: "700", color: colors.textDark }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ flex: 2, paddingVertical: s(14), borderRadius: s(12), alignItems: "center", backgroundColor: C.blue }, paySubmitting && { opacity: 0.6 }]}
                activeOpacity={0.8}
                onPress={handleSubmitPayment}
                disabled={paySubmitting}
              >
                {paySubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ fontSize: fs(14), fontWeight: "700", color: "#FFF" }}>{paymentApprovalMethod === "gateway" && payMethod !== "cash" ? "Proceed to Payment" : "Submit Payment"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* - View Schedule Modal - */}
      <Modal
        visible={scheduleModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setScheduleModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setScheduleModalOpen(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Payment Schedule</Text>
              <TouchableOpacity onPress={() => setScheduleModalOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {scheduleLoan && (
                <>
                  {/* Loan summary */}
                  <View style={{ backgroundColor: colors.inputBg || "#F5F7FA", borderRadius: s(12), padding: s(14), marginBottom: 18 }}>
                    <Text style={{ fontSize: fs(14), fontWeight: "700", color: colors.textDark }}>{scheduleLoan.id}</Text>
                    <Text style={{ fontSize: fs(12), color: colors.textMuted, marginTop: 2 }}>
                      {scheduleLoan.type} Loan  •  ₱{(scheduleLoan.amountNum || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}  •  {scheduleLoan.termMonths} months
                    </Text>
                  </View>

                  {/* Schedule Table Header */}
                  <View style={{ flexDirection: "row", paddingVertical: s(10), paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.cardBorder || "#E8ECF0" }}>
                    <Text style={{ flex: 0.8, fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>Month</Text>
                    <Text style={{ flex: 1.5, fontSize: fs(11), fontWeight: "800", color: colors.textMuted }}>Due Date</Text>
                    <Text style={{ flex: 1.2, fontSize: fs(11), fontWeight: "800", color: colors.textMuted, textAlign: "right" }}>Amount</Text>
                    <Text style={{ flex: 1, fontSize: fs(11), fontWeight: "800", color: colors.textMuted, textAlign: "right" }}>Status</Text>
                  </View>

                  {/* Schedule Rows */}
                  {Array.from({ length: scheduleLoan.termMonths || 0 }, (_, i) => {
                    const monthNum = i + 1;
                    const isPaid = monthNum <= (scheduleLoan.paidMonths || 0);
                    // Check if there's a pending payment for this month
                    const pendingPayment = loanPayments.find(p => p.monthNumber === monthNum && p.status === "pending");

                    // Calculate due date (disbursed date + monthNum months)
                    let dueDate = "-";
                    if (scheduleLoan.applied) {
                      const base = new Date(scheduleLoan.applied);
                      base.setMonth(base.getMonth() + monthNum);
                      dueDate = base.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    }

                    let statusLabel = "Upcoming";
                    let statusColor = colors.textMuted;
                    let statusBg = "transparent";
                    if (isPaid) {
                      statusLabel = "Paid";
                      statusColor = C.green;
                      statusBg = C.greenLight;
                    } else if (pendingPayment) {
                      statusLabel = "Pending";
                      statusColor = C.orange;
                      statusBg = C.orangeLight;
                    } else if (monthNum === (scheduleLoan.paidMonths || 0) + 1) {
                      statusLabel = "Due";
                      statusColor = "#0D1F45";
                      statusBg = "rgba(46,107,240,0.1)";
                    }

                    return (
                      <View key={monthNum} style={{ flexDirection: "row", alignItems: "center", paddingVertical: s(12), paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.cardBorder || "#F0F2F5" }}>
                        <Text style={{ flex: 0.8, fontSize: fs(13), fontWeight: "700", color: colors.textDark }}>{monthNum}</Text>
                        <Text style={{ flex: 1.5, fontSize: fs(12), color: colors.textMuted }}>{dueDate}</Text>
                        <Text style={{ flex: 1.2, fontSize: fs(13), fontWeight: "700", color: colors.textDark, textAlign: "right" }}>
                          ₱{(scheduleLoan.monthlyPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Text>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: fs(11), fontWeight: "700", color: statusColor }}>{statusLabel}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* Total row */}
                  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: s(14), paddingHorizontal: 4, marginTop: 4 }}>
                    <Text style={{ flex: 2.3, fontSize: fs(13), fontWeight: "800", color: colors.textDark }}>Total Repayment</Text>
                    <Text style={{ flex: 1.2, fontSize: fs(14), fontWeight: "800", color: C.blue, textAlign: "right" }}>
                      ₱{(scheduleLoan.totalRepayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={{ flex: 1 }} />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: C.textDark, marginTop: 8 }]}
                    activeOpacity={0.8}
                    onPress={() => setScheduleModalOpen(false)}
                  >
                    <Text style={styles.submitBtnText}>Close</Text>
                  </TouchableOpacity>

                  <View style={{ height: 30 }} />
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

            {/* Floating Bottom Tab Bar */}
      <FloatingNavBar
        activeTab="Loans"
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
          <Image source={LOGO} style={styles.sidebarLogo} resizeMode="contain" />
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
            onPress={async () => {
              closeSidebar();
              await AsyncStorage.removeItem("faithly_user");
              setTimeout(() => navigation.navigate("Start"), 300);
            }}
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
      <NoteModal
        visible={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        date={selectedCalendarDate}
        note={newNoteText}
        onNoteChange={setNewNoteText}
        onSave={handleSaveNote}
        colors={colors}
        saving={savingNote}
      />

      {/* Loan Receipt Modal */}
      <ReceiptModal
        visible={!!receiptData}
        onClose={() => setReceiptData(null)}
        type="loan"
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

  // Scroll Content
  scroll: { flex: 1, paddingHorizontal: s(18), paddingTop: 14 },

  // Header Section
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 8,
    paddingBottom: 12,
    gap: s(10),
  },
  pageTitle: {
    fontSize: fs(24),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(4),
  },
  pageSubtitle: {
    fontSize: fs(13),
    color: C.textMuted,
    lineHeight: fs(18),
  },

  // Apply button (UI only fix)
  applyBtn: {
    backgroundColor: C.blue,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    borderRadius: s(12),
    gap: 8,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 2,
  },
  applyBtnPlus: {
    fontSize: fs(18),
    color: "#FFF",
    fontWeight: "900",
    marginTop: -1,
  },
  applyBtnText: { fontSize: fs(12), color: "#FFF", fontWeight: "800" },

  // Savings Eligibility Banner
  savingsBanner: {
    backgroundColor: C.cardBg,
    borderRadius: s(16),
    padding: s(16),
    marginBottom: s(16),
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  savingsBannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  savingsBannerTitle: {
    fontSize: fs(15),
    fontWeight: "800",
    color: C.textDark,
  },
  savingsBannerText: {
    fontSize: fs(12),
    color: C.textMuted,
    marginTop: 4,
    lineHeight: fs(18),
  },
  savingsBannerProgressBg: {
    height: 6,
    backgroundColor: C.bg,
    borderRadius: 3,
    marginTop: 10,
    overflow: "hidden",
  },
  savingsBannerProgressFill: {
    height: "100%",
    backgroundColor: C.blue,
    borderRadius: 3,
  },
  savingsBannerLink: {
    fontSize: fs(12),
    fontWeight: "700",
    color: C.blue,
  },

  // œ... Summary Grid
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: s(12),
    marginBottom: s(10),
  },
  summaryCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(16),
    padding: s(16),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  summaryCardWide: { width: "100%" },
  summaryCardHalf: { width: "48%" },

  summaryLeft: { flex: 1, paddingRight: 10 },
  summaryLabel: { fontSize: 12.5, color: C.textMuted, marginBottom: 6 },
  summaryValue: { fontSize: fs(20), fontWeight: "700", color: C.textDark },
  summaryIconBg: {
    width: s(44),
    height: s(44),
    borderRadius: s(14),
    alignItems: "center",
    justifyContent: "center",
  },
  summaryIcon: { width: s(22), height: 22 },

  // Section
  section: { marginTop: 6, paddingBottom: 8 },
  sectionTitle: {
    fontSize: fs(20),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(12),
  },

  // Loan Card
  loanCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(16),
    padding: s(16),
    marginBottom: s(12),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  loanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: s(14),
    gap: s(10),
  },
  loanHeaderLeft: { flexDirection: "row", gap: s(12), flex: 1 },
  loanIconBg: {
    width: s(44),
    height: s(44),
    borderRadius: s(14),
    backgroundColor: C.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  loanIcon: { width: s(22), height: s(22), tintColor: C.blue },
  loanId: {
    fontSize: fs(14),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 3,
  },
  loanType: { fontSize: 12.5, color: C.textMuted, marginBottom: 2 },
  loanApplied: { fontSize: 11.5, color: C.textMuted },
  loanHeaderRight: { alignItems: "flex-end" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: s(8),
  },
  statusText: { fontSize: fs(12), fontWeight: "800" },
  loanAmount: { fontSize: fs(18), fontWeight: "700", color: C.textDark },

  // Payment Details
  paymentDetails: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingTop: 12,
    marginBottom: s(12),
    gap: s(10),
  },
  paymentItem: { flex: 1 },
  paymentLabel: {
    fontSize: fs(11),
    color: C.textMuted,
    marginBottom: s(4),
    fontWeight: "600",
  },
  paymentValue: {
    fontSize: fs(14),
    fontWeight: "700",
    color: C.textDark,
  },

  // View Details Button
  detailsBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.blue,
    borderRadius: s(12),
    paddingVertical: 11,
    alignItems: "center",
  },
  detailsBtnText: { fontSize: fs(14), fontWeight: "700", color: C.blue },

  bottomPad: { height: 110 },

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

  // Modal Styles
  modalContainer: { flex: 1, justifyContent: "flex-end" },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.overlay,
  },
  modalContent: {
    backgroundColor: C.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: s(20),
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  modalTitle: { fontSize: fs(20), fontWeight: "800", color: C.textDark },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: fs(18), color: C.textMuted, fontWeight: "600" },
  modalScroll: { paddingHorizontal: s(20), paddingTop: 18 },

  formGroup: { marginBottom: 18 },
  formLabel: {
    fontSize: fs(13),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(6),
  },
  formHint: {
    fontSize: fs(12),
    color: C.textMuted,
    marginBottom: s(8),
  },
  
  uploadBox: {
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    borderStyle: "dashed",
    borderRadius: s(14),
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    overflow: "hidden",
  },
  uploadBoxDone: {
    borderColor: C.green,
    borderStyle: "solid",
  },
  uploadIconImg: {
    width: s(36),
    height: s(36),
    tintColor: "#9CA3AF",
    marginBottom: s(8),
  },
  uploadText: { fontSize: fs(13), color: C.textMuted },
  previewImg: {
    width: "100%",
    height: "100%",
    borderRadius: s(12),
  },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: {
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    borderRadius: s(12),
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    backgroundColor: C.bg,
    minWidth: "30%",
    alignItems: "center",
  },
  typeCardActive: { borderColor: C.blue, backgroundColor: C.blueLight },
  typeCardText: { fontSize: fs(13), fontWeight: "700", color: C.textMuted },
  typeCardTextActive: { color: C.blue, fontWeight: "900" },

  loanTypeCard: {
    paddingHorizontal: s(16),
    paddingVertical: s(14),
    borderRadius: s(12),
    borderWidth: 1.5,
    width: s(260),
  },
  loanTypeCardActive: {
    borderColor: C.blue,
    backgroundColor: C.blueLight,
  },
  loanTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: s(10),
  },
  loanTypeIcon: {
    width: s(24),
    height: s(24),
    tintColor: C.textMuted,
    marginRight: 10,
  },
  loanTypeTitleGroup: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  loanTypeTitle: {
    fontSize: fs(14),
    fontWeight: "700",
    color: C.textDark,
  },
  loanTypeBadge: {
    backgroundColor: C.cardBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: s(20),
    alignSelf: "flex-start",
  },
  loanTypeBadgeText: {
    fontSize: fs(11),
    color: C.textDark,
    fontWeight: "600",
  },
  moreInfoBtn: {
    paddingVertical: s(8),
  },
  moreInfoText: {
    fontSize: fs(12),
    color: C.textMuted,
    fontWeight: "600",
  },
  expandedInfo: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    borderStyle: "dashed",
    paddingTop: 12,
  },
  expandedDesc: {
    fontSize: fs(12),
    color: C.textMuted,
    lineHeight: fs(18),
    marginBottom: s(10),
  },
  expandedBadges: {
    flexDirection: "row",
    gap: 8,
    marginBottom: s(10),
  },
  expandedBadge: {
    backgroundColor: C.cardBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: s(20),
  },
  expandedBadgeText: {
    fontSize: fs(11),
    color: C.textDark,
    fontWeight: "700",
  },
  expandedMax: {
    fontSize: fs(13),
    fontWeight: "700",
    color: C.textDark,
  },

  sectionTitle: {
    fontSize: fs(16),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(6),
  },
  sectionSubtitle: {
    fontSize: fs(12),
    color: C.textMuted,
    lineHeight: fs(18),
    marginBottom: s(14),
  },
  docRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: s(12),
  },
  docCol: {
    width: "40%",
    flexGrow: 1,
  },
  docLabel: {
    fontSize: fs(12),
    fontWeight: "600",
    color: C.textDark,
    marginBottom: s(8),
    minHeight: 34,
  },
  captureBox: {
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    borderRadius: s(12),
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    overflow: "hidden",
  },
  captureBoxDone: {
    borderColor: C.green,
    borderStyle: "solid",
    paddingVertical: 0,
    paddingHorizontal: 0,
    height: 120,
  },
  docPreviewImg: {
    width: "100%",
    height: "100%",
    borderRadius: s(10),
    resizeMode: "cover",
  },
  captureIcon: {
    width: 32,
    height: 32,
    marginBottom: s(8),
  },
  captureText: {
    fontSize: fs(12),
    fontWeight: "600",
    color: C.textDark,
    marginBottom: s(4),
  },
  captureHint: {
    fontSize: fs(11),
    color: C.textMuted,
  },
  uploadArrow: {
    fontSize: fs(28),
    fontWeight: "700",
    marginBottom: s(6),
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(16),
    paddingVertical: s(12),
    borderRadius: s(12),
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    gap: 8,
  },
  radioOptionActive: {
    borderColor: C.blue,
    backgroundColor: C.blueLight,
  },
  radioCircle: {
    width: s(18),
    height: s(18),
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: C.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioText: {
    fontSize: fs(14),
    fontWeight: "600",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(12),
    paddingHorizontal: s(14),
  },
  currencySymbol: {
    fontSize: fs(16),
    fontWeight: "900",
    color: C.textDark,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: fs(15),
    color: C.textDark,
    paddingVertical: s(14),
    fontWeight: "700",
  },
  textInputFull: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(12),
    paddingHorizontal: s(14),
    paddingVertical: s(14),
    fontSize: fs(15),
    color: C.textDark,
    fontWeight: "700",
  },
  textArea: { minHeight: 110, paddingTop: 14 },

  infoBox: {
    backgroundColor: C.blueLight,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
    padding: s(14),
    borderRadius: s(12),
    marginBottom: 18,
  },
  infoText: {
    fontSize: fs(13),
    color: C.textDark,
    lineHeight: fs(18),
    fontWeight: "600",
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
  submitBtn: {
    backgroundColor: C.blue,
    paddingVertical: s(16),
    borderRadius: s(14),
    alignItems: "center",
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: { fontSize: 15.5, fontWeight: "900", color: "#FFFFFF" },

  // Predictive UI Styles
  scoreBox: {
    padding: s(16),
    borderRadius: s(14),
    borderWidth: 1,
    marginBottom: s(6),
  },
  scoreHigh: { backgroundColor: C.greenLight, borderColor: "rgba(52,199,89,0.3)" },
  scoreMed: { backgroundColor: C.orangeLight, borderColor: "rgba(255,149,0,0.3)" },
  scoreLow: { backgroundColor: "rgba(231,76,60,0.1)", borderColor: "rgba(231,76,60,0.3)" },
  scoreText: {
    fontSize: fs(16),
    fontWeight: "900",
    marginBottom: s(10),
    textAlign: "center",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: s(4),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: s(4),
  },
  breakdownBox: {
    backgroundColor: C.cardBg,
    borderRadius: s(14),
    padding: s(16),
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: s(20),
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  breakdownTitle: {
    fontSize: fs(15),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(12),
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: s(8),
  },
  breakdownLabel: { fontSize: fs(13), color: C.textMuted, fontWeight: "600" },
  breakdownValue: { fontSize: fs(14), color: C.textDark, fontWeight: "700" },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingTop: 10,
    marginTop: 4,
  },
  breakdownLabelTotal: { fontSize: fs(14), color: C.textDark, fontWeight: "800" },
  breakdownValueTotal: { fontSize: fs(16), color: C.textDark, fontWeight: "900" },

  // Success Modal
  successModalContent: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    marginBottom: "auto",
    marginHorizontal: s(20),
    borderRadius: s(24),
  },
  successIconCircle: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(20),
  },
  successCheck: {
    fontSize: 32,
    color: C.green,
    fontWeight: "900",
  },
  successTitle: {
    fontSize: fs(22),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(10),
    textAlign: "center",
  },
  successSub: {
    fontSize: fs(14),
    color: C.textMuted,
    textAlign: "center",
    lineHeight: fs(20),
    marginBottom: 28,
  },
  successBtn: {
    backgroundColor: C.green,
    width: "100%",
    paddingVertical: s(16),
    borderRadius: s(14),
    alignItems: "center",
  },
  successBtnText: {
    fontSize: fs(16),
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Details Modal
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: s(10),
    marginBottom: s(20),
  },
  detailsId: { fontSize: fs(18), fontWeight: "800", color: C.textDark },
  detailsType: { fontSize: fs(13), color: C.textMuted, marginTop: 2 },
  detailsCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(16),
    padding: s(16),
    marginBottom: s(16),
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    marginBottom: s(12),
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  detailsLabel: { fontSize: fs(13), color: C.textMuted, fontWeight: "600" },
  detailsValue: { fontSize: fs(14), color: C.textDark, fontWeight: "800" },
  purposeBox: {
    backgroundColor: C.blueLight,
    padding: s(16),
    borderRadius: s(16),
    marginBottom: s(24),
  },
  purposeTitle: { fontSize: fs(14), fontWeight: "800", color: C.blue, marginBottom: 8 },
  purposeText: { fontSize: fs(14), color: C.textDark, lineHeight: 20 },

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
  sidebarUserName: { fontSize: fs(14), fontWeight: "700", color: "#FFF" },
  sidebarUserEmail: {
    fontSize: fs(11),
    color: C.textMuted,
    marginTop: 1,
  },

  signOutRow: { flexDirection: "row", alignItems: "center", gap: s(10), paddingVertical: 6 },
  signOutIcon: { width: 30, height: s(40), tintColor: C.red },
  signOutText: { fontSize: fs(14), color: C.red, fontWeight: "700" },

  // Restricted overlay
  restrictedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  restrictedCard: {
    width: "100%",
    backgroundColor: C.cardBg,
    borderRadius: s(20),
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(60,90,150,0.15)",
  },
  lockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(46,107,240,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(20),
  },
  lockEmoji: { fontSize: 36 },
  lockIcon: {
    width: s(36),
    height: s(36),
    tintColor: C.blue,
  },
  restrictedTitle: {
    fontSize: fs(22),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(10),
    textAlign: "center",
  },
  restrictedSub: {
    fontSize: fs(14),
    color: C.textMuted,
    textAlign: "center",
    lineHeight: fs(20),
    marginBottom: s(24),
  },
  restrictedBtn: {
    backgroundColor: C.blue,
    borderRadius: s(12),
    paddingVertical: s(14),
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
  },
  restrictedBtnText: {
    color: "#FFFFFF",
    fontSize: fs(15),
    fontWeight: "600",
  },

  // Unlock Info Button
  unlockInfoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: s(16),
    paddingVertical: s(12),
    paddingHorizontal: s(20),
    borderRadius: s(12),
    borderWidth: 1.5,
    borderColor: C.blue,
    borderStyle: "dashed",
    backgroundColor: "rgba(46,107,240,0.04)",
    width: "100%",
  },
  unlockInfoBtnText: {
    fontSize: fs(13),
    fontWeight: "700",
    color: C.blue,
  },
  unlockInfoArrow: {
    fontSize: fs(16),
    color: C.blue,
    fontWeight: "700",
  },

  // Requirements Modal
  reqModalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: s(24),
  },
  reqModalContent: {
    backgroundColor: C.cardBg,
    borderRadius: s(20),
    padding: s(24),
    width: "100%",
    maxWidth: 400,
  },
  reqModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: s(12),
  },
  reqModalTitle: {
    fontSize: fs(20),
    fontWeight: "800",
    color: C.textDark,
  },
  reqCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: s(16),
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  reqCloseBtnText: {
    fontSize: fs(16),
    color: C.textMuted,
    fontWeight: "600",
  },
  reqModalSub: {
    fontSize: fs(13),
    color: C.textMuted,
    lineHeight: fs(20),
    marginBottom: s(20),
  },
  reqItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(14),
    marginBottom: 18,
  },
  reqIconCircle: {
    width: s(44),
    height: s(44),
    borderRadius: s(14),
    backgroundColor: C.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  reqIcon: {
    width: s(22),
    height: s(22),
    tintColor: C.blue,
  },
  reqItemTitle: {
    fontSize: fs(15),
    fontWeight: "800",
    color: C.textDark,
    marginBottom: s(4),
  },
  reqItemDesc: {
    fontSize: 12.5,
    color: C.textMuted,
    lineHeight: fs(18),
  },
  reqGotItBtn: {
    backgroundColor: C.blue,
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: "center",
    marginTop: 6,
  },
  reqGotItText: {
    color: "#FFFFFF",
    fontSize: fs(15),
    fontWeight: "700",
  },

  // Savings Eligibility Banner
  savingsBanner: {
    marginHorizontal: s(18),
    marginBottom: 18,
    backgroundColor: "rgba(245,166,35,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.25)",
    borderRadius: s(16),
    padding: s(18),
  },
  savingsBannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(14),
    marginBottom: s(14),
  },
  
  errorBox: {
    backgroundColor: "rgba(231,76,60,0.1)",
    borderWidth: 1,
    borderColor: "rgba(231,76,60,0.3)",
    padding: 12,
    borderRadius: s(10),
    alignItems: "center",
  },
  errorText: {
    color: "#E74C3C",
    fontSize: fs(13),
    fontWeight: "700",
    textAlign: "center",
  },
  savingsBannerTitle: {
    fontSize: fs(15),
    fontWeight: "700",
    color: "#8B6914",
    marginBottom: s(4),
  },
  savingsBannerText: {
    fontSize: fs(13),
    color: "#A07D1C",
    lineHeight: fs(18),
  },
  savingsBannerProgressBg: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: s(4),
    overflow: "hidden",
    marginBottom: s(12),
  },
  savingsBannerProgressFill: {
    height: "100%",
    backgroundColor: "#F5A623",
    borderRadius: s(4),
  },
  savingsBannerLink: {
    fontSize: fs(13),
    fontWeight: "700",
    color: "#0D1F45",
    textAlign: "right",
  },
});








