import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { sendOTP, verifyOTP } from "../services/OtpService";
import { saveToken } from "../services/AuthService";
import { useAlert } from "../components/AlertContext";
import { useTheme } from "../components/ThemeContext";
import * as Haptics from "expo-haptics";

const LOGO = require("../assets/puac_logo.png");

const C = {
  bg: "#FAFCFE",
  cardBg: "#FFFFFF",
  cardBorder: "#F8FAFC",
  boxBg: "#F8FAFC",
  boxBorder: "#E2E8F0",
  boxBorderFocus: "#0D1F45",
  boxBorderErr: "#E74C3C",
  textWhite: "#0F172A",
  textMuted: "#64748B",
  textDimmed: "#94A3B8",
  linkBlue: "#0D1F45",
  linkblue: "#0D1F45",
  errorText: "#E74C3C",
};

const OTP_LENGTH = 6;

function cleanEmail(e) {
  return (e || "").trim().toLowerCase();
}

export default function VerifyOTPScreen({ navigation, route }) {
  const { showAlert } = useAlert();
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const email = cleanEmail(route?.params?.email);
  const source = route?.params?.source || "login";

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [focusIdx, setFocus] = useState(0);

  const [error, setError] = useState("");
  const [sending, setSending] = useState(true);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const inputs = useRef([]);
  const navigated = useRef(false);

  // Prevent double-send within the same screen instance
  const hasSentRef = useRef(false);

  // Send OTP once when screen opens (ONLY if email exists)
  useEffect(() => {
    let mounted = true;

    if (!email) {
      setSending(false);
      showAlert(
        "Missing Email",
        "Please go back and enter your email again.",
      );
      return;
    }

    if (hasSentRef.current) return;
    hasSentRef.current = true;

    (async () => {
      try {
        setSending(true);
        setError("");
        await sendOTP(email);
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to send OTP.");
      } finally {
        if (mounted) {
          setSending(false);
          // Auto-focus first OTP input after sending
          setTimeout(() => inputs.current[0]?.focus(), 300);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [email]);

  // Resend OTP
  const handleResend = useCallback(() => {
    if (!email) return;

    (async () => {
      try {
        setResending(true);
        setOtp(Array(OTP_LENGTH).fill(""));
        setFocus(0);
        setError("");
        inputs.current[0]?.focus();

        await sendOTP(email);
      } catch (e) {
        setError(e?.message || "Failed to resend OTP.");
      } finally {
        setResending(false);
      }
    })();
  }, [email]);

  // sVerify OTP (Backend)
  const attemptVerify = useCallback(
    (currentOtp) => {
      (async () => {
        if (!email) return;
        if (navigated.current) return;
        if (verifying) return;

        const code = currentOtp.join("");

        try {
          setVerifying(true);
          setError("");

          const result = await verifyOTP(email, code);

          // Save JWT token if returned (login flow)
          if (result?.token) {
            await saveToken(result.token);
          }

          navigated.current = true;

          // Haptic success feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          navigation.replace("VerificationSuccess", { email, source });
        } catch (e) {
          setError(e?.message || "Invalid or expired OTP.");
        } finally {
          setVerifying(false);
        }
      })();
    },
    [email, verifying, navigation, source],
  );

  // Handle digit input
  const handleChange = (val, idx) => {
    setError("");
    let arr = otp.slice();

    if (val.length > 1) {
      const pasteData = val.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
      for (let i = 0; i < pasteData.length; i++) {
        arr[i] = pasteData[i];
      }
      setOtp(arr);
      
      if (pasteData.length === OTP_LENGTH) {
        inputs.current[OTP_LENGTH - 1]?.focus();
        attemptVerify(arr);
      } else {
        const nextIdx = pasteData.length;
        setFocus(nextIdx);
        inputs.current[nextIdx]?.focus();
      }
      return;
    }

    if (val === "") {
      arr[idx] = "";
      setOtp(arr);

      const prev = idx - 1;
      if (prev >= 0) {
        setFocus(prev);
        inputs.current[prev]?.focus();
      }
    } else {
      arr[idx] = val;
      setOtp(arr);

      const next = idx + 1;
      if (next < OTP_LENGTH) {
        setFocus(next);
        inputs.current[next]?.focus();
      } else {
        const isComplete = arr.every((d) => d !== "");
        if (isComplete) {
          attemptVerify(arr);
        }
      }
    }
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === "Backspace" && otp[idx] === "") {
      const prev = idx - 1;
      if (prev >= 0) {
        setFocus(prev);
        inputs.current[prev]?.focus();
      }
    }
  };

  // Verify button
  const handleVerify = () => {
    const filled = otp.every((d) => d !== "");
    if (!filled) {
      setError("Please enter all 6 digits");
      return;
    }
    attemptVerify(otp);
  };
  
  const boxBorder = (digit, idx) => {
    if (error && digit === "") return colors.inputBorderErr;
    if (focusIdx === idx) return colors.inputBorderFocus;
    if (digit !== "") return colors.inputBorderFocus;
    return colors.inputBorder;
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.circleTopRight, { opacity: colors.circleOpacity }]} />
      <View style={[styles.circleBottomLeft, { opacity: colors.circleOpacity }]} />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.6}
      >
        <Text style={[styles.backText, { color: colors.textMuted }]}>← Back</Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, shadowColor: colors.cardShadow }]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.title, { color: colors.textDark }]}>Verify OTP</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Enter the code sent to{"\n"}
          <Text style={{ color: colors.textDark, fontWeight: "600" }}>{email || "—"}</Text>
        </Text>

        {sending ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.blue} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Sending OTP...</Text>
          </View>
        ) : (
          <>
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  style={[
                    styles.otpBox,
                    { borderColor: boxBorder(digit, i), backgroundColor: colors.inputBg, color: colors.textDark },
                    digit !== "" && { backgroundColor: "rgba(46,107,240,0.06)", borderColor: colors.blue },
                  ]}
                  value={digit}
                  onChangeText={(val) => handleChange(val, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  onFocus={() => setFocus(i)}
                  maxLength={1}
                  keyboardType="number-pad"
                  textAlign="center"
                  autoComplete="one-time-code"
                  importantForAutofill="yes"
                />
              ))}
            </View>

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.verifyBtn, verifying && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.verifyBtnText}>
                  {source === "signup"
                    ? "Verify & Create Account"
                    : "Verify & Sign In"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={handleResend}
              disabled={resending}
            >
              {resending ? (
                <View style={styles.resendLoading}>
                  <ActivityIndicator size="small" color={colors.linkBlue} />
                  <Text style={[styles.resendText, { color: colors.textDimmed }]}>Sending...</Text>
                </View>
              ) : (
                <Text style={[styles.resendText, { color: colors.textDimmed }]}>
                  Didn't receive code?{" "}
                  <Text style={{ color: colors.linkBlue, fontWeight: "600" }}>Resend OTP</Text>
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={[styles.disclaimer, { color: colors.textDimmed }]}>
        By continuing, you agree to our{" "}
        <Text style={{ color: colors.linkBlue, fontWeight: "500" }}>Terms of Service</Text> and{" "}
        <Text style={{ color: colors.linkBlue, fontWeight: "500" }}>Privacy Policy</Text>
      </Text>
    </View>
    </TouchableWithoutFeedback>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  circleTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#0D1F45',
    opacity: 0.05,
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#00C3FF',
    opacity: 0.05,
  },
  backBtn: { position: "absolute", top: Platform.OS === "ios" ? 60 : 40, left: 24, zIndex: 10 },
  backText: { fontSize: 16, fontWeight: '600', color: C.textMuted },

  card: {
    width: "100%",
    backgroundColor: C.cardBg,
    borderRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 36,
    alignItems: "center",
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F8FAFC',
    zIndex: 5,
  },

  logo: { width: 64, height: 64, marginBottom: 16, borderRadius: 32 },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: C.textWhite,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  subtitleEmail: { color: C.textWhite, fontWeight: "600" },

  loadingWrap: { paddingVertical: 40, alignItems: "center", gap: 14 },
  loadingText: { fontSize: 14, color: C.textMuted },

  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  otpBox: {
    width: "14.5%",
    aspectRatio: 1,
    backgroundColor: C.boxBg,
    borderWidth: 1.5,
    height: 50,
    borderColor: C.boxBorder,
    borderRadius: 16,
    fontSize: 24,
    fontWeight: "700",
    color: C.textWhite,
    textAlign: "center",
  },
  otpBoxFilled: { backgroundColor: "rgba(46,107,240,0.06)", borderColor: "#0D1F45" },

  errorMsg: {
    fontSize: 12,
    color: C.errorText,
    marginBottom: 12,
    alignSelf: "flex-start",
  },

  verifyBtn: {
    width: "100%",
    backgroundColor: "#0D1F45",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 12,
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  verifyBtnText: { fontSize: 17, fontWeight: "700", color: "#ffffff", letterSpacing: 0.5 },

  resendText: { fontSize: 15, color: C.textDimmed },
  resendLink: { color: C.linkBlue, fontWeight: "600" },
  resendLoading: { flexDirection: "row", alignItems: "center", gap: 8 },

  disclaimer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 34 : 24,
    fontSize: 11,
    color: C.textDimmed,
    textAlign: "center",
  },
  disclaimerLink: { color: C.linkBlue, fontWeight: "500" },
});
