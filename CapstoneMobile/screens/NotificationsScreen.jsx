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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../components/ThemeContext";
import { getNotificationsFeed, getReadNotificationIds, markNotificationsRead } from "../services/AuthService";
import * as Notifications from 'expo-notifications';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ICONS = {
  back: require("../assets/icons/close.png"),
  loans: require("../assets/icons/loans.png"),
  heart: require("../assets/icons/heart.png"),
  branches: require("../assets/icons/branches.png"),
  document: require("../assets/icons/document.png"),
  bell: require("../assets/icons/bell.png"),
  wallet: require("../assets/icons/wallet.png"),
  attendance: require("../assets/icons/attendance.png"),
  logo: require("../assets/puac_logo.png"),
};

const TABS = ["All", "Transactions", "Announcements", "Loan Updates"];

/**
 * Map a raw feed item from the web backend into a unified notification object.
 * Each array in the feed (loans, donations, savings, attendance, announcements) 
 * has different field shapes — we normalize them here.
 */
function mapFeedItems(feed, readIds) {
  const readSet = new Set(readIds || []);
  const items = [];

  // ── Loans ───────────────────────────────────────────────────────
  (feed.loans || []).forEach((loan) => {
    const id = `loan-${loan._id || loan.loanId}`;
    items.push({
      id,
      category: "loan",
      title: `Loan ${loan.status ? loan.status.charAt(0).toUpperCase() + loan.status.slice(1) : "Update"}`,
      message: `Your ${loan.loanType || "loan"} of ₱${(loan.amount || 0).toLocaleString()} is ${loan.status || "updated"}.`,
      time: formatTime(loan.updatedAt || loan.createdAt || loan.appliedDate),
      read: readSet.has(id),
      raw: loan,
    });
  });

  // ── Loan Payments ───────────────────────────────────────────────
  (feed.payments || []).forEach((payment) => {
    const id = `payment-${payment._id}`;
    items.push({
      id,
      category: "transaction",
      title: "Loan Payment Recorded",
      message: `Payment of ₱${(payment.amount || 0).toLocaleString()} for your loan has been recorded.`,
      time: formatTime(payment.createdAt || payment.date),
      read: readSet.has(id),
      raw: payment,
    });
  });

  // ── Donations ───────────────────────────────────────────────────
  (feed.donations || []).forEach((donation) => {
    const id = `donation-${donation._id || donation.donationId}`;
    const statusLabel = donation.status === "confirmed" ? "Confirmed ✅" : donation.status === "rejected" ? "Rejected ❌" : "Pending ⏳";
    items.push({
      id,
      category: "transaction",
      title: `Donation ${statusLabel}`,
      message: `Your ${donation.category || "donation"} of ₱${(donation.amount || 0).toLocaleString()} is ${donation.status || "pending"}.`,
      time: formatTime(donation.createdAt || donation.date),
      read: readSet.has(id),
      raw: donation,
    });
  });

  // ── Savings ─────────────────────────────────────────────────────
  (feed.savings || []).forEach((txn) => {
    const id = `savings-${txn._id}`;
    const typeLabel = txn.type === "withdrawal" ? "Withdrawal" : "Deposit";
    items.push({
      id,
      category: "transaction",
      title: `Savings ${typeLabel}`,
      message: `₱${(txn.amount || 0).toLocaleString()} ${typeLabel.toLowerCase()} — ${txn.status || "pending"}.`,
      time: formatTime(txn.createdAt || txn.date),
      read: readSet.has(id),
      raw: txn,
    });
  });

  // ── Attendance ──────────────────────────────────────────────────
  (feed.attendance || []).forEach((att) => {
    const id = `attendance-${att._id}`;
    items.push({
      id,
      category: "transaction",
      title: "Attendance Recorded",
      message: `Check-in recorded on ${formatTime(att.date || att.createdAt)}.`,
      time: formatTime(att.date || att.createdAt),
      read: readSet.has(id),
      raw: att,
    });
  });

  // ── Announcements ────────────────────────────────────────────────
  (feed.announcements || []).forEach((ann) => {
    const id = `announcement-${ann._id}`;
    items.push({
      id,
      category: "announcement",
      title: ann.title || "Church Announcement",
      message: ann.content || ann.body || ann.message || "",
      time: formatTime(ann.createdAt || ann.date),
      read: readSet.has(id),
      raw: ann,
    });
  });

  // Sort newest first
  items.sort((a, b) => {
    const da = a.raw?.updatedAt || a.raw?.createdAt || a.raw?.date || 0;
    const db = b.raw?.updatedAt || b.raw?.createdAt || b.raw?.date || 0;
    return new Date(db) - new Date(da);
  });

  return items;
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Legacy helper — kept for backward compatibility with addNotification calls from other screens
export const addNotification = async (userEmail, category, title, message) => {
  if (!userEmail) return;
  try {
    // Trigger OS-level local push notification
    await Notifications.scheduleNotificationAsync({
      content: { title, body: message, data: { category } },
      trigger: null,
    }).catch(() => {});
  } catch (e) {
    console.log("Local push failed:", e);
  }
};

export default function NotificationsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [activeTab, setActiveTab] = useState("All");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const tabWidth = SCREEN_WIDTH / TABS.length;

  // Resolve user email
  useEffect(() => {
    (async () => {
      let email = route?.params?.email;
      if (!email) {
        try {
          const c = await AsyncStorage.getItem("faithly_user");
          email = JSON.parse(c || "{}")?.email || "";
        } catch {
          email = "";
        }
      }
      setUserEmail(typeof email === "string" ? email.toLowerCase() : "");
    })();
  }, [route?.params?.email]);

  // Load notifications from web API — uses JWT token, not email
  const loadNotifications = useCallback(async () => {
    try {
      const [feed, readIds] = await Promise.all([
        getNotificationsFeed(),
        getReadNotificationIds(),
      ]);
      const mapped = mapFeedItems(feed, readIds);
      setNotifications(mapped);
    } catch (e) {
      console.error("Failed to load notifications:", e.message);
      // Fallback: load from AsyncStorage cache
      try {
        const key = `faithly_notifications_${userEmail}`;
        const savedData = await AsyncStorage.getItem(key);
        if (savedData) setNotifications(JSON.parse(savedData));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Load on mount immediately (JWT-based, doesn't need email)
  useEffect(() => { loadNotifications(); }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  useEffect(() => {
    const idx = TABS.indexOf(activeTab);
    Animated.spring(tabIndicatorX, {
      toValue: idx * tabWidth,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabIndicatorX, tabWidth]);

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "All") return true;
    if (activeTab === "Transactions") return n.category === "transaction";
    if (activeTab === "Announcements") return n.category === "announcement";
    if (activeTab === "Loan Updates") return n.category === "loan";
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notif) => {
    if (notif.read) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    // Persist to server
    await markNotificationsRead([notif.id]);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await markNotificationsRead(unreadIds);
  };

  const getIconForCategory = (category) => {
    switch (category) {
      case "transaction":
        return { icon: ICONS.heart, color: C.green, bg: C.greenLight };
      case "announcement":
        return { icon: ICONS.branches, color: C.purple, bg: C.purpleLight };
      case "loan":
        return { icon: ICONS.loans, color: C.blue, bg: C.blueLight };
      default:
        return { icon: ICONS.bell, color: C.orange, bg: C.orangeLight };
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: "transparent" }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={{ color: C.blue, fontWeight: "600", fontSize: 12, paddingRight: 4 }}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.topSpacer} />}
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: "transparent" }]}>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              width: tabWidth,
              transform: [{ translateX: tabIndicatorX }],
            },
          ]}
        />
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadNotifications();
              setRefreshing(false);
            }}
            tintColor="#0D1F45"
            colors={["#0D1F45"]}
          />
        }
      >
        {loading ? (
          <View style={{ paddingTop: 80, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0D1F45" />
            <Text style={{ marginTop: 12, color: colors.textMuted, fontSize: 14 }}>Loading notifications…</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Image
                source={ICONS.bell}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No Notifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {activeTab === "All"
                ? "You're all caught up! New notifications will appear here."
                : `No ${activeTab.toLowerCase()} notifications yet.`}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notif, idx) => {
            const iconData = getIconForCategory(notif.category);
            return (
              <TouchableOpacity
                key={notif.id || idx}
                activeOpacity={0.7}
                style={[
                  styles.notifCard,
                  { backgroundColor: colors.cardBg },
                  !notif.read && styles.notifCardUnread,
                ]}
                onPress={() => handleMarkRead(notif)}
              >
                <View
                  style={[
                    styles.notifIconBox,
                    { backgroundColor: iconData.bg },
                  ]}
                >
                  <Image
                    source={iconData.icon}
                    style={[styles.notifIcon, { tintColor: iconData.color }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, { color: colors.textDark }]}>{notif.title}</Text>
                  <Text style={[styles.notifMessage, { color: colors.textMuted }]}>{notif.message}</Text>
                  <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                {!notif.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  backArrow: {
    fontSize: 22,
    color: C.textDark,
    fontWeight: "600",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "500",
    color: C.textDark,
  },
  topSpacer: { width: 34 },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.navBg,
    paddingBottom: 0,
    position: "relative",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    backgroundColor: "#0D1F45",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(46,107,240,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    tintColor: "#0D1F45",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },

  // Notification Card
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  notifCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: "#0D1F45",
  },
  notifIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  notifIcon: {
    width: 20,
    height: 20,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 11,
    color: "#8B96A8",
    fontWeight: "500",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0D1F45",
    marginTop: 6,
    marginLeft: 8,
  },
});

