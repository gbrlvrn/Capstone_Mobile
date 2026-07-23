import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useTheme } from "./ThemeContext";

/**
 * ReceiptModal — Professional transaction receipt that appears after a loan or donation submission.
 *
 * Props:
 *   visible      – boolean
 *   onClose      – callback
 *   type         – "loan" | "donation"
 *   data         – object with relevant fields:
 *     Loan:     { id, type, amount, monthsToPay, monthlyPayment, totalRepayment, interestRate, status }
 *     Donation: { id, fund, community, amount, method, status, date }
 */
export default function ReceiptModal({ visible, onClose, type = "loan", data = {} }) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 90, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const isLoan = type === "loan";
  const accentColor = isLoan ? "#0D1F45" : "#0D1F45";
  const iconName = isLoan ? "document-text" : "heart";
  const title = isLoan ? "Loan Application Submitted" : "Donation Successful";
  const subtitle = isLoan
    ? "Your loan application has been submitted for review."
    : "Thank you so much for your generous donation! Your contribution will be a very big help to our community.";

  const formatCurrency = (val) => {
    const n = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
    return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loanRows = [
    { label: "Reference ID", value: data.id || "—" },
    { label: "Loan Type", value: data.type || "—" },
    { label: "Amount", value: formatCurrency(data.amount), bold: true },
    { label: "Term", value: data.monthsToPay ? `${data.monthsToPay} months` : "—" },
    { label: "Interest Rate", value: data.interestRate ? `${(data.interestRate * 100).toFixed(1).replace(/\.0$/, "")}%` : "3%" },
    { label: "Monthly Payment", value: formatCurrency(data.monthlyPayment) },
    { label: "Total Repayment", value: formatCurrency(data.totalRepayment), bold: true },
    { label: "Status", value: data.status || "Pending", isStatus: true },
  ];

  const donationRows = [
    { label: "Reference ID", value: data.id || "—" },
    { label: "Fund", value: data.fund || "—" },
    { label: "Community", value: data.community || "—" },
    { label: "Amount", value: typeof data.amount === "string" ? data.amount : formatCurrency(data.amount), bold: true },
    { label: "Payment Method", value: data.method || "—" },
    { label: "Type", value: data.status || "One-time" },
    { label: "Date", value: data.date || new Date().toLocaleDateString() },
  ];

  const rows = isLoan ? loanRows : donationRows;

  const handleShare = async () => {
    try {
      setSharing(true);
      const uri = await viewShotRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `${isLoan ? "Loan" : "Donation"} Receipt`,
        });
      } else {
        Alert.alert("Sharing Not Available", "Sharing is not supported on this device.");
      }
    } catch (err) {
      console.log("Share error:", err);
      Alert.alert("Error", "Failed to share receipt. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1.0, result: "tmpfile" }}>
            <View style={[styles.captureArea, { backgroundColor: colors.cardBg }]}>
              {/* Header */}
              <View style={[styles.header, { backgroundColor: accentColor }]}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name={iconName} size={28} color={accentColor} />
                </View>
                <Text style={styles.headerTitle}>{title}</Text>
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              </View>

              {/* Dashed separator */}
              <View style={[styles.dashedLine, { backgroundColor: colors.cardBg }]}>
                {Array.from({ length: 30 }).map((_, i) => (
                  <View key={i} style={[styles.dash, { backgroundColor: colors.divider }]} />
                ))}
              </View>

              {/* Receipt rows */}
              <View style={styles.body}>
                {rows.map((row, idx) => (
                  <View key={idx} style={[styles.row, { borderBottomColor: colors.divider }, idx === rows.length - 1 && styles.rowLast]}>
                    <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{row.label}</Text>
                    {row.isStatus ? (
                      <View style={[styles.statusPill, { backgroundColor: `${accentColor}15` }]}>
                        <Text style={[styles.statusText, { color: accentColor }]}>{row.value}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.rowValue, { color: colors.textDark }, row.bold && styles.rowValueBold]}>{row.value}</Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Branding footer inside capture */}
              <View style={[styles.brandingFooter, { backgroundColor: colors.bg }]}>
                <Text style={[styles.brandingText, { color: colors.textDimmed }]}>FaithLy • {new Date().toLocaleDateString()}</Text>
              </View>
            </View>
          </ViewShot>

          {/* Action buttons (outside capture area) */}
          <View style={[styles.actionRow, { backgroundColor: colors.cardBg }]}>
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: accentColor }]}
              activeOpacity={0.85}
              onPress={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color={accentColor} size="small" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color={accentColor} />
                  <Text style={[styles.shareBtnText, { color: accentColor }]}>Share</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: accentColor, flex: 1 }]}
              activeOpacity={0.85}
              onPress={onClose}
            >
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  captureArea: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  headerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 18,
  },
  dashedLine: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 0,
    backgroundColor: "#FFFFFF",
  },
  dash: {
    width: 8,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 2,
    borderRadius: 1,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 13.5,
    color: "#6B7FA3",
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 13.5,
    color: "#1A2744",
    fontWeight: "500",
    textAlign: "right",
    maxWidth: "55%",
  },
  rowValueBold: {
    fontWeight: "700",
    fontSize: 14.5,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  brandingFooter: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#F8F9FB",
  },
  brandingText: {
    fontSize: 11,
    color: "#A0AEC0",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  closeBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
