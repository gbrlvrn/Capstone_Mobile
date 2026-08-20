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
  Linking,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatbotModal from "./ChatbotModal";
import DraggableChatButton from "../components/DraggableChatButton";
import FloatingNavBar from "../components/FloatingNavBar";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { MapView, Marker } from "../components/Map";
import COMMUNITY_COORDINATES from "../data/communityCoordinates";
import { useTheme } from "../components/ThemeContext";
import { getBranches } from "../services/AuthService";
import OfflineBanner from "../components/OfflineBanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));
const SIDEBAR_WIDTH = s(260);
const CARD_WIDTH = SCREEN_WIDTH * 0.85; // slightly smaller than full width so peeking works

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
  location: require("../assets/icons/location.png"),
  phone: require("../assets/icons/phone.png"),
  email: require("../assets/icons/email.png"),
  clock: require("../assets/icons/clock.png"),
  people: require("../assets/icons/people.png"),
  church: require("../assets/icons/church.png"),
  search: require("../assets/icons/document.png"), // Using document as placeholder for search icon
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

// Initial empty states (populated from API)
const INITIAL_COMMUNITIES = [];
const INITIAL_BRANCHES = [];

function cleanEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

// Haversine formula to calculate distance between two coordinates in Kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export default function BranchScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [branchesState, setBranchesState] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [activeTab, setActiveTab] = useState("Branches");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [weeklyServicesOpen, setWeeklyServicesOpen] = useState(false);
  const [weeklySearchQuery, setWeeklySearchQuery] = useState("");
  const [fullMapOpen, setFullMapOpen] = useState(false);
  const [coordsCache, setCoordsCache] = useState({});
  const [userLocation, setUserLocation] = useState(null);

  const REGIONS = useMemo(() => [...new Set(branchesState.map(b => b.province))], [branchesState]);

  useEffect(() => {
    let mounted = true;
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        const res = await getBranches();
        if (mounted && res?.success) {
          // Filter to Active branches only (matches web UI behavior)
          const activeBranches = (res.branches || []).filter(b => !b.status || b.status === "Active");
          const mapped = activeBranches.map((b, idx) => ({
            id: b._id || idx + 1,
            name: b.name,
            province: b.province || b.region || "",
            region: b.region || "",
            location: `${b.province || b.region || ""} - ${b.name}`,
            leader: b.leader || "PUAC Representative",
            phone: b.phone || "+63 90 000 0000",
            email: b.email || "puac@gmail.com",
            // Backend returns b.members and b.officers (NOT membersCount/officersCount)
            members: b.members || b.membersCount || 0,
            officers: b.officers || b.officersCount || 0,
            upcomingEvents: b.upcomingEvents || [],
            // Backend may return serviceTimes as string[] e.g. ["Sunday 9AM", "Wednesday 7PM"]
            // Normalize to { day, time } objects for UI
            serviceTimes: Array.isArray(b.serviceTimes)
              ? b.serviceTimes.map(s => {
                  if (typeof s === "object" && s.day) return s;
                  const parts = String(s).split(/\s+/);
                  return { day: parts[0] || s, time: parts.slice(1).join(" ") || "" };
                })
              : [
                  { day: "Sunday", time: "9:00 AM" },
                  { day: "Wednesday", time: "7:00 PM" },
                ],
            address: b.address || `${b.province}`,
          }));
          setBranchesState(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err);
      } finally {
        if (mounted) setLoadingBranches(false);
      }
    };
    fetchBranches();
    return () => { mounted = false; };
  }, []);

  const filteredBranches = branchesState.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !selectedRegion || b.province === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  // Reset to page 1 whenever search/filter changes
  useEffect(() => {
    setCurrentPage(1);
    setExpandedBranchId(null);
  }, [searchQuery, selectedRegion]);
  
  const filteredWeeklyBranches = branchesState.filter(
    (b) =>
      b.name.toLowerCase().includes(weeklySearchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(weeklySearchQuery.toLowerCase())
  );
  

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedBranchId, setExpandedBranchId] = useState(null);
  const [expandedProvince, setExpandedProvince] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Philippine province → region mapping
  const PROVINCE_TO_REGION = useMemo(() => ({
    "Kalinga": { code: "CAR", name: "Cordillera Administrative Region" },
    "Abra": { code: "CAR", name: "Cordillera Administrative Region" },
    "Benguet": { code: "CAR", name: "Cordillera Administrative Region" },
    "Mountain Province": { code: "CAR", name: "Cordillera Administrative Region" },
    "Ifugao": { code: "CAR", name: "Cordillera Administrative Region" },
    "Apayao": { code: "CAR", name: "Cordillera Administrative Region" },
    "Isabela": { code: "Region II", name: "Cagayan Valley" },
    "Cagayan": { code: "Region II", name: "Cagayan Valley" },
    "Pangasinan": { code: "Region I", name: "Ilocos Region" },
    "La Union": { code: "Region I", name: "Ilocos Region" },
    "Ilocos Norte": { code: "Region I", name: "Ilocos Region" },
    "Ilocos Sur": { code: "Region I", name: "Ilocos Region" },
    "Tarlac": { code: "Region III", name: "Central Luzon" },
    "Nueva Ecija": { code: "Region III", name: "Central Luzon" },
    "Bulacan": { code: "Region III", name: "Central Luzon" },
    "Pampanga": { code: "Region III", name: "Central Luzon" },
    "Zambales": { code: "Region III", name: "Central Luzon" },
    "Bataan": { code: "Region III", name: "Central Luzon" },
    "NCR": { code: "NCR", name: "National Capital Region" },
    "Metro Manila": { code: "NCR", name: "National Capital Region" },
    "Rizal": { code: "Region IV-A", name: "CALABARZON" },
    "Cavite": { code: "Region IV-A", name: "CALABARZON" },
    "Laguna": { code: "Region IV-A", name: "CALABARZON" },
    "Batangas": { code: "Region IV-A", name: "CALABARZON" },
    "Quezon": { code: "Region IV-A", name: "CALABARZON" },
    "Cebu": { code: "Region VII", name: "Central Visayas" },
    "Bohol": { code: "Region VII", name: "Central Visayas" },
    "Agusan Del Norte": { code: "Region XIII", name: "Caraga" },
    "Agusan del Norte": { code: "Region XIII", name: "Caraga" },
    "Surigao Del Norte": { code: "Region XIII", name: "Caraga" },
    "Surigao del Norte": { code: "Region XIII", name: "Caraga" },
    "Surigao Del Sur": { code: "Region XIII", name: "Caraga" },
    "Surigao del Sur": { code: "Region XIII", name: "Caraga" },
    "Agusan Del Sur": { code: "Region XIII", name: "Caraga" },
    "Agusan del Sur": { code: "Region XIII", name: "Caraga" },
    "Dinagat Islands": { code: "Region XIII", name: "Caraga" },
  }), []);

  // Build case-insensitive lookup from PROVINCE_TO_REGION
  const provinceLookup = useMemo(() => {
    const map = {};
    Object.entries(PROVINCE_TO_REGION).forEach(([key, val]) => {
      map[key.toLowerCase().trim()] = val;
    });
    return map;
  }, [PROVINCE_TO_REGION]);

  // Group filtered branches by region (matching the web)
  const groupedByRegion = useMemo(() => {
    const groups = {};
    filteredBranches.forEach(b => {
      const provKey = (b.province || "").toLowerCase().trim();
      const region = provinceLookup[provKey]
        || (b.region ? { code: b.region, name: b.region } : null);
      if (!region) return; // Skip unmapped branches — no "Other" group
      const key = region.code;
      if (!groups[key]) groups[key] = { code: region.code, name: region.name, branches: [] };
      groups[key].branches.push(b);
    });
    // Sort by region code order (CAR first, then Region I, II, III... NCR, then XIII)
    const regionOrder = ["CAR", "Region I", "Region II", "Region III", "NCR", "Region IV-A", "Region IV-B", "Region V", "Region VI", "Region VII", "Region VIII", "Region IX", "Region X", "Region XI", "Region XII", "Region XIII"];
    return Object.values(groups).sort((a, b) => {
      const ai = regionOrder.indexOf(a.code);
      const bi = regionOrder.indexOf(b.code);
      if (ai === -1 && bi === -1) return a.code.localeCompare(b.code);
      if (ai === -1) return 1;
      if (bi === -1) return 1;
      return ai - bi;
    });
  }, [filteredBranches, PROVINCE_TO_REGION]);

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

  // Pre-populate coordinates from hardcoded data (no runtime geocoding needed)
  useEffect(() => {
    const preloaded = {};
    branchesState.forEach(branch => {
      const coords = COMMUNITY_COORDINATES[branch.location];
      preloaded[branch.id] = coords || null;
    });
    setCoordsCache(preloaded);
  }, [branchesState]);

  // Request user location on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        if (isMounted) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
        }
      } catch (error) {
        console.log("Error fetching location:", error);
      }
    })();
    return () => { isMounted = false; };
  }, []);

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
        
        if (cachedEmail) {
          if (mounted) setUserEmail(cachedEmail);
          if (cachedData?.role && mounted) setUserRole(cachedData.role);
          if (cachedData?.position && mounted) setUserPosition(cachedData.position);
        }
      } catch (e) {
        console.error("Error reading auth caching", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [route?.params?.email]);

  const branchesLinkedWithDistance = filteredBranches.map(branch => {
    let computedDistance = null;
    const cacheCoords = coordsCache[branch.id];

    if (userLocation && cacheCoords) {
      const distKm = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        cacheCoords.latitude,
        cacheCoords.longitude
      );
      computedDistance = distKm;
    }

    return {
      ...branch,
      computedDistance // null or Number
    };
  });
  
  // Find shortest valid distance
  let nearestBranchDistance = "Locating...";
  let nearestBranchName = "";
  const branchesWithValidDists = branchesLinkedWithDistance.filter(b => b.computedDistance !== null);
  if (branchesWithValidDists.length > 0) {
    const sorted = [...branchesWithValidDists].sort((a, b) => a.computedDistance - b.computedDistance);
    nearestBranchDistance = `${sorted[0].computedDistance.toFixed(1)} km`;
    nearestBranchName = sorted[0].name;
  } else if (!userLocation) {
    nearestBranchDistance = "Need GPS";
  }

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

  const handleGetDirections = useCallback((branchId, branchName, branchLocation) => {
    const coords = coordsCache[branchId];
    
    if (coords) {
      const { latitude, longitude } = coords;
      const label = encodeURIComponent(branchName);
      const url = Platform.select({
        ios: `maps:${latitude},${longitude}?q=${label}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`
      });
      
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
        }
      }).catch(err => console.error("An error occurred", err));
    } else {
      const query = encodeURIComponent(`${branchName} ${branchLocation}`);
      const url = Platform.select({
        ios: `maps:0,0?q=${query}`,
        android: `geo:0,0?q=${query}`
      });
      
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
        }
      }).catch(err => console.error("An error occurred", err));
    }
  }, [coordsCache]);

  const handleContact = useCallback((branch) => {
    Alert.alert(
      "Contact " + branch.name,
      "How would you like to get in touch?",
      [
        { text: "Call", onPress: () => Linking.openURL(`tel:${branch.phone.replace(/[^0-9+]/g, '')}`) },
        { text: "Email", onPress: () => Linking.openURL(`mailto:${branch.email}`) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  }, []);

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
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 800);
          }} tintColor="#0D1F45" colors={["#0D1F45"]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textDark }]}>Our Communities</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Find a church community near you
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.statLeft}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Communities</Text>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{filteredBranches.length}</Text>
            </View>
            <View style={[styles.statIconBox, { backgroundColor: C.blueLight }]}>
              <Image
                source={ICONS.branches}
                style={[styles.statIcon, { tintColor: C.blue }]}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.statLeft}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Nearest Community</Text>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{nearestBranchDistance}</Text>
              {nearestBranchName !== "" && (
                <Text style={{ fontSize: fs(13), color: C.blue, marginTop: 4, fontWeight: "600" }}>{nearestBranchName}</Text>
              )}
            </View>
            <View style={[styles.statIconBox, { backgroundColor: C.goldLight }]}>
              <Image
                source={ICONS.location}
                style={[styles.statIcon, { tintColor: C.gold }]}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Search Bar + Region Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { flex: 1, backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <Image
                source={ICONS.search}
                style={styles.searchIcon}
                resizeMode="contain"
              />
              <TextInput
                style={[styles.searchInput, { color: colors.textDark }]}
                placeholder="Search communities..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                selectedRegion && styles.filterBtnActive,
              ]}
              activeOpacity={0.7}
              onPress={() => setRegionModalOpen(true)}
            >
              <Ionicons
                name="filter"
                size={18}
                color={selectedRegion ? "#FFFFFF" : C.blue}
              />
            </TouchableOpacity>
          </View>
          {selectedRegion ? (
            <View style={styles.regionChipRow}>
              <View style={styles.regionChip}>
                <Text style={styles.regionChipText}>{selectedRegion}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedRegion("")}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color={C.blue} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {/* Branch Listings — Grouped by Province */}
        <View style={{ paddingHorizontal: s(18), paddingBottom: 8 }}>
          {filteredBranches.length === 0 && !loadingBranches && (
            <View style={{
              backgroundColor: colors.cardBg,
              borderRadius: 16,
              padding: s(24),
              alignItems: 'center',
              justifyContent: 'center',
              marginVertical: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}>
              <View style={{
                width: s(52),
                height: s(52),
                borderRadius: s(26),
                backgroundColor: colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name="location-outline" size={26} color={colors.textMuted} />
              </View>
              <Text style={{ color: colors.textDark, fontSize: fs(16), fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>
                No Communities Found
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fs(13), textAlign: 'center', marginBottom: 16, paddingHorizontal: 12 }}>
                {searchQuery ? `We couldn't find any communities matching "${searchQuery}".` : 'No communities are currently available in this category.'}
              </Text>
              {searchQuery ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: C.blue,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                  }}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fs(13) }}>Clear Search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Region Groups — matching web layout */}
          {groupedByRegion.map((region) => {
            const isRegionExpanded = expandedProvince === region.code;
            return (
              <View key={region.code} style={{ marginBottom: s(6) }}>
                {/* Region Row */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setExpandedProvince(isRegionExpanded ? null : region.code);
                    setExpandedBranchId(null);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.cardBg,
                    borderRadius: s(12),
                    paddingVertical: s(16),
                    paddingHorizontal: s(14),
                    borderWidth: 1,
                    borderColor: isRegionExpanded ? C.blue : colors.cardBorder,
                  }}
                >
                  {/* Region Badge */}
                  <View style={{
                    paddingHorizontal: s(10),
                    paddingVertical: s(5),
                    borderRadius: s(8),
                    borderWidth: 1.5,
                    borderColor: C.blue,
                    backgroundColor: 'transparent',
                    marginRight: s(12),
                    minWidth: s(55),
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      fontSize: fs(11),
                      fontWeight: '800',
                      color: C.blue,
                      letterSpacing: 0.3,
                    }}>{region.code}</Text>
                  </View>
                  {/* Region Name */}
                  <Text style={{
                    flex: 1,
                    fontSize: fs(15),
                    fontWeight: '700',
                    color: colors.textDark,
                  }} numberOfLines={1}>{region.name}</Text>
                  {/* Count */}
                  <Text style={{
                    fontSize: fs(15),
                    fontWeight: '600',
                    color: C.blue,
                    marginRight: s(10),
                  }}>{region.branches.length}</Text>
                  {/* Chevron */}
                  <Ionicons
                    name={isRegionExpanded ? "chevron-up" : "chevron-down"}
                    size={s(18)}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {/* Branches within Region */}
                {isRegionExpanded && (
                  <View style={{ marginTop: s(4), marginLeft: s(4), marginRight: s(4) }}>
                    {region.branches.map((branch) => {
                      const isExpanded = expandedBranchId === branch.id;
                      const dist = branchesLinkedWithDistance.find(b => b.id === branch.id)?.computedDistance;
                      return (
                        <View key={branch.id} style={[styles.branchCard, { backgroundColor: colors.cardBg, borderColor: isExpanded ? C.blue : colors.cardBorder, width: '100%', marginRight: 0 }]}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setExpandedBranchId(isExpanded ? null : branch.id)}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={[styles.branchIconBox, { backgroundColor: isExpanded ? C.blueLight : colors.bg }]}>
                                <Image source={ICONS.church} style={[styles.branchIcon, { tintColor: isExpanded ? C.blue : colors.textMuted }]} resizeMode="contain" />
                              </View>
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.branchName, { color: colors.textDark }]} numberOfLines={1}>{branch.name}</Text>
                                <Text style={{ fontSize: fs(11), color: colors.textMuted, marginTop: 1 }}>{branch.province}</Text>
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              {dist !== null && dist !== undefined && (
                                <Text style={{ fontSize: fs(11), color: C.blue, fontWeight: '600', marginBottom: 2 }}>
                                  {dist.toFixed(1)} km
                                </Text>
                              )}
                              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={s(16)} color={isExpanded ? C.blue : colors.textMuted} />
                            </View>
                          </TouchableOpacity>

                          {isExpanded && (
                            <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 14 }}>
                              <View style={styles.contactSection}>
                                <View style={styles.contactRow}>
                                  <Image source={ICONS.location} style={styles.contactIcon} resizeMode="contain" />
                                  <Text style={[styles.contactText, { color: colors.textMuted }]}>{branch.address || branch.location}</Text>
                                </View>
                                <View style={styles.contactRow}>
                                  <Image source={ICONS.phone} style={styles.contactIcon} resizeMode="contain" />
                                  <Text style={[styles.contactText, { color: colors.textMuted }]}>{branch.phone}</Text>
                                </View>
                                <View style={styles.contactRow}>
                                  <Image source={ICONS.email} style={styles.contactIcon} resizeMode="contain" />
                                  <Text style={[styles.contactText, { color: colors.textMuted }]}>{branch.email}</Text>
                                </View>
                              </View>
                              <View style={[styles.serviceTimesSection, { marginTop: 12 }]}>
                                <Text style={{ fontSize: fs(11), fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Service Times</Text>
                                {branch.serviceTimes.map((service, idx) => (
                                  <View key={idx} style={styles.serviceTimeRow}>
                                    <Text style={[styles.serviceDay, { color: idx % 2 === 0 ? C.blue : C.gold }]}>{service.day}</Text>
                                    <Text style={styles.serviceTime}>{service.time}</Text>
                                  </View>
                                ))}
                              </View>
                              <View style={{ marginTop: 14 }}>
                                <Text style={{ fontSize: fs(11), fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Community Statistics</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                  <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: s(10), borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', paddingVertical: 14 }}>
                                    <Text style={{ fontSize: fs(22), fontWeight: '800', color: C.blue }}>{branch.members || 0}</Text>
                                    <Text style={{ fontSize: fs(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Members</Text>
                                  </View>
                                  <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: s(10), borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', paddingVertical: 14 }}>
                                    <Text style={{ fontSize: fs(22), fontWeight: '800', color: C.blue }}>{branch.officers || 0}</Text>
                                    <Text style={{ fontSize: fs(10), fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Officers</Text>
                                  </View>
                                </View>
                              </View>
                              <View style={[styles.actionButtons, { marginTop: 16 }]}>
                                <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8} onPress={() => handleGetDirections(branch.id, branch.name, branch.location)}>
                                  <Text style={styles.primaryBtnText}>Get Directions</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8} onPress={() => handleContact(branch)}>
                                  <Text style={styles.secondaryBtnText}>Contact</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          {/* Region count summary */}
          {groupedByRegion.length > 0 && (
            <Text style={{ textAlign: 'center', fontSize: fs(11), color: colors.textMuted, marginTop: 6, marginBottom: 8 }}>
              {filteredBranches.length} communities across {groupedByRegion.length} regions
            </Text>
          )}
        </View>

        {/* Map Section */}
        <View style={styles.mapSection}>
          <View style={styles.mapHeaderRow}>
            <Text style={[styles.mapTitle, { color: colors.textDark }]}>Find Us on Map</Text>
            <TouchableOpacity 
              style={styles.expandMapBtn}
              onPress={() => setFullMapOpen(true)}
            >
              <Text style={styles.expandMapText}>Expand</Text>
              <Ionicons name="expand" size={16} color={C.blue} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.mapContainer}>
            <MapView
              style={styles.mapView}
              initialRegion={{
                latitude: 14.5995, // Manila center roughly
                longitude: 120.9842,
                latitudeDelta: 1.5,
                longitudeDelta: 1.5,
              }}
            >
              {filteredBranches.map((branch, index) => {
                // Wait for dynamic coords or pseudo fallback
                const coords = coordsCache[branch.id];
                const latOffset = (index % 10) * 0.05 * (index % 2 === 0 ? 1 : -1);
                const lonOffset = ((index + 3) % 10) * 0.05 * (index % 3 === 0 ? 1 : -1);
                const fallbackCoords = {
                  latitude: 14.5995 + latOffset,
                  longitude: 120.9842 + lonOffset,
                };
                
                return (
                  <Marker
                    key={branch.id}
                    coordinate={coords || fallbackCoords}
                    title={branch.name}
                    description={`Led by ${branch.leader}`}
                  />
                );
              })}
            </MapView>
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Floating draggable chat button */}
      <DraggableChatButton onPress={() => setChatbotOpen(true)} />

      <ChatbotModal visible={chatbotOpen} onClose={() => setChatbotOpen(false)} />

      {/* Region Filter Modal */}
      <Modal
        visible={regionModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRegionModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.regionModalOverlay}
          activeOpacity={1}
          onPress={() => setRegionModalOpen(false)}
        />
        <View style={[styles.regionModalContent, { backgroundColor: colors.cardBg }]}>
          <View style={styles.regionModalHandle} />
          <Text style={[styles.regionModalTitle, { color: colors.textDark }]}>Filter by Region</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.regionModalItem,
                !selectedRegion && styles.regionModalItemActive,
              ]}
              activeOpacity={0.6}
              onPress={() => {
                setSelectedRegion("");
                setRegionModalOpen(false);
              }}
            >
              <Text
                style={[
                  styles.regionModalItemText,
                  !selectedRegion && styles.regionModalItemTextActive,
                ]}
              >
                All Regions
              </Text>
              {!selectedRegion && <Text style={styles.regionModalCheck}>✓</Text>}
            </TouchableOpacity>
            {REGIONS.map((region) => (
              <TouchableOpacity
                key={region}
                style={[
                  styles.regionModalItem,
                  selectedRegion === region && styles.regionModalItemActive,
                ]}
                activeOpacity={0.6}
                onPress={() => {
                  setSelectedRegion(region);
                  setRegionModalOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.regionModalItemText,
                    selectedRegion === region && styles.regionModalItemTextActive,
                  ]}
                >
                  {region}
                </Text>
                {selectedRegion === region && (
                  <Text style={styles.regionModalCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Floating Bottom Tab Bar */}
      <FloatingNavBar
        activeTab="Branches"
        navigation={navigation}
        userEmail={userEmail}
        userRole={userRole}
      />

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
            const isActive = activeTab === item.key;

            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
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
                    { tintColor: isActive ? C.blue : C.textMuted },
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

      {/* Weekly Services Modal */}
      <Modal
        visible={weeklyServicesOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWeeklyServicesOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.weeklyModalContainer}>
            <View style={styles.weeklyModalHeader}>
              <Text style={styles.weeklyModalTitle}>Weekly Services</Text>
              <TouchableOpacity
                style={styles.weeklyModalClose}
                onPress={() => setWeeklyServicesOpen(false)}
              >
                <Text style={styles.weeklyModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { marginHorizontal: s(18), marginBottom: s(12), marginTop: 8 }]}>
              <Image source={ICONS.search} style={styles.searchIcon} resizeMode="contain" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search branch..."
                placeholderTextColor={C.textMuted}
                value={weeklySearchQuery}
                onChangeText={setWeeklySearchQuery}
              />
            </View>

            <ScrollView style={styles.weeklyModalScroll} showsVerticalScrollIndicator={false}>
              {filteredWeeklyBranches.map((branch) => (
                <View key={branch.id} style={styles.weeklyCard}>
                  <Text style={styles.weeklyCardTitle}>{branch.location}</Text>
                  <View style={styles.weeklyDivider} />
                  {branch.serviceTimes.map((service, idx) => (
                    <View key={idx} style={styles.serviceTimeRow}>
                      <Text style={styles.serviceDay}>{service.day}</Text>
                      <Text style={styles.serviceTime}>{service.time}</Text>
                    </View>
                  ))}
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Screen Map Modal */}
      <Modal
        visible={fullMapOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setFullMapOpen(false)}
      >
        <View style={styles.fullMapContainer}>
          <MapView
            style={styles.fullMapView}
            initialRegion={{
              latitude: 14.5995, // Manila center roughly
              longitude: 120.9842,
              latitudeDelta: 1.5,
              longitudeDelta: 1.5,
            }}
          >
            {filteredBranches.map((branch, index) => {
              const coords = coordsCache[branch.id];
              const latOffset = (index % 10) * 0.05 * (index % 2 === 0 ? 1 : -1);
              const lonOffset = ((index + 3) % 10) * 0.05 * (index % 3 === 0 ? 1 : -1);
              const fallbackCoords = {
                latitude: 14.5995 + latOffset,
                longitude: 120.9842 + lonOffset,
              };
              
              return (
                <Marker
                  key={`fs-${branch.id}`}
                  coordinate={coords || fallbackCoords}
                  title={branch.name}
                  description={`Led by ${branch.leader}`}
                />
              );
            })}
          </MapView>
          
          <TouchableOpacity 
            style={styles.closeFullMapBtn}
            onPress={() => setFullMapOpen(false)}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>

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
            <Text style={styles.confirmTitle}>Sign Out</Text>
            <Text style={styles.confirmMessage}>
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
    paddingBottom: s(16),
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
    fontWeight: "500",
  },

  // Search Bar
  searchSection: {
    paddingHorizontal: s(18),
    marginBottom: s(16),
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
  },
  filterBtn: {
    width: s(48),
    height: s(48),
    borderRadius: s(14),
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  filterBtnActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  regionChipRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  regionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46,107,240,0.1)",
    borderRadius: s(20),
    paddingVertical: 6,
    paddingHorizontal: s(12),
    gap: s(6),
  },
  regionChipText: {
    fontSize: fs(13),
    fontWeight: "600",
    color: C.blue,
  },
  regionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  regionModalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "55%",
    backgroundColor: C.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: s(20),
    paddingHorizontal: s(20),
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  regionModalHandle: {
    width: s(40),
    height: s(4),
    borderRadius: 2,
    backgroundColor: C.cardBorder,
    alignSelf: "center",
    marginBottom: s(16),
  },
  regionModalTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(16),
    textAlign: "center",
  },
  regionModalItem: {
    paddingVertical: s(14),
    paddingHorizontal: s(16),
    borderRadius: s(10),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  regionModalItemActive: {
    backgroundColor: "rgba(46,107,240,0.1)",
  },
  regionModalItemText: {
    fontSize: fs(15),
    color: C.textDark,
  },
  regionModalItemTextActive: {
    color: C.blue,
    fontWeight: "600",
  },
  regionModalCheck: {
    fontSize: fs(16),
    color: C.blue,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: s(14),
    paddingHorizontal: s(14),
    height: s(48),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    width: s(20),
    height: s(20),
    tintColor: C.textMuted,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: fs(14),
    color: C.textDark,
  },

  // Stats
  statsContainer: {
    paddingHorizontal: s(18),
    gap: s(12),
    marginBottom: s(20),
  },
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
  statLabel: {
    fontSize: fs(13),
    color: C.textMuted,
    marginBottom: s(6),
    fontWeight: "600",
  },
  statValue: { fontSize: fs(26), fontWeight: "700", color: C.textDark },
  statIconBox: {
    width: s(46),
    height: s(46),
    borderRadius: s(14),
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: { width: s(22), height: 22 },

  // Branch Card
  branchCard: {
    backgroundColor: C.cardBg,
    marginRight: 16,
    borderRadius: s(18),
    padding: s(20),
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  branchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: s(16),
    paddingBottom: s(16),
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  branchHeaderLeft: { flex: 1 },

  branchNameRow: {
    flexDirection: "row",
    gap: s(12),
    alignItems: "center",
    marginBottom: s(10),
  },
  branchIconBox: {
    width: s(44),
    height: s(44),
    borderRadius: s(14),
    backgroundColor: C.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  branchIcon: { width: s(22), height: s(22), tintColor: C.blue },

  branchName: {
    fontSize: fs(18),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 2,
  },
  branchLeader: { fontSize: fs(13), color: C.textMuted, fontWeight: "600" },

  distanceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  distanceIcon: { width: 14, height: 14, tintColor: C.blue },
  distanceText: { fontSize: fs(13), color: C.blue, fontWeight: "600" },

  membersBox: {
    backgroundColor: C.blueLight,
    borderRadius: s(14),
    paddingVertical: s(10),
    paddingHorizontal: s(14),
    alignItems: "center",
    minWidth: 76,
  },
  membersCount: {
    fontSize: fs(18),
    fontWeight: "700",
    color: C.blue,
    marginBottom: 2,
  },
  membersLabel: { fontSize: fs(11), color: C.blue, fontWeight: "700" },

  // Contact
  contactSection: {
    gap: s(10),
    marginBottom: s(16),
    paddingBottom: s(16),
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactIcon: { width: s(18), height: s(18), tintColor: C.textMuted },
  contactText: { fontSize: fs(14), color: C.textDark, flex: 1, fontWeight: "600" },

  // Service Times
  serviceTimesSection: { marginBottom: 16 },
  serviceTimesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: s(12),
  },
  serviceTimesIcon: { width: s(18), height: s(18), tintColor: C.textDark },
  serviceTimesTitle: { fontSize: fs(16), fontWeight: "700", color: C.textDark },

  serviceTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: s(10),
    paddingHorizontal: s(12),
    backgroundColor: C.inputBg,
    borderRadius: s(10),
    marginBottom: s(8),
  },
  serviceDay: { fontSize: fs(14), color: C.textDark, fontWeight: "700" },
  serviceTime: { fontSize: fs(13), color: C.textMuted, fontWeight: "600" },

  // Buttons
  actionButtons: { flexDirection: "row", gap: 10 },
  primaryBtn: {
    flex: 1,
    backgroundColor: C.blue,
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: { fontSize: fs(14), fontWeight: "700", color: "#FFFFFF" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: C.cardBg,
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  secondaryBtnText: { fontSize: fs(14), fontWeight: "700", color: C.textDark },

  // Map
  mapSection: {
    backgroundColor: C.cardBg,
    marginHorizontal: s(18),
    borderRadius: s(18),
    padding: s(20),
    marginBottom: s(20),
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  mapHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: s(14),
  },
  mapTitle: { fontSize: fs(18), fontWeight: "700", color: C.textDark },
  expandMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.blueLight,
    paddingHorizontal: s(12),
    paddingVertical: 6,
    borderRadius: s(16),
    gap: 4,
  },
  expandMapText: {
    fontSize: fs(13),
    fontWeight: "700",
    color: C.blue,
  },
  mapContainer: {
    height: 250,
    borderRadius: s(14),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  mapView: {
    width: "100%",
    height: "100%",
  },

  // Full Screen Map Modal
  fullMapContainer: {
    flex: 1,
    backgroundColor: C.bg,
  },
  fullMapView: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  closeFullMapBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: 20,
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

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
  sidebarTitle: { fontSize: fs(18), fontWeight: "900", color: "#FFF" },
  sidebarRole: { fontSize: fs(12), color: "#FFF", marginTop: 1, fontWeight: "800" },

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
  sidebarUserName: { fontSize: fs(14), fontWeight: "900", color: "#FFF" },
  sidebarUserEmail: {
    fontSize: fs(11),
    color: C.textMuted,
    marginTop: 1,
    fontWeight: "800",
  },
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
    paddingVertical: 6,
  },
  signOutIcon: { width: 30, height: s(40), tintColor: C.red },
  signOutText: { fontSize: fs(14), color: C.red, fontWeight: "900" },

  // Weekly Services Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: s(18),
  },
  weeklyModalContainer: {
    backgroundColor: C.cardBg,
    width: "100%",
    maxHeight: "80%",
    borderRadius: s(20),
    paddingTop: s(20),
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  weeklyModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: s(20),
    marginBottom: s(10),
  },
  weeklyModalTitle: {
    fontSize: fs(20),
    fontWeight: "700",
    color: C.textDark,
  },
  weeklyModalClose: {
    padding: 8,
    backgroundColor: C.bg,
    borderRadius: s(20),
  },
  weeklyModalCloseText: {
    fontSize: fs(14),
    fontWeight: "800",
    color: C.textMuted,
  },
  weeklyModalScroll: {
    paddingHorizontal: s(20),
  },
  weeklyCard: {
    backgroundColor: C.bg,
    padding: s(16),
    borderRadius: s(14),
    marginBottom: s(12),
  },
  weeklyCardTitle: {
    fontSize: fs(16),
    fontWeight: "700",
    color: C.textDark,
    marginBottom: s(8),
  },
  weeklyDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginBottom: s(10),
  },

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




