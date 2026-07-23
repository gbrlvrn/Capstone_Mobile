import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../components/ThemeContext";
import { resetPassword } from "../services/OtpService";

export default function NewPasswordScreen({ navigation, route }) {
  const { email, otp } = route.params || {};
  const { colors: C } = useTheme();
  const styles = useMemo(() => getStyles(C), [C]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── Password strength ── */
  const strength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  }, [newPassword]);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#EF4444", "#F59E0B", "#3B82F6", "#22C55E"][strength];

  const handleReset = async () => {
    if (loading) return;
    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await resetPassword(email, otp, newPassword);

      // Navigate to Login, replacing the reset stack
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Login",
            params: { passwordResetSuccess: true },
          },
        ],
      });
    } catch (err) {
      setError(err?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.circleTopRight} />
          <View style={styles.circleBottomLeft} />

          <SafeAreaView edges={["top"]} style={{ width: "100%" }}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.6}
            >
              <Text style={[styles.backText, { color: C.textMuted }]}>← Back</Text>
            </TouchableOpacity>
          </SafeAreaView>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🔑</Text>
          </View>

          <View style={styles.card}>
            <Text style={[styles.title, { color: C.textDark }]}>Set New Password</Text>
            <Text style={[styles.subtitle, { color: C.textMuted }]}>
              Choose a strong password for your account.
            </Text>

            {/* New Password */}
            <Text style={[styles.label, { color: C.textDark }]}>New Password</Text>
            <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.inputBorder }]}>
              <Image
                source={require("../assets/icons/lock.png")}
                style={styles.inputIcon}
                resizeMode="contain"
              />
              <TextInput
                style={[styles.input, { color: C.inputText, flex: 1 }]}
                placeholder="Enter new password"
                placeholderTextColor={C.placeholderText}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); if (error) setError(""); }}
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={{ padding: 4 }}>
                <Image
                  source={
                    showNew
                      ? require("../assets/icons/eye-open.png")
                      : require("../assets/icons/eye-closed.png")
                  }
                  style={[styles.inputIcon, { tintColor: C.textDimmed }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBarRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: i <= strength ? strengthColor : "#E2E8F0" },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                  {strengthLabel}
                </Text>
              </View>
            )}

            {/* Confirm Password */}
            <Text style={[styles.label, { color: C.textDark, marginTop: 10 }]}>Confirm Password</Text>
            <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.inputBorder }]}>
              <Image
                source={require("../assets/icons/lock.png")}
                style={styles.inputIcon}
                resizeMode="contain"
              />
              <TextInput
                style={[styles.input, { color: C.inputText, flex: 1 }]}
                placeholder="Confirm your new password"
                placeholderTextColor={C.placeholderText}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (error) setError(""); }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ padding: 4 }}>
                <Image
                  source={
                    showConfirm
                      ? require("../assets/icons/eye-open.png")
                      : require("../assets/icons/eye-closed.png")
                  }
                  style={[styles.inputIcon, { tintColor: C.textDimmed }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <Text
                style={[
                  styles.matchText,
                  { color: newPassword === confirmPassword ? "#22C55E" : "#EF4444" },
                ]}
              >
                {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </Text>
            )}

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.resetBtn, loading && { opacity: 0.75 }]}
              onPress={handleReset}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.resetBtnText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            {/* Requirements hint */}
            <View style={styles.hintBox}>
              <Text style={[styles.hintTitle, { color: C.textMuted }]}>Password requirements:</Text>
              {[
                "At least 6 characters",
                "One uppercase letter (recommended)",
                "One number (recommended)",
                "One special character (recommended)",
              ].map((h) => (
                <Text key={h} style={[styles.hintItem, { color: C.textMuted }]}>
                  · {h}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const getStyles = (C) =>
  StyleSheet.create({
    screen: {
      flexGrow: 1,
      backgroundColor: C.bg,
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 40,
    },
    circleTopRight: {
      position: "absolute", top: -80, right: -80,
      width: 280, height: 280, borderRadius: 140,
      backgroundColor: "#0D1F45", opacity: 0.04,
    },
    circleBottomLeft: {
      position: "absolute", bottom: -80, left: -80,
      width: 300, height: 300, borderRadius: 150,
      backgroundColor: "#F0C040", opacity: 0.05,
    },
    backBtn: { alignSelf: "flex-start", paddingVertical: 4, marginBottom: 16 },
    backText: { fontSize: 16, fontWeight: "600" },

    iconCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: "#0D1F45",
      alignItems: "center", justifyContent: "center",
      marginBottom: 24,
      shadowColor: "#0D1F45",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    iconEmoji: { fontSize: 34 },

    card: {
      width: "100%",
      backgroundColor: C.cardBg,
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 28,
      alignItems: "center",
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 6,
      borderWidth: 1,
      borderColor: "#F1F5F9",
    },
    title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, marginBottom: 8 },
    subtitle: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 20 },

    label: { alignSelf: "flex-start", fontSize: 13, fontWeight: "600", marginBottom: 6 },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 8,
    },
    inputIcon: { width: 20, height: 20, tintColor: "#64748B" },
    input: { flex: 1, fontSize: 15, marginLeft: 10 },

    strengthWrap: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      gap: 8,
      marginBottom: 4,
    },
    strengthBarRow: { flexDirection: "row", gap: 4, flex: 1 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 12, fontWeight: "700", minWidth: 44 },

    matchText: { alignSelf: "flex-start", fontSize: 12, fontWeight: "600", marginBottom: 4 },

    errorText: {
      color: "#D00000",
      fontSize: 12,
      marginBottom: 8,
      marginTop: 2,
      textAlign: "center",
    },

    resetBtn: {
      width: "100%",
      backgroundColor: "#0D1F45",
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 14,
      marginBottom: 20,
      shadowColor: "#0D1F45",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
    resetBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF", letterSpacing: 0.3 },

    hintBox: {
      width: "100%",
      backgroundColor: "#F8FAFC",
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    hintTitle: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
    hintItem: { fontSize: 12, lineHeight: 20 },
  });
