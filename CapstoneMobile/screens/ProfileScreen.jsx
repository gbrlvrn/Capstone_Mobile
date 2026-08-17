import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import { SkeletonInfoRows } from "../components/SkeletonLoader";
import { useToast } from "../components/ToastContext";
import { useAlert } from "../components/AlertContext";
import { deleteAccount, getProfile, uploadProfilePhoto } from "../services/AuthService";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../components/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { API_CONFIG } from "../services/config";
import OfflineBanner from "../components/OfflineBanner";
import QRCode from "react-native-qrcode-svg";

// Metro Reload Trigger: Digital Member Pass QR clean state


const { width: SCREEN_WIDTH } = Dimensions.get("window");

const LOGO = require("../assets/puac_logo.png");

const ICONS = {
  wallet: require("../assets/icons/wallet.png"),
  person: require("../assets/icons/person.png"),
  edit: require("../assets/icons/edit.png"),
  home: require("../assets/icons/home-v3.png"),
  loans: require("../assets/icons/loans.png"),
  donations: require("../assets/icons/donations.png"),
  attendance: require("../assets/icons/attendance.png"),
  branches: require("../assets/icons/branches.png"),
  profile: require("../assets/icons/profile.png"),
  settings: require("../assets/icons/settings.png"),
  signout: require("../assets/icons/signout.png"),
  chat: require("../assets/icons/chat.png"),
  notification: require("../assets/icons/bell.png"),
};

const C = {
  bg: "#F0F2F5",
  navBg: "#0D1F45",
  cardBg: "#FFFFFF",
  cardBorder: "#E8ECF0",
  textDark: "#1A2744",
  textMuted: "#6B7FA3",
  textLight: "#8B96A8",
  blue: "#0D1F45",
  blueLight: "rgba(46,107,240,0.1)",
  tabBg: "rgb(13, 31, 69)",
  tabActive: "#0D1F45",
  tabInactive: "#e3ecf9",
  sidebarBg: "#0D1F45",
  sidebarActive: "#0D1F45",
  overlay: "rgba(0,0,0,0.45)",
  navBorder: "rgba(60,90,150,0.25)",
  red: "#E74C3C",
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

const EMPTY_USER = {
  fullName: "",
  email: "",
  phone: "",
  branch: "",
  position: "",
  gender: "",
  birthday: "",
  isVerified: false,
  createdAt: "",
};

function InfoRow({ icon, label, value }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: colors.cardBg || "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.cardBorder || "#E8ECF0",
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "rgba(13, 31, 69, 0.06)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name={icon || "information-circle-outline"} size={17} color="#0D1F45" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "600", marginBottom: 2 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13.5, color: colors.textDark, fontWeight: "700" }} numberOfLines={1}>
          {value || "Not specified"}
        </Text>
      </View>
    </View>
  );
}

function cleanEmail(value) {
  if (!value) return "";
  if (typeof value === "object") return ""; // if accidentally passed an object
  return String(value).trim().toLowerCase();
}

const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing and using IsangDiwa, a digital church management system developed for the Philippine United Apostolic Church, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, you must discontinue use of the system.",
  },
  {
    title: "2. Purpose of the System",
    body: "PUAC is designed to facilitate transparent and accountable management of church-related loan applications, approvals, payments, and member records in support of responsible financial stewardship.",
  },
  {
    title: "3. Authorized Users",
    body: "Only registered and approved church members, officers, and administrators are permitted to access PUAC. Access rights are assigned based on user roles defined by church authorities.",
  },
  {
    title: "4. User Responsibilities",
    body: "Users are responsible for maintaining the confidentiality of their login credentials and for all activities performed under their accounts. Any unauthorized use must be reported immediately.",
  },
  {
    title: "5. Loan Application and Approval",
    body: "Submitting a loan application through PUAC does not guarantee approval. All loan requests are subject to review, verification, and approval by authorized church officers in accordance with church policies.",
  },
  {
    title: "6. Loan Terms, Interest, and Penalties",
    body: "Approved loans are governed by agreed terms, including loan amount, repayment schedule, interest rates, and applicable penalties for late payments. These details are displayed within the system and serve as the official reference.",
  },
  {
    title: "7. Payments and Monitoring",
    body: "Borrowers are responsible for making payments on or before the due dates shown in PUAC. The system provides automated monitoring of balances, payment history, and loan status for reference purposes.",
  },
  {
    title: "8. AI Assistance Disclaimer",
    body: "PUAC may include an AI-powered chatbot (PUAC Bot) to assist with inquiries related to loan status, payment schedules, and system navigation. The chatbot provides informational support only and does not replace official decisions made by church authorities.",
  },
  {
    title: "9. Prohibited Use",
    body: "Users shall not misuse the system, attempt unauthorized access, manipulate records, or engage in activities that compromise the security or integrity of PUAC.",
  },
  {
    title: "10. Termination of Access",
    body: "The church reserves the right to suspend or terminate access to PUAC for violations of these Terms and Conditions or other valid administrative reasons.",
  },
  {
    title: "11. Limitation of Liability",
    body: "PUAC is provided for administrative support purposes only. The church shall not be held liable for any direct or indirect damages arising from the use or inability to use the system.",
  },
  {
    title: "12. Governing Principles",
    body: "PUAC operates under the principles of faith, integrity, transparency, accountability, and responsible stewardship in alignment with church values.",
  },
];

export default function ProfileScreen({ navigation, route }) {
  const { showToast } = useToast();
  const { showAlert } = useAlert();
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [activeTab, setActiveTab] = useState("Profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const [user, setUser] = useState(EMPTY_USER);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [deactivateConfirmText, setDeactivateConfirmText] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(-260)).current;

  // Menu panel states
  const [aboutUsOpen, setAboutUsOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const aboutUsSlide = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const termsSlide = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const helpSlide = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const openPanel = useCallback((setOpen, slideAnim) => {
    setOpen(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, []);

  const closePanel = useCallback((setOpen, slideAnim) => {
    Animated.timing(slideAnim, { toValue: SCREEN_WIDTH, duration: 300, useNativeDriver: true }).start(() => setOpen(false));
  }, []);

  const tabAnimations = useRef(
    ALL_TAB_ITEMS.map(() => ({
      scale: new Animated.Value(1),
      bgOpacity: new Animated.Value(0),
    })),
  ).current;

  const routeEmail = cleanEmail(route?.params?.email);
  const userEmail = cleanEmail(user?.email);
  const resolvedEmail = userEmail || routeEmail;
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");

  // QR Pass Modal state
  const [qrPassModalOpen, setQrPassModalOpen] = useState(false);

  // Load cache first, then fetch real profile
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingUser(true);

        const cached = await AsyncStorage.getItem("faithly_user");
        let cachedEmail = "";

        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            cachedEmail = cleanEmail(parsed?.email);
            if (mounted) {
              setUser({
                ...EMPTY_USER,
                ...parsed,
                email: cachedEmail,
              });
              if (parsed?.role) setUserRole(parsed.role);
              if (parsed?.position) setUserPosition(parsed.position);
            }
          } catch {
            // ignore
          }
        }

        // choose email to fetch
        const emailToFetch = routeEmail || cachedEmail;
        if (!emailToFetch) return;

        // fetch from backend
        const res = await getProfile(emailToFetch); 
        if (!mounted) return;

        const merged = {
          ...EMPTY_USER,
          ...res.user,
          email: cleanEmail(res.user?.email || emailToFetch),
        };

        setUser(merged);
        if (merged.profilePhoto) setProfilePhoto(merged.profilePhoto);
        await AsyncStorage.setItem("faithly_user", JSON.stringify(merged));
      } catch (e) {
      
      } finally {
        if (mounted) setLoadingUser(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [routeEmail]);



  // always navigate with email
  const navWithEmail = useCallback(
    (screen) => navigation.replace(screen, { email: resolvedEmail }),
    [navigation, resolvedEmail],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const emailToFetch = resolvedEmail;
      if (emailToFetch) {
        const res = await getProfile(emailToFetch);
        const merged = {
          ...EMPTY_USER,
          ...res.user,
          email: cleanEmail(res.user?.email || emailToFetch),
        };
        setUser(merged);
        await AsyncStorage.setItem("faithly_user", JSON.stringify(merged));
      }
      showToast("Profile refreshed", "success");
    } catch {
      showToast("Couldn't refresh profile", "error");
    } finally {
      setRefreshing(false);
    }
  }, [resolvedEmail, showToast]);

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast("Camera roll permission is needed", "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setUploadingPhoto(true);
        const localUri = result.assets[0].uri;
        try {
          const data = await uploadProfilePhoto(localUri);
          if (data.profilePhoto) {
            setProfilePhoto(data.profilePhoto);
            // Update cached user
            const cached = await AsyncStorage.getItem("faithly_user");
            const parsed = cached ? JSON.parse(cached) : {};
            parsed.profilePhoto = data.profilePhoto;
            await AsyncStorage.setItem("faithly_user", JSON.stringify(parsed));
          }
          showToast("Profile photo updated!", "success");
        } catch (err) {
          // Fallback to storing local device URI for mock offline UI
          setProfilePhoto(localUri);
          const cached = await AsyncStorage.getItem("faithly_user");
          const parsed = cached ? JSON.parse(cached) : {};
          parsed.profilePhoto = localUri;
          await AsyncStorage.setItem("faithly_user", JSON.stringify(parsed));
          showToast("Profile photo saved locally!", "success");
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (err) {
      showToast("Could not open gallery", "error");
    }
  };


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

  // Animate indicator + tab effects
  useEffect(() => {
    const tabItems = userRole !== "officer"
      ? ALL_TAB_ITEMS.filter(t => t.key !== "Loans")
      : ALL_TAB_ITEMS;
    const tabWidth = SCREEN_WIDTH / tabItems.length;
    const index = tabItems.findIndex((t) => t.key === activeTab);

    Animated.spring(indicatorPosition, {
      toValue: index * tabWidth,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();

    tabItems.forEach((tab, vi) => {
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
  }, [activeTab, indicatorPosition, tabAnimations, userRole]);

  const handleDeactivateAccount = async () => {
    if (deactivateConfirmText !== "DEACTIVATE") {
      showAlert("Error", "Please type DEACTIVATE to confirm account deactivation");
      return;
    }

    if (!resolvedEmail) {
      showAlert(
        "Missing Email",
        "We can't find your account email. Please login again so we can identify your account.",
      );
      return;
    }

    try {
      setDeactivating(true);

      // The backend functionality to actually deactivate has been deferred as per user request.
      // We will simply clear the local storage and log them out for now.
      
      await AsyncStorage.removeItem("faithly_user");

      setDeactivateModalVisible(false);
      setDeactivateConfirmText("");

      navigation.reset({
        index: 0,
        routes: [{ name: "Start" }],
      });
    } catch (e) {
      showAlert("Deactivate Failed", e?.message || "Failed to deactivate account.");
    } finally {
      setDeactivating(false);
    }
  };

  const InfoRow = ({ label, value }) => (
    <View style={styles.infoSection}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "—"}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <OfflineBanner />
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: "transparent" }]}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Home', { email: resolvedEmail })} activeOpacity={0.6}>
          <Text style={{ color: colors.textDark, fontSize: 26, fontWeight: '700', paddingHorizontal: 4 }}>←</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, overflow: "hidden" }}>
            <Image source={LOGO} style={{ width: 34, height: 34, borderRadius: 17 }} resizeMode="cover" />
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications", { email: userEmail })} style={{ padding: 4 }} activeOpacity={0.6}><Image source={ICONS.notification} style={{ width: 22, height: 22, tintColor: colors.textDark }} resizeMode="contain" /></TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D1F45" colors={["#0D1F45"]} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.textDark }]}>My Profile</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
            Your official member digital pass & registration info
          </Text>
        </View>

        {/* Unified Official Digital Member Pass Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setQrPassModalOpen(true)}
          style={{
            marginHorizontal: 18,
            marginBottom: 20,
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: "#0D1F45",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <View style={{ padding: 18, position: "relative" }}>
            {/* Background Decorative Circle */}
            <View
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: "rgba(0, 195, 255, 0.12)",
              }}
            />

            {/* Header row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                  <Image source={LOGO} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
                </View>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.4 }}>PHILIPPINE UNITED APOSTOLIC CHURCH</Text>
                  <Text style={{ fontSize: 10, color: "rgba(0, 195, 255, 0.9)", fontWeight: "700" }}>OFFICIAL MEMBER DIGITAL PASS</Text>
                </View>
              </View>
            </View>

            {/* Content row with Avatar + Member Info + Mini QR */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <TouchableOpacity style={styles.avatar} activeOpacity={0.8} onPress={handlePickPhoto}>
                  {profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto.startsWith("file://") || profilePhoto.startsWith("content://") ? profilePhoto : `${API_CONFIG.CUSTOM_BACKEND.BASE_URL}${profilePhoto}` }}
                      style={styles.avatarPhoto}
                    />
                  ) : (
                    <Image
                      source={ICONS.person}
                      style={styles.avatarIcon}
                      resizeMode="contain"
                    />
                  )}
                  <View style={styles.cameraOverlay}>
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="camera" size={12} color="#FFF" />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16.5, fontWeight: "800", color: "#FFFFFF", marginBottom: 2 }} numberOfLines={1}>
                    {user.fullName || "Member"}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.75)", marginBottom: 4 }} numberOfLines={1}>
                    {resolvedEmail || "No email"}
                  </Text>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                      {userRole === "officer" && <Ionicons name="checkmark-circle" size={12} color="#00C3FF" />}
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>
                        {userRole === "officer" ? "Officer" : "Member"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} numberOfLines={1}>• {user.branch || "Central Branch"}</Text>
                  </View>
                </View>
              </View>

              {/* Crisp Mini QR Preview */}
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: 5,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.3)",
                    marginBottom: 4,
                  }}
                >
                  <QRCode
                    value={resolvedEmail || "isangdiwa-member"}
                    size={50}
                    color="#0D1F45"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#00C3FF" }}>View Pass ›</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={[styles.menuCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.6} onPress={() => openPanel(setAboutUsOpen, aboutUsSlide)}>
            <View style={[styles.menuIconCircle, { backgroundColor: "rgba(52,199,89,0.1)" }]}>
              <Ionicons name="information-circle-outline" size={20} color="#34C759" />
            </View>
            <Text style={[styles.menuItemText, { color: colors.textDark }]}>About Us</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.6} onPress={() => openPanel(setTermsOpen, termsSlide)}>
            <View style={[styles.menuIconCircle, { backgroundColor: "rgba(255,149,0,0.1)" }]}>
              <Ionicons name="document-text-outline" size={20} color="#FF9500" />
            </View>
            <Text style={[styles.menuItemText, { color: colors.textDark }]}>Terms and Conditions</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.6} onPress={() => openPanel(setHelpOpen, helpSlide)}>
            <View style={[styles.menuIconCircle, { backgroundColor: "rgba(88,86,214,0.1)" }]}>
              <Ionicons name="help-circle-outline" size={20} color="#5856D6" />
            </View>
            <Text style={[styles.menuItemText, { color: colors.textDark }]}>Help Centre</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: "center", color: colors.textMuted, fontSize: 12, marginTop: 24, marginBottom: 12 }}>
          Made by QuadTech (2026)
        </Text>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* About Us Panel */}
      <Modal visible={aboutUsOpen} transparent animationType="none" onRequestClose={() => closePanel(setAboutUsOpen, aboutUsSlide)}>
        <Animated.View style={[styles.infoModalOverlay, { transform: [{ translateX: aboutUsSlide }] }]}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <TouchableOpacity onPress={() => closePanel(setAboutUsOpen, aboutUsSlide)} style={styles.infoModalBackBtn}>
                <Ionicons name="arrow-back" size={22} color={C.textDark} />
              </TouchableOpacity>
              <Text style={styles.infoModalTitle}>About Us</Text>
              <View style={{ width: 34 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.infoModalScroll}>
              <View style={styles.benefitItem}>
                <View style={[styles.menuIconCircle, { backgroundColor: "rgba(46,107,240,0.1)" }]}>
                  <Ionicons name="business-outline" size={20} color={C.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>Our Organization</Text>
                  <Text style={styles.benefitDesc}>Philippine United Apostolic Church (PUAC) is dedicated to fostering spiritual growth and community support.</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.menuIconCircle, { backgroundColor: "rgba(52,199,89,0.1)" }]}>
                  <Ionicons name="heart-outline" size={20} color="#34C759" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>Our Mission</Text>
                  <Text style={styles.benefitDesc}>To provide a platform for transparent financial stewardship, mutual support, and convenient access to church resources.</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.menuIconCircle, { backgroundColor: "rgba(255,149,0,0.1)" }]}>
                  <Ionicons name="leaf-outline" size={20} color="#FF9500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>Our Vision</Text>
                  <Text style={styles.benefitDesc}>A united and empowered community where every member thrives spiritually and holistically.</Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={[styles.menuIconCircle, { backgroundColor: "rgba(88,86,214,0.1)" }]}>
                  <Ionicons name="mail-outline" size={20} color="#5856D6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>Contact Us</Text>
                  <Text style={styles.benefitDesc}>For inquiries or support, please reach out to your local church administration.</Text>
                </View>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Animated.View>
      </Modal>

      {/* Terms Panel */}
      <Modal visible={termsOpen} transparent animationType="none" onRequestClose={() => closePanel(setTermsOpen, termsSlide)}>
        <Animated.View style={[styles.infoModalOverlay, { transform: [{ translateX: termsSlide }] }]}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <TouchableOpacity onPress={() => closePanel(setTermsOpen, termsSlide)} style={styles.infoModalBackBtn}>
                <Ionicons name="arrow-back" size={22} color={C.textDark} />
              </TouchableOpacity>
              <Text style={styles.infoModalTitle}>Terms and Conditions</Text>
              <View style={{ width: 34 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.infoModalScroll}>
              {TERMS_SECTIONS.map((section, idx) => (
                <View key={idx} style={styles.panelSection}>
                  <Text style={styles.panelSectionTitle}>{section.title}</Text>
                  <Text style={styles.panelParagraph}>{section.body}</Text>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Animated.View>
      </Modal>

      {/* Help Centre Panel */}
      <Modal visible={helpOpen} transparent animationType="none" onRequestClose={() => closePanel(setHelpOpen, helpSlide)}>
        <Animated.View style={[styles.infoModalOverlay, { transform: [{ translateX: helpSlide }] }]}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <TouchableOpacity onPress={() => closePanel(setHelpOpen, helpSlide)} style={styles.infoModalBackBtn}>
                <Ionicons name="arrow-back" size={22} color={C.textDark} />
              </TouchableOpacity>
              <Text style={styles.infoModalTitle}>Help Centre</Text>
              <View style={{ width: 34 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.infoModalScroll}>
              <View style={styles.panelSection}>
                <Text style={styles.panelSectionTitle}>Frequently Asked Questions</Text>
              </View>
              {userRole === "officer" && (
                <>
                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>How do I apply for a loan?</Text>
                    <Text style={styles.faqAnswer}>Navigate to the Loans tab and tap "Apply for Loan". Fill in the required details including loan type, amount, purpose, and upload the necessary documents.</Text>
                  </View>
                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>How long does loan approval take?</Text>
                    <Text style={styles.faqAnswer}>Loan applications are typically reviewed within 1–3 business days. You will receive a notification once your loan status is updated.</Text>
                  </View>
                </>
              )}
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>How do I become an officer?</Text>
                <Text style={styles.faqAnswer}>Officer accounts are created during signup by selecting the "Officer" role and providing your Church ID. If you need to change your role, please contact church administration.</Text>
              </View>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>Why can't I edit my profile information?</Text>
                <Text style={styles.faqAnswer}>Profile information is based on your registration data to maintain system integrity. Contact your administrator if you need to update your details.</Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>How do I deactivate my account?</Text>
                <Text style={styles.faqAnswer}>Go to your Profile, tap on your Digital Member Pass to view your QR Code and Account Information, then scroll to the bottom to find the "Deactivate Account" option.</Text>
              </View>
              <View style={styles.panelSection}>
                <Text style={styles.panelSectionTitle}>Contact Support</Text>
                <Text style={styles.panelParagraph}>If you need further assistance, you can use the chat feature available on any screen, or reach out to your community branch administrator.</Text>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Animated.View>
      </Modal>
      <Modal
        visible={deactivateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (deactivating) return;
          setDeactivateModalVisible(false);
          setDeactivateConfirmText("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Deactivate Account</Text>
            <Text style={styles.modalSubtitle}>
              This action will deactivate your account. You will be logged out.
            </Text>

            <Text style={styles.modalInstruction}>
              Type <Text style={styles.modalDeleteText}>DEACTIVATE</Text> to confirm:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={deactivateConfirmText}
              onChangeText={setDeactivateConfirmText}
              placeholder="Type DEACTIVATE here"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              editable={!deactivating}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
                disabled={deactivating}
                onPress={() => {
                  setDeactivateModalVisible(false);
                  setDeactivateConfirmText("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDeleteBtn, deactivating && { opacity: 0.75 }]}
                activeOpacity={0.7}
                disabled={deactivating}
                onPress={handleDeactivateAccount}
              >
                {deactivating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteBtnText}>Deactivate</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>
              Deactivating:{" "}
              <Text style={{ fontWeight: "800" }}>
                {resolvedEmail || "no email"}
              </Text>
            </Text>
          </View>
        </View>
      </Modal>

      {/* High-Contrast Full Digital Member Pass & Account Info Modal */}
      <Modal
        visible={qrPassModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrPassModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          {/* Backdrop Touch Dismiss */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setQrPassModalOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />

          {/* Inner Card Modal Container */}
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              maxHeight: "88%",
              backgroundColor: colors.cardBg,
              borderRadius: 24,
              padding: 0,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.cardBorder,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.35,
              shadowRadius: 18,
              elevation: 14,
            }}
          >
            {/* Pass Top Banner / Header (Navy Theme) */}
            <View style={{ backgroundColor: "#0D1F45", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                    <Image source={LOGO} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 }}>PHILIPPINE UNITED APOSTOLIC CHURCH</Text>
                    <Text style={{ fontSize: 10, color: "#00C3FF", fontWeight: "700" }}>OFFICIAL MEMBER DIGITAL PASS</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setQrPassModalOpen(false)} style={{ padding: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14 }}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              style={{ flexShrink: 1, width: "100%" }}
              contentContainerStyle={{ padding: 18, alignItems: "center" }}
            >
              {/* Member Profile Banner Card */}
              <View style={{ width: "100%", alignItems: "center", marginBottom: 18 }}>
                <TouchableOpacity style={styles.avatarLarge} activeOpacity={0.8} onPress={handlePickPhoto}>
                  {profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto.startsWith("file://") || profilePhoto.startsWith("content://") ? profilePhoto : `${API_CONFIG.CUSTOM_BACKEND.BASE_URL}${profilePhoto}` }}
                      style={styles.avatarPhotoLarge}
                    />
                  ) : (
                    <Image
                      source={ICONS.person}
                      style={styles.avatarIconLarge}
                      resizeMode="contain"
                    />
                  )}
                  <View style={styles.cameraOverlayLarge}>
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="camera" size={14} color="#FFF" />
                    )}
                  </View>
                </TouchableOpacity>

                <Text style={{ fontSize: 19, fontWeight: "800", color: colors.textDark, textAlign: "center", marginTop: 4 }}>
                  {user.fullName || "Member"}
                </Text>
                
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(13, 31, 69, 0.08)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    {userRole === "officer" && (
                      <Ionicons name="checkmark-circle" size={14} color={C.blue} />
                    )}
                    <Text style={{ fontSize: 11.5, fontWeight: "700", color: C.blue }}>
                      {userRole === "officer" ? "Church Officer" : "Official Member"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Scannable Pass Box */}
              <View
                style={{
                  width: "100%",
                  backgroundColor: "#F4F7FB",
                  borderRadius: 20,
                  padding: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(13, 31, 69, 0.1)",
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, textAlign: "center", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Sunday Service & Event Check-In Pass
                </Text>

                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: 14,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: "#0D1F45",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 2,
                    marginBottom: 10,
                  }}
                >
                  <QRCode
                    value={resolvedEmail || "isangdiwa-member"}
                    size={175}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    logo={LOGO}
                    logoSize={38}
                    logoBackgroundColor="#FFFFFF"
                    logoMargin={2}
                    logoBorderRadius={19}
                  />
                </View>

                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "center" }}>
                  Scan code at admin station to register attendance
                </Text>
              </View>

              {/* Account Information Section */}
              <View style={{ width: "100%", backgroundColor: colors.bg, borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.cardBorder }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <Ionicons name="person-circle-outline" size={18} color={C.blue} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.textDark, letterSpacing: 0.4 }}>
                    MEMBER DETAILS
                  </Text>
                </View>
                
                {loadingUser ? (
                  <SkeletonInfoRows count={6} />
                ) : (
                  <View style={{ width: "100%" }}>
                    <InfoRow icon="mail-outline" label="Email Address" value={resolvedEmail} />
                    <InfoRow icon="call-outline" label="Phone Number" value={user.phone} />
                    <InfoRow icon="business-outline" label="Community / Branch" value={user.branch} />
                    <InfoRow icon="briefcase-outline" label="Position in Church" value={user.position} />
                    <InfoRow icon="person-outline" label="Gender" value={user.gender} />
                    <InfoRow icon="calendar-outline" label="Date of Birth" value={user.birthday ? user.birthday.split("T")[0] : ""} />
                  </View>
                )}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setQrPassModalOpen(false)}
                activeOpacity={0.8}
                style={{
                  width: "100%",
                  backgroundColor: "#0D1F45",
                  paddingVertical: 14,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                  shadowColor: "#0D1F45",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>Close Digital Pass</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating draggable chat button */}
      <DraggableChatButton onPress={() => setChatbotOpen(true)} />

      <ChatbotModal
        visible={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
      />

      {/* Sidebar overlay */}
      {sidebarOpen ? (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSidebar}
        />
      ) : null}

      {/* Sidebar drawer (UI restored) */}
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
                {userRole === "officer" && userPosition ? userPosition : user.fullName || "Member"}
              </Text>
              <Text
                style={styles.sidebarUserEmail}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {resolvedEmail || "No email"}
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
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg  },
  circleTopRight: { position: 'absolute', top: -120, right: -120, width: 350, height: 350, borderRadius: 175, backgroundColor: '#0D1F45', opacity: 0.04, zIndex: 0 },
  circleBottomLeft: { position: 'absolute', bottom: -150, left: -150, width: 450, height: 450, borderRadius: 225, backgroundColor: '#00C3FF', opacity: 0.04, zIndex: 0 },

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
    fontWeight: "500",
    color: C.textDark,
  },
  topSpacer: { width: 28 },

  scroll: { flex: 1 },

  header: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 4,
  },
  pageSubtitle: { fontSize: 13, color: C.textMuted, lineHeight: 18 },

  profileCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 20,
    marginHorizontal: 18,
    marginBottom: 20,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: C.textDark },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  editIcon: { width: 16, height: 16, tintColor: C.blue },
  editText: { fontSize: 13, color: C.blue, fontWeight: "700" },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIcon: { width: 26, height: 26, tintColor: "#FFFFFF" },
  avatarPhoto: { width: 56, height: 56, borderRadius: 28 },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: C.blue,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  avatarPhotoLarge: { width: 80, height: 80, borderRadius: 40 },
  cameraOverlayLarge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: C.blue,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  nameBig: { fontSize: 17, fontWeight: "800", color: C.textDark },
  emailSmall: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.blue,
  },

  // Account Info Modal (slide from right)
  infoModalOverlay: {
    flex: 1,
    backgroundColor: C.bg,
  },
  infoModalContent: {
    flex: 1,
    backgroundColor: C.bg,
  },
  infoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 42,
    paddingBottom: 14,
    backgroundColor: C.navBg,
    gap: 12,
  },
  infoModalBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoModalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  infoModalScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  infoModalAvatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarIconLarge: { width: 38, height: 38, tintColor: "#FFFFFF" },
  infoModalName: {
    fontSize: 20,
    fontWeight: "800",
    color: C.textDark,
  },
  infoBlock: {
    paddingTop: 4,
  },

  loadingBox: {
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: 13, color: C.textMuted },

  infoSection: { marginBottom: 14 },
  infoLabel: {
    fontSize: 12,
    color: C.textLight,
    marginBottom: 6,
    fontWeight: "600",
  },
  infoValue: { fontSize: 15, color: C.textDark, fontWeight: "600" },

  deleteBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.red,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "800", color: C.red },

  modalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalInstruction: { fontSize: 14, color: C.textDark, marginBottom: 8 },
  modalDeleteText: { fontWeight: "900", color: C.red },
  modalInput: {
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: C.textDark,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 14, fontWeight: "800", color: C.textDark },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: C.red,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDeleteBtnText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  modalHint: { marginTop: 10, fontSize: 12, color: C.textMuted },

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
  sidebarUserName: { fontSize: 14, fontWeight: "600", color: "#FFF" },
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
  signOutText: { fontSize: 14, color: C.red, fontWeight: "500" },

  // Menu Card
  menuCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    marginHorizontal: 18,
    marginTop: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
    color: C.textDark,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuDivider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginLeft: 68,
  },

  // Panel Content Styles
  panelSection: {
    marginBottom: 22,
  },
  panelSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 12,
  },
  panelInfoCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  panelInfoLabel: {
    fontSize: 13.5,
    color: C.textMuted,
    fontWeight: "600",
  },
  panelInfoValue: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textDark,
  },
  panelBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
    paddingLeft: 4,
  },
  panelBulletText: {
    fontSize: 13.5,
    color: C.textDark,
    lineHeight: 20,
    flex: 1,
  },
  panelParagraph: {
    fontSize: 13.5,
    color: C.textDark,
    lineHeight: 21,
  },

  // Benefit Items
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 20,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 19,
  },

  // FAQ Items
  faqItem: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 19,
  },

  // Profile Photo
  avatarPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPhotoLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cameraOverlayLarge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});




