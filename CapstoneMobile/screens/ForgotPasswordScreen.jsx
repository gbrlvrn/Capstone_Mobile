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
import { sendForgotPasswordOTP } from "../services/OtpService";

const EMAIL_ICON = require("../assets/icons/email.png");

export default function ForgotPasswordScreen({ navigation }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => getStyles(C), [C]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSendOTP = async () => {
    if (loading) return;
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await sendForgotPasswordOTP(cleanEmail);
      navigation.navigate("ResetPasswordOTP", { email: cleanEmail });
    } catch (err) {
      setError(err?.message || "Failed to send OTP. Please try again.");
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
          {/* Ambient circles */}
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

          {/* Icon header */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🔐</Text>
          </View>

          <View style={styles.card}>
            <Text style={[styles.title, { color: C.textDark }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { color: C.textMuted }]}>
              Enter the email address linked to your account and we'll send you a 6-digit OTP to reset your password.
            </Text>

            <Text style={[styles.label, { color: C.textDark }]}>Email Address</Text>
            <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.inputBorder }]}>
              <Image source={EMAIL_ICON} style={styles.inputIcon} resizeMode="contain" />
              <TextInput
                style={[styles.input, { color: C.inputText }]}
                placeholder="your.email@example.com"
                placeholderTextColor={C.placeholderText}
                value={email}
                onChangeText={(t) => { setEmail(t); if (error) setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.sendBtn, loading && { opacity: 0.75 }]}
              onPress={handleSendOTP}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.sendBtnText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.7}
            >
              <Text style={[styles.loginLinkText, { color: C.textMuted }]}>
                Remembered your password?{" "}
                <Text style={{ color: C.blue || "#0D1F45", fontWeight: "700" }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
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
      paddingTop: Platform.OS === "ios" ? 16 : 16,
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
    title: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.4,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
      marginBottom: 24,
    },

    label: {
      alignSelf: "flex-start",
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 6,
    },
    inputIcon: { width: 20, height: 20, tintColor: "#64748B" },
    input: { flex: 1, fontSize: 15, marginLeft: 10 },

    errorText: {
      alignSelf: "flex-start",
      color: "#D00000",
      fontSize: 12,
      marginBottom: 10,
      marginTop: 2,
    },

    sendBtn: {
      width: "100%",
      backgroundColor: "#0D1F45",
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 12,
      marginBottom: 16,
      shadowColor: "#0D1F45",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
    sendBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF", letterSpacing: 0.3 },

    loginLink: { paddingVertical: 4 },
    loginLinkText: { fontSize: 13, textAlign: "center" },
  });
