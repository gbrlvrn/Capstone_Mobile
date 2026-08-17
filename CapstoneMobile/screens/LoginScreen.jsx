import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Image,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginUser, saveUserData } from "../services/AuthService";
import { useTheme } from "../components/ThemeContext";

const { width: _SW, height: _SH } = Dimensions.get("window");
const _WR = Math.min(_SW / 375, 1.3);
const s = (v) => Math.round(v * _WR);
const fs = (v) => Math.round(v * Math.min(_WR, 1.25));

const LOGO = require("../assets/puac_logo.png");
const EMAIL_ICON = require("../assets/icons/email.png");
const PHONE_ICON = require("../assets/icons/phone.png");

const C = {
  bg: "#FAFCFE",
  cardBg: "#FFFFFF",
  cardBorder: "transparent",
  inputBg: "#FFFFFF",
  inputBorder: "#F1F5F9",
  textWhite: "#0F172A",
  textMuted: "#64748B",
  textDimmed: "#94A3B8",
  iconColor: "#0D1F45",
  linkBlue: "#0D1F45",
  outlineBorder: "#E2E8F0",
  tabActive: "rgba(46, 107, 240, 0.1)",
  tabInactive: "transparent",
};

const LOGIN_ATTEMPTS_KEY = "@login_attempts_v1";
const LOCK_UNTIL_KEY = "@login_lock_until_v1";

export default function LoginScreen({ navigation, route }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = useMemo(() => getStyles(C), [C]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(!!(route?.params?.passwordResetSuccess));
  const [sessionExpired, setSessionExpired] = useState(!!(route?.params?.sessionExpired));
  const [registrationSuccess, setRegistrationSuccess] = useState(!!(route?.params?.registrationSuccess));

  // lockout
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const isLocked = lockUntil > Date.now();

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // Load persisted lock state + attempts
  useEffect(() => {
    const loadState = async () => {
      try {
        const [aRaw, lRaw] = await Promise.all([
          AsyncStorage.getItem(LOGIN_ATTEMPTS_KEY),
          AsyncStorage.getItem(LOCK_UNTIL_KEY),
        ]);

        const a = Number(aRaw ?? "0") || 0;
        const l = Number(lRaw ?? "0") || 0;

        setAttempts(a);
        setLockUntil(l);

        if (l > Date.now()) {
          setTimeLeft(Math.ceil((l - Date.now()) / 1000));
        } else {
          // if expired already, clean up
          await AsyncStorage.setItem(LOGIN_ATTEMPTS_KEY, "0");
          await AsyncStorage.removeItem(LOCK_UNTIL_KEY);
          setAttempts(0);
          setLockUntil(0);
          setTimeLeft(0);
        }
      } catch {
        // ignore storage failures
      }
    };

    loadState();
  }, []);

  // Countdown timer tick
  useEffect(() => {
    if (!isLocked) return;

    const interval = setInterval(async () => {
      const seconds = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setTimeLeft(seconds);

      if (seconds <= 0) {
        clearInterval(interval);
        setLockUntil(0);
        setAttempts(0);
        setTimeLeft(0);
        setErrorMessage("");

        try {
          await AsyncStorage.setItem(LOGIN_ATTEMPTS_KEY, "0");
          await AsyncStorage.removeItem(LOCK_UNTIL_KEY);
        } catch {
          // ignore
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockUntil, isLocked]);

  const registerFailedAttempt = async (msg) => {
    const next = attempts + 1;
    setAttempts(next);

    try {
      await AsyncStorage.setItem(LOGIN_ATTEMPTS_KEY, String(next));
    } catch {
      // ignore
    }

    if (next >= 3) {
      const until = Date.now() + 60 * 1000;
      setLockUntil(until);
      setTimeLeft(60);
      setErrorMessage("Too many failed attempts. Please wait for 1 minute.");

      try {
        await AsyncStorage.setItem(LOCK_UNTIL_KEY, String(until));
      } catch {
        // ignore
      }
      return;
    }

    setErrorMessage(msg || `Invalid login. Attempt ${next}/3.`);
  };

  const handleContinue = async () => {
    if (loading || isLocked) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage("Invalid Email: Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const result = await loginUser(cleanEmail, password);

      // success → reset attempts & save session
      setAttempts(0);
      setErrorMessage("");
      try {
        await AsyncStorage.setItem(LOGIN_ATTEMPTS_KEY, "0");
        await AsyncStorage.setItem("@faithly_session", JSON.stringify({ email: cleanEmail }));
        await saveUserData(result?.user || { email: cleanEmail });
      } catch {
        // ignore
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "Home", params: { email: cleanEmail, source: "login" } }],
      });
    } catch (err) {
      await registerFailedAttempt(
        err?.message || "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={[styles.screen, { backgroundColor: colors.bg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.circleTopRight, { opacity: colors.circleOpacity }]} />
          <View style={[styles.circleBottomLeft, { opacity: colors.circleOpacity }]} />

          {/* Account verified banner */}
          {registrationSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>✓ Account verified! Please sign in.</Text>
              <TouchableOpacity onPress={() => setRegistrationSuccess(false)} style={{ marginLeft: 8 }}>
                <Text style={{ color: '#166534', fontWeight: '700', fontSize: 13 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Password reset success banner */}
          {resetSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>✓ Password reset successfully! Please sign in.</Text>
              <TouchableOpacity onPress={() => setResetSuccess(false)} style={{ marginLeft: 8 }}>
                <Text style={{ color: '#166534', fontWeight: '700', fontSize: 13 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Session expired banner */}
          {sessionExpired && (
            <View style={[styles.successBanner, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
              <Text style={[styles.successBannerText, { color: '#92400E' }]}>Session expired — please sign in again.</Text>
              <TouchableOpacity onPress={() => setSessionExpired(false)} style={{ marginLeft: 8 }}>
                <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 13 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Start");
              }
            }}
            activeOpacity={0.6}
          >
            <Text style={[styles.backText, { color: colors.textMuted }]}>← Back</Text>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, shadowColor: colors.cardShadow }]}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: colors.textDark }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to access your account</Text>

            <Text style={[styles.label, { color: colors.textDark }]}>Email Address</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Image
                source={EMAIL_ICON}
                style={styles.inputIcon}
                resizeMode="contain"
              />
              <TextInput
                style={[styles.input, { color: colors.inputText }]}
                placeholder="your.email@example.com"
                placeholderTextColor={colors.placeholderText}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMessage) setErrorMessage("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
            </View>

            <Text style={[styles.label, { color: colors.textDark }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Image source={require("../assets/icons/lock.png")} style={styles.inputIcon} resizeMode="contain" />
              <TextInput
                style={[styles.input, { color: colors.inputText, flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.placeholderText}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage("");
                }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                <Image
                  source={showPass ? require("../assets/icons/eye-open.png") : require("../assets/icons/eye-closed.png")}
                  style={[styles.inputIcon, { tintColor: colors.textDimmed }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password link */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotText, { color: colors.blue || '#0D1F45' }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {isLocked ? (
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <View style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  borderWidth: 4,
                  borderColor: 'rgba(231,76,60,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}>
                  <View style={{
                    position: 'absolute',
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    borderWidth: 4,
                    borderColor: '#E74C3C',
                    borderTopColor: 'transparent',
                    borderRightColor: timeLeft <= 30 ? '#E74C3C' : 'transparent',
                    borderBottomColor: timeLeft <= 15 ? '#E74C3C' : 'transparent',
                    transform: [{ rotate: `${((60 - timeLeft) / 60) * 360}deg` }],
                  }} />
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#E74C3C' }}>{timeLeft}</Text>
                </View>
                <Text style={[styles.lockText, { marginBottom: 0 }]}>Account temporarily locked</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Too many failed attempts</Text>
              </View>
            ) : errorMessage ? (
              <Text style={styles.lockText}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.otpBtn, (loading || isLocked) && { opacity: 0.8 }]}
              activeOpacity={0.85}
              onPress={handleContinue}
              disabled={loading || isLocked}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.otpBtnText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, { color: colors.textDimmed }]}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { borderColor: colors.secondaryBtnBorder }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("SignUp")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.createBtnText, { color: colors.blue }]}>New to IsangDiwa? Create Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.disclaimer, { color: colors.textDimmed }]}>
            By continuing, you agree to our{" "}
            <Text style={{ color: colors.linkBlue, fontWeight: "500" }}>Terms of Service</Text> and{" "}
            <Text style={{ color: colors.linkBlue, fontWeight: "500" }}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: s(24),
    paddingTop: Platform.OS === "ios" ? s(70) : s(56),
    paddingBottom: s(32),
  },
  circleTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: s(300),
    height: s(300),
    borderRadius: s(150),
    backgroundColor: '#0D1F45',
    opacity: 0.05,
  },
  circleBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: s(350),
    height: s(350),
    borderRadius: s(175),
    backgroundColor: '#00C3FF',
    opacity: 0.05,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: s(24),
    paddingVertical: s(4),
  },
  backText: { fontSize: fs(16), fontWeight: '600', color: C.textMuted },

  card: {
    width: "100%",
    backgroundColor: C.cardBg,
    borderRadius: s(28),
    paddingHorizontal: s(24),
    paddingTop: s(32),
    paddingBottom: s(28),
    alignItems: "center",
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  logo: { width: s(60), height: s(60), marginBottom: s(14), borderRadius: s(30) },
  title: {
    fontSize: fs(24),
    fontWeight: "800",
    color: C.textWhite,
    marginBottom: s(4),
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: fs(14), color: C.textMuted, marginBottom: s(24) },

  label: {
    alignSelf: "flex-start",
    fontSize: fs(13),
    fontWeight: "600",
    color: C.textWhite,
    marginBottom: s(6),
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: s(14),
    paddingHorizontal: s(14),
    paddingVertical: s(14),
    marginBottom: s(16),
  },
  inputIcon: { width: s(20), height: s(20), tintColor: '#64748B' },
  input: { flex: 1, fontSize: fs(15), color: C.textWhite, marginLeft: s(10) },

  lockText: {
    width: "100%",
    color: "#D00000",
    fontSize: fs(12),
    marginBottom: s(8),
    marginTop: -4,
    textAlign: "left",
  },

  otpBtn: {
    width: "100%",
    backgroundColor: "#0D1F45",
    borderRadius: s(14),
    paddingVertical: s(16),
    alignItems: "center",
    marginTop: s(4),
    marginBottom: s(20),
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  otpBtnText: { fontSize: fs(16), fontWeight: "700", color: "#ffffff", letterSpacing: 0.3 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: s(16),
    gap: s(10),
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8EDF2' },
  dividerText: { fontSize: fs(12), fontWeight: "500", color: C.textDimmed },

  createBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: s(14),
    paddingVertical: s(16),
    alignItems: "center",
  },
  createBtnText: { fontSize: fs(15), color: '#334155', fontWeight: "700" },

  disclaimer: {
    marginTop: s(20),
    fontSize: fs(11),
    color: C.textDimmed,
    textAlign: "center",
    lineHeight: fs(18),
    paddingHorizontal: s(8),
  },
  disclaimerLink: { color: C.linkBlue, fontWeight: "500" },

  newText: { display: "none" },

  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: s(12),
    paddingVertical: s(4),
  },
  forgotText: {
    fontSize: fs(13),
    fontWeight: '600',
  },

  successBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DCFCE7',
    borderRadius: s(12),
    paddingHorizontal: s(14),
    paddingVertical: s(12),
    marginBottom: s(16),
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  successBannerText: {
    flex: 1,
    color: '#166534',
    fontSize: fs(13),
    fontWeight: '600',
  },
});


