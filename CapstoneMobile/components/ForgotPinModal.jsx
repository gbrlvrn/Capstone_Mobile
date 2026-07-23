import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_CONFIG } from "../services/config";
import { useTheme } from "./ThemeContext";

/**
 * ForgotPinModal — 3-step flow:
 *   1. Enter email
 *   2. Enter OTP (sent to email)
 *   3. Set new 6-digit PIN
 *
 * Props:
 *   visible  – boolean
 *   onClose  – callback
 *   onSuccess – optional callback after PIN reset
 */
export default function ForgotPinModal({ visible, onClose, onSuccess }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=newPin
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(1);
      setEmail("");
      setOtp("");
      setNewPin("");
      setConfirmPin("");
      setError("");
      setSuccess("");
    }
  }, [visible]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: step,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [step, slideAnim]);

  const BASE = API_CONFIG.CUSTOM_BACKEND.BASE_URL;

  const handleSendOTP = async () => {
    Keyboard.dismiss();
    setError("");
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/otp/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    Keyboard.dismiss();
    setError("");
    if (otp.length !== 6) {
      setError("OTP must be 6 digits.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/otp/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP");
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    Keyboard.dismiss();
    setError("");
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError("PIN must be exactly 6 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset PIN");
      setSuccess("PIN reset successfully! You can now log in with your new PIN.");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ["", "Enter Your Email", "Verify OTP", "Set New PIN"];
  const stepDescs = [
    "",
    "We'll send a verification code to your email.",
    "Enter the 6-digit code sent to your email.",
    "Create a new 6-digit PIN for your account.",
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
        <View style={[styles.card, { backgroundColor: colors.modalBg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textDark }]}>{stepTitles[step]}</Text>
            <Text style={[styles.headerDesc, { color: colors.textMuted }]}>{stepDescs[step]}</Text>

            {/* Step indicator */}
            <View style={styles.stepRow}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    s === step && styles.stepDotActive,
                    s < step && styles.stepDotDone,
                    s !== step && s >= step && { backgroundColor: colors.divider },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#E74C3C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            {step === 1 && (
              <>
                <Text style={[styles.label, { color: colors.textDark }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText }]}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.placeholderText}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handleSendOTP}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={[styles.label, { color: colors.textDark }]}>Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText }]}
                  placeholder="000000"
                  placeholderTextColor={colors.placeholderText}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOTP} style={styles.resendBtn}>
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && !success && (
              <>
                <Text style={[styles.label, { color: colors.textDark }]}>New PIN</Text>
                <TextInput
                  style={[styles.input, styles.otpInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText }]}
                  placeholder="••••••"
                  placeholderTextColor={colors.placeholderText}
                  value={newPin}
                  onChangeText={(t) => setNewPin(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                />
                <Text style={[styles.label, { marginTop: 12, color: colors.textDark }]}>Confirm PIN</Text>
                <TextInput
                  style={[styles.input, styles.otpInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText }]}
                  placeholder="••••••"
                  placeholderTextColor={colors.placeholderText}
                  value={confirmPin}
                  onChangeText={(t) => setConfirmPin(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handleResetPin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset PIN</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  keyboardAvoid: {
    width: "100%",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingBottom: 24,
    width: "100%",
    maxWidth: 400,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A2744",
    marginBottom: 6,
  },
  headerDesc: {
    fontSize: 13.5,
    color: "#6B7FA3",
    lineHeight: 19,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: "row",
    gap: 8,
  },
  stepDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E4EA",
  },
  stepDotActive: {
    backgroundColor: "#0D1F45",
    width: 48,
  },
  stepDotDone: {
    backgroundColor: "#34C759",
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2744",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E4EA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A2744",
    backgroundColor: "#F8F9FB",
    marginBottom: 16,
  },
  otpInput: {
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: "#0D1F45",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resendBtn: {
    alignItems: "center",
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: "#0D1F45",
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(231,76,60,0.08)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: "#E74C3C",
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(52,199,89,0.08)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    color: "#34C759",
    flex: 1,
  },
});
