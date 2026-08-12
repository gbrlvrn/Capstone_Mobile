/**
 * responsive.js
 * Centralized responsive scaling utility for cross-device compatibility.
 * Design baseline: 375px wide × 812px tall (iPhone 14 standard).
 *
 * Usage:
 *   import { scale, fontScale, hp, wp, STATUSBAR_HEIGHT, NAV_BOTTOM_OFFSET } from '../components/responsive';
 */

import { Dimensions, Platform, StatusBar, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Design Baseline ──────────────────────────────────────────────────────────
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// ─── Scale Factors ────────────────────────────────────────────────────────────
const widthRatio = SCREEN_WIDTH / BASE_WIDTH;
const heightRatio = SCREEN_HEIGHT / BASE_HEIGHT;

/**
 * scale(size) — scale layout dimensions (padding, margin, width, height, borderRadius)
 * Primarily width-driven so columns and grids stay consistent.
 */
export const scale = (size) => {
  const scaled = size * widthRatio;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * fontScale(size) — scale font sizes.
 * Slightly more conservative than scale() to avoid over-inflation on large screens.
 */
export const fontScale = (size) => {
  // Average of width and height ratios, capped to prevent very large fonts on tablets
  const ratio = (widthRatio + heightRatio) / 2;
  const capped = Math.min(ratio, 1.4); // Cap at 40% growth
  const scaled = size * capped;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * vScale(size) — scale heights specifically (useful for buttons/cards that should grow taller on tall phones)
 */
export const vScale = (size) => {
  const scaled = size * heightRatio;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * wp(percent) — percentage of screen width
 */
export const wp = (percent) => (SCREEN_WIDTH * percent) / 100;

/**
 * hp(percent) — percentage of screen height
 */
export const hp = (percent) => (SCREEN_HEIGHT * percent) / 100;

// ─── Device Classification ────────────────────────────────────────────────────
/** True for small phones: iPhone SE, Galaxy A series narrow (<= 375px) */
export const isSmallDevice = SCREEN_WIDTH <= 375;

/** True for wider phones (> 428px) like Pro Max, Galaxy Ultra */
export const isLargePhone = SCREEN_WIDTH > 428;

/** True for tablets (iPad, Android tablets >= 768px) */
export const isTablet = SCREEN_WIDTH >= 768;

// ─── Safe Area / Status Bar Heights ──────────────────────────────────────────
/**
 * STATUSBAR_HEIGHT — reliable status bar height across platforms.
 * iOS: accounts for notch (X/11/12/13/14/15 series) and Dynamic Island.
 * Android: uses StatusBar.currentHeight.
 */
export const STATUSBAR_HEIGHT = Platform.select({
  ios: SCREEN_HEIGHT >= 812 ? 44 : 20, // 812+ = notched/Dynamic Island iPhones
  android: StatusBar.currentHeight || 24,
  default: 24,
});

/**
 * TOP_INSET — safe padding for content below status bar / notch.
 * Use this instead of hardcoded Platform.OS === "ios" ? 56 : 42 in topBar.
 */
export const TOP_INSET = Platform.select({
  ios: STATUSBAR_HEIGHT + scale(14),
  android: STATUSBAR_HEIGHT + scale(10),
  default: STATUSBAR_HEIGHT + scale(12),
});

/**
 * BOTTOM_INSET — safe padding for home indicator (iOS) / gesture nav bar (Android).
 */
export const BOTTOM_INSET = Platform.select({
  ios: SCREEN_HEIGHT >= 812 ? 34 : 0, // Only notched iPhones have home indicator
  android: 0, // Handled by system nav
  default: 0,
});

/**
 * NAV_BOTTOM_OFFSET — position for FloatingNavBar `bottom` value.
 * Accounts for home indicator on notched iPhones.
 */
export const NAV_BOTTOM_OFFSET = Platform.select({
  ios: SCREEN_HEIGHT >= 812 ? scale(24) : scale(12),
  android: scale(16),
  default: scale(16),
});

// ─── Exports ──────────────────────────────────────────────────────────────────
export { SCREEN_WIDTH, SCREEN_HEIGHT };

export default {
  scale,
  fontScale,
  vScale,
  wp,
  hp,
  isSmallDevice,
  isLargePhone,
  isTablet,
  STATUSBAR_HEIGHT,
  TOP_INSET,
  BOTTOM_INSET,
  NAV_BOTTOM_OFFSET,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};
