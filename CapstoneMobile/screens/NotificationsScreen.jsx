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
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../components/ThemeContext";
import { getNotificationsFeed, getReadNotificationIds, markNotificationsRead } from "../services/AuthService";
import * as Notifications from 'expo-notifications';
import OfflineBanner from "../components/OfflineBanner";
import { SkeletonBlock, SkeletonLine, SkeletonAvatar } from "../components/SkeletonLoader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const _WR = Math.min(SCREEN_WIDTH / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));

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
  const [userRole, setUserRole] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const tabWidth = SCREEN_WIDTH / TABS.length;

  // Resolve user email & role
  useEffect(() => {
    (async () => {
      let email = route?.params?.email;
      let role = route?.params?.role || "";
      try {
        const c = await AsyncStorage.getItem("faithly_user");
        const parsed = JSON.parse(c || "{}");
        if (!email) email = parsed?.email || "";
        if (!role) role = parsed?.role || "";
      } catch {
        email = email || "";
      }
      setUserEmail(typeof email === "string" ? email.toLowerCase() : "");
      setUserRole(role || "");
    })();
  }, [route?.params?.email, route?.params?.role]);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const [selectedNotif, setSelectedNotif] = useState(null);

  const handleMarkRead = async (notif) => {
    if (notif.read) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    // Persist to server
    await markNotificationsRead([notif.id]);
  };

  const handleOpenNotification = (notif) => {
    handleMarkRead(notif);
    setSelectedNotif(notif);
  };

  const getNavigationScreenForNotif = (notif) => {
    if (!notif) return null;
    if (notif.category === "loan") return "Loans";
    if (notif.id?.startsWith("donation")) return "Donations";
    if (notif.id?.startsWith("savings")) return "Savings";
    if (notif.category === "announcement") return "Announcements";
    if (notif.id?.startsWith("attendance")) return "Branch";
    return null;
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
      <OfflineBanner />
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: "transparent" }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={{ color: C.blue, fontWeight: "600", fontSize: 12, paddingRight: 4 }}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.topSpacer} />}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
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
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.tabText,
                  { color: isActive ? C.blue : colors.textMuted },
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              width: tabWidth,
              backgroundColor: C.blue,
              transform: [{ translateX: tabIndicatorX }],
            },
          ]}
        />
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
          <View style={{ paddingTop: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[
                styles.notifCard,
                { backgroundColor: colors.cardBg }
              ]}>
                <SkeletonAvatar size={s(42)} style={{ marginRight: s(14) }} />
                <View style={{ flex: 1 }}>
                  <SkeletonLine width="60%" height={14} style={{ marginBottom: 6 }} />
                  <SkeletonLine width="90%" height={12} style={{ marginBottom: 6 }} />
                  <SkeletonLine width="30%" height={10} />
                </View>
              </View>
            ))}
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
                onPress={() => handleOpenNotification(notif)}
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

      {/* Notification Detail Modal */}
      <Modal
        visible={!!selectedNotif}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedNotif(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedNotif(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            alignItems: "center",
            padding: 18,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation && e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 380,
              maxHeight: "85%",
              backgroundColor: colors.cardBg,
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View
                style={{
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: getIconForCategory(selectedNotif?.category).bg,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: getIconForCategory(selectedNotif?.category).color,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  {selectedNotif?.category || "Notification"}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setSelectedNotif(null)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
              {/* Title & Time */}
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.textDark, marginBottom: 4 }}>
                {selectedNotif?.title}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
                {selectedNotif?.time}
              </Text>

              {/* Message Box */}
              <View
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 14, color: colors.textDark, lineHeight: 21 }}>
                  {selectedNotif?.message}
                </Text>
              </View>

              {/* Additional Information Breakdown */}
              {selectedNotif?.raw && (
                <View
                  style={{
                    backgroundColor: colors.bg,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    marginBottom: 18,
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4 }}>
                    DETAILS BREAKDOWN
                  </Text>

                  {selectedNotif.raw.amount !== undefined && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12.5, color: colors.textMuted }}>Amount:</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textDark }}>
                        ₱{Number(selectedNotif.raw.amount || 0).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {selectedNotif.raw.status && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12.5, color: colors.textMuted }}>Status:</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.blue, textTransform: "capitalize" }}>
                        {selectedNotif.raw.status}
                      </Text>
                    </View>
                  )}

                  {selectedNotif.raw.loanType && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12.5, color: colors.textMuted }}>Loan Type:</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textDark }}>
                        {selectedNotif.raw.loanType}
                      </Text>
                    </View>
                  )}

                  {selectedNotif.raw.category && selectedNotif.category !== "announcement" && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12.5, color: colors.textMuted }}>Category:</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textDark }}>
                        {selectedNotif.raw.category}
                      </Text>
                    </View>
                  )}

                  {selectedNotif.raw.location && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12.5, color: colors.textMuted }}>Location:</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textDark }}>
                        {selectedNotif.raw.location}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={{ gap: 10 }}>
                {getNavigationScreenForNotif(selectedNotif) && (
                  <TouchableOpacity
                    onPress={() => {
                      const targetScreen = getNavigationScreenForNotif(selectedNotif);
                      setSelectedNotif(null);
                      if (targetScreen) navigation.replace(targetScreen, { email: userEmail });
                    }}
                    activeOpacity={0.8}
                    style={{
                      width: "100%",
                      backgroundColor: C.blue || "#0D1F45",
                      paddingVertical: 13,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>View Details & Manage →</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setSelectedNotif(null)}
                  activeOpacity={0.7}
                  style={{
                    width: "100%",
                    backgroundColor: colors.bg,
                    paddingVertical: 12,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textDark }}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingTop: Platform.OS === "ios" ? s(56) : s(42),
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
    backgroundColor: C.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder || "rgba(0,0,0,0.06)",
    position: "relative",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: fs(11),
    fontWeight: "600",
    color: C.textMuted,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: C.blue,
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    backgroundColor: C.blue,
    borderRadius: 1.5,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: s(18), paddingTop: s(12), paddingBottom: s(24) },

  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: s(16),
    borderRadius: s(16),
    marginBottom: s(12),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  notifCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: C.blue,
  },
  notifIconBox: {
    width: s(42),
    height: s(42),
    borderRadius: s(21),
    alignItems: "center",
    justifyContent: "center",
    marginRight: s(14),
  },
  notifIcon: {
    width: s(20),
    height: s(20),
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: fs(15),
    fontWeight: "700",
    marginBottom: s(2),
  },
  notifMessage: {
    fontSize: fs(13),
    marginBottom: s(6),
  },
  notifTime: {
    fontSize: fs(11),
    color: "#94A3B8",
  },
  unreadDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: C.blue,
    marginLeft: s(8),
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: s(80),
  },
  emptyIconBox: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: s(16),
  },
  emptyIcon: {
    width: s(36),
    height: s(36),
    tintColor: "#94A3B8",
  },
  emptyTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    marginBottom: s(6),
  },
  emptySubtitle: {
    fontSize: fs(14),
    textAlign: "center",
    paddingHorizontal: s(32),
  },
});