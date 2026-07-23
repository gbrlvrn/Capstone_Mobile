import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DARK_MODE_KEY = "@faithly_dark_mode";

const LIGHT = {
  bg: "#FAFCFE",
  cardBg: "#FFFFFF",
  cardBorder: "#F1F5F9",
  navBg: "#0D1F45",
  sidebarBg: "#0D1F45",
  sidebarActive: "#0D1F45",
  sidebarText: "rgba(255,255,255,0.55)",
  sidebarTextActive: "#FFFFFF",
  sidebarIconDefault: "rgba(255,255,255,0.5)",
  sidebarTitle: "#FFFFFF",
  sidebarUserName: "#FFFFFF",
  sidebarUserEmail: "rgba(255,255,255,0.45)",
  sidebarFooterBorder: "rgba(60,90,150,0.25)",
  tabBg: "#FFFFFF",
  tabActive: "#0D1F45",
  tabInactive: "#94A3B8",
  tabBorder: "rgba(100,140,200,0.2)",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textDimmed: "#9CA3AF",
  blue: "#0D1F45",
  blueLight: "rgba(13,31,69,0.08)",
  green: "#34C759",
  greenLight: "rgba(52,199,89,0.1)",
  red: "#E74C3C",
  redLight: "rgba(231,76,60,0.1)",
  orange: "#FF9500",
  orangeLight: "rgba(255,149,0,0.1)",
  purple: "#AF52DE",
  purpleLight: "rgba(175,82,222,0.1)",
  gold: "#F5A623",
  goldLight: "rgba(245,166,35,0.1)",
  overlay: "rgba(15,23,42,0.6)",
  navBorder: "rgba(60,90,150,0.1)",
  shadow: "rgba(100,116,139,0.08)",
  inputBg: "#F8FAFC",
  inputBorder: "#E2E8F0",
  inputBorderFocus: "#0D1F45",
  inputBorderErr: "#E74C3C",
  inputText: "#0F172A",
  divider: "#F1F5F9",
  settingRowBorder: "#F1F5F9",
  securityIconBg: "#F8FAFC",
  // Top bar / nav
  hamburgerColor: "#0F172A",
  topTitleColor: "#0F172A",
  notifIconColor: "#0F172A",
  // Modals
  modalBg: "#FFFFFF",
  modalCancelBg: "#F0F2F5",
  modalCancelText: "#1A2744",
  // Status bar
  statusBarStyle: "dark-content",
  // Decorative circles
  circleOpacity: 0.04,
  // Switch
  switchTrackFalse: "#D1D5DB",
  // Cards extra
  cardShadow: "#64748B",
  arrowCircleBg: "rgba(0,0,0,0.03)",
  // Skeleton
  skeletonBase: "#E8ECF0",
  skeletonHighlight: "#F8FAFC",
  // Misc
  successBorder: "#10B981",
  linkBlue: "#0D1F45",
  placeholderText: "#94A3B8",
  secondaryBtnBg: "#F1F5F9",
  secondaryBtnBorder: "#E2E8F0",
  secondaryBtnText: "#334155",
  bubbleBg: "#FFFFFF",
  bubbleNotch: "#FFFFFF",
  bubbleText: "#475569",
  featureIconBg: "#FFFFFF",
  featureIconBorder: "#F8FAFC",
  featureLabel: "#334155",
  notifDotBorder: "#FFFFFF",
};

const DARK = {
  bg: "#0D1117",
  cardBg: "#161B22",
  cardBorder: "#30363D",
  navBg: "#010409",
  sidebarBg: "#010409",
  sidebarActive: "#1A3A6C",
  sidebarText: "rgba(255,255,255,0.55)",
  sidebarTextActive: "#FFFFFF",
  sidebarIconDefault: "rgba(255,255,255,0.5)",
  sidebarTitle: "#FFFFFF",
  sidebarUserName: "#FFFFFF",
  sidebarUserEmail: "rgba(255,255,255,0.45)",
  sidebarFooterBorder: "rgba(48,54,61,0.6)",
  tabBg: "#010409",
  tabActive: "#1A3A6C",
  tabInactive: "#8B949E",
  tabBorder: "rgba(48,54,61,0.6)",
  textDark: "#E6EDF3",
  textMuted: "#8B949E",
  textDimmed: "#6E7681",
  blue: "#1A3A6C",
  blueLight: "rgba(26,58,108,0.25)",
  green: "#34C759",
  greenLight: "rgba(52,199,89,0.15)",
  red: "#E74C3C",
  redLight: "rgba(231,76,60,0.15)",
  orange: "#FF9500",
  orangeLight: "rgba(255,149,0,0.15)",
  purple: "#AF52DE",
  purpleLight: "rgba(175,82,222,0.15)",
  gold: "#F5A623",
  goldLight: "rgba(245,166,35,0.15)",
  overlay: "rgba(0,0,0,0.7)",
  navBorder: "rgba(48,54,61,0.6)",
  shadow: "rgba(0,0,0,0.3)",
  inputBg: "#161B22",
  inputBorder: "#30363D",
  inputBorderFocus: "#1A3A6C",
  inputBorderErr: "#E74C3C",
  inputText: "#E6EDF3",
  divider: "#21262D",
  settingRowBorder: "#21262D",
  securityIconBg: "#21262D",
  // Top bar / nav
  hamburgerColor: "#E6EDF3",
  topTitleColor: "#E6EDF3",
  notifIconColor: "#E6EDF3",
  // Modals
  modalBg: "#161B22",
  modalCancelBg: "#21262D",
  modalCancelText: "#E6EDF3",
  // Status bar
  statusBarStyle: "light-content",
  // Decorative circles
  circleOpacity: 0.06,
  // Switch
  switchTrackFalse: "#30363D",
  // Cards extra
  cardShadow: "#000000",
  arrowCircleBg: "rgba(255,255,255,0.06)",
  // Skeleton
  skeletonBase: "#21262D",
  skeletonHighlight: "#30363D",
  // Misc
  successBorder: "#10B981",
  linkBlue: "#4A7CC7",
  placeholderText: "#6E7681",
  secondaryBtnBg: "#21262D",
  secondaryBtnBorder: "#30363D",
  secondaryBtnText: "#E6EDF3",
  bubbleBg: "#161B22",
  bubbleNotch: "#161B22",
  bubbleText: "#8B949E",
  featureIconBg: "#161B22",
  featureIconBorder: "#30363D",
  featureLabel: "#E6EDF3",
  notifDotBorder: "#010409",
};

const ThemeContext = createContext({
  isDark: false,
  colors: LIGHT,
  toggleDarkMode: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem(DARK_MODE_KEY);
        if (val === "true") setIsDark(true);
      } catch {}
    })();
  }, []);

  const toggleDarkMode = async (val) => {
    const next = typeof val === "boolean" ? val : !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(DARK_MODE_KEY, next ? "true" : "false");
    } catch {}
  };

  const colors = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
