import React, { useState, useRef, useEffect, useMemo } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../components/ThemeContext";
import { sendForgotPasswordOTP, resetPassword } from "../services/OtpService";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function ResetPasswordOTPScreen({ navigation, route }) {
  const { email } = route.params || {};
  const { colors: C } = useTheme();
  const styles = useMemo(() => getStyles(C), [C]);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleOtpChange = (val, idx) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (error) setError("");
    if (digit && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (loading) return;
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setError("Please enter the full 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // Navigate to NewPassword screen — actual OTP verification happens there on password reset
      navigation.navigate("NewPassword", { email, otp: code });
    } catch (err) {
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    try {
      setResending(true);
      setError("");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      await sendForgotPasswordOTP(email);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
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
            <Text style={styles.iconEmoji}>📧</Text>
          </View>

          <View style={styles.card}>
            <Text style={[styles.title, { color: C.textDark }]}>Check Your Email</Text>
            <Text style={[styles.subtitle, { color: C.textMuted }]}>
              We sent a 6-digit code to{"\n"}
              <Text style={{ fontWeight: "700", color: C.textDark }}>{email}</Text>
            </Text>

            {/* OTP Boxes */}
            <View style={styles.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => (inputRefs.current[idx] = r)}
                  style={[
                    styles.otpBox,
                    { borderColor: digit ? "#0D1F45" : (C.inputBorder || "#E2E8F0"), color: C.textDark },
                    digit && styles.otpBoxFilled,
                  ]}
                  value={digit}
                  onChangeText={(val) => handleOtpChange(val, idx)}
                  onKeyPress={(e) => handleKeyPress(e, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  textAlign="center"
                />
              ))}
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.verifyBtn, loading && { opacity: 0.75 }]}
              onPress={handleVerify}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.verifyBtnText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={[styles.resendLabel, { color: C.textMuted }]}>
                Didn't receive it?{" "}
              </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={cooldown > 0 || resending}
                activeOpacity={0.7}
              >
                {resending ? (
                  <ActivityIndicator size="small" color="#0D1F45" />
                ) : (
                  <Text
                    style={[
                      styles.resendText,
                      (cooldown > 0) && { color: C.textMuted || "#94A3B8" },
                    ]}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                  </Text>
                )}
              </TouchableOpacity>
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
    subtitle: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 24 },

    otpRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 6,
    },
    otpBox: {
      width: 44,
      height: 52,
      borderRadius: 12,
      borderWidth: 1.5,
      fontSize: 22,
      fontWeight: "700",
      backgroundColor: "#F8FAFC",
    },
    otpBoxFilled: {
      backgroundColor: "#EFF6FF",
      borderColor: "#0D1F45",
    },

    errorText: {
      color: "#D00000",
      fontSize: 12,
      marginBottom: 10,
      marginTop: 6,
      textAlign: "center",
    },

    verifyBtn: {
      width: "100%",
      backgroundColor: "#0D1F45",
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 16,
      marginBottom: 20,
      shadowColor: "#0D1F45",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
    verifyBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF", letterSpacing: 0.3 },

    resendRow: { flexDirection: "row", alignItems: "center" },
    resendLabel: { fontSize: 13 },
    resendText: { fontSize: 13, fontWeight: "700", color: "#0D1F45" },
  });
