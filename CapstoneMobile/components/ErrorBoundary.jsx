import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

let Clipboard = null;
try {
  Clipboard = require("expo-clipboard");
} catch {}

/**
 * Global ErrorBoundary — catches JS errors and provides recovery actions
 * Must be a class component (React error boundaries don't support hooks)
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  handleResetCache = async () => {
    try {
      // Clear all cached storage except critical keys if needed
      await AsyncStorage.clear();
    } catch (e) {
      console.error("Failed to clear storage:", e);
    }
    this.handleRetry();
  };

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.message || error?.toString()}\n\nStack:\n${error?.stack || ""}\n\nComponent Stack:\n${errorInfo?.componentStack || ""}`;
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(text);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      } else {
        Alert.alert("Error Details", text.slice(0, 300));
      }
    } catch {
      Alert.alert("Error Details", text.slice(0, 300));
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, copied } = this.state;
      const errorMsg = error?.message || error?.toString() || "Unknown error";

      return (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>!</Text>
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred. You can try refreshing or clearing cached data.
            </Text>

            {/* Error badge preview */}
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText} numberOfLines={2}>
                {errorMsg}
              </Text>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.85}
              onPress={this.handleRetry}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearBtn}
              activeOpacity={0.8}
              onPress={this.handleResetCache}
            >
              <Text style={styles.clearText}>Clear App Cache & Restart</Text>
            </TouchableOpacity>

            {/* Expandable diagnostic details */}
            <TouchableOpacity
              style={styles.toggleDetailsBtn}
              activeOpacity={0.7}
              onPress={() => this.setState({ showDetails: !showDetails })}
            >
              <Text style={styles.toggleDetailsText}>
                {showDetails ? "Hide Error Details ▲" : "View Technical Details ▼"}
              </Text>
            </TouchableOpacity>

            {showDetails && (
              <View style={styles.detailsBox}>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={this.handleCopyError}
                >
                  <Text style={styles.copyBtnText}>
                    {copied ? "Copied to Clipboard ✓" : "Copy Error Details"}
                  </Text>
                </TouchableOpacity>

                <ScrollView style={styles.stackScroll} nestedScrollEnabled>
                  <Text style={styles.stackTitle}>Message:</Text>
                  <Text style={styles.stackText}>{errorMsg}</Text>
                  {error?.stack && (
                    <>
                      <Text style={styles.stackTitle}>Stack Trace:</Text>
                      <Text style={styles.stackText}>{error.stack}</Text>
                    </>
                  )}
                  {errorInfo?.componentStack && (
                    <>
                      <Text style={styles.stackTitle}>Component Stack:</Text>
                      <Text style={styles.stackText}>{errorInfo.componentStack}</Text>
                    </>
                  )}
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(231,76,60,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#E74C3C",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A2744",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7FA3",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  errorBanner: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: "100%",
    marginBottom: 24,
  },
  errorBannerText: {
    fontSize: 12,
    color: "#E74C3C",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#0D1F45",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  clearBtn: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  clearText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleDetailsBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toggleDetailsText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  detailsBox: {
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  copyBtn: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  copyBtnText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
  stackScroll: {
    maxHeight: 220,
  },
  stackTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  stackText: {
    color: "#F1F5F9",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 16,
  },
});
