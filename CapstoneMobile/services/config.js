// services/config.js
import Constants from "expo-constants";

/**
 * Auto-detect the developer machine's local IP address.
 *
 * Checks multiple Expo sources to find the dev machine IP:
 *   1. Constants.expoConfig.hostUri  (Expo Go / dev client)
 *   2. Constants.debuggerHost        (newer Expo SDKs)
 *   3. Constants.manifest?.debuggerHost
 *   4. Constants.manifest2?.extra?.expoGo?.debuggerHost
 *
 * For production / standalone builds these are all undefined,
 * so we fall back to the deployed backend URL.
 */
const BACKEND_PORT = 5001;

function getDevIP() {
  // Try every known Expo source for the dev-server host
  const sources = [
    Constants?.expoConfig?.hostUri,
    Constants?.debuggerHost,
    Constants?.manifest?.debuggerHost,
    Constants?.manifest2?.extra?.expoGo?.debuggerHost,
  ];

  for (const source of sources) {
    if (source && typeof source === "string") {
      const ip = source.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return ip;
      }
    }
  }
  return null;
}

// Set to true ONLY for local testing APKs (same WiFi as dev machine).
// Must be FALSE for any public release / capstone defense APK.
const USE_LOCAL_FOR_PRODUCTION = false;
const LOCAL_IP = "192.168.1.110"; // Hardcoded fallback for local-only APK builds
const PRODUCTION_URL = "https://faithly-server.onrender.com/api";

function getBaseUrl() {
  if (__DEV__) {
    const ip = getDevIP();
    if (ip) {
      console.log(`[Config] Auto-detected dev IP: ${ip}`);
      return `http://${ip}:${BACKEND_PORT}/api`;
    }
    // Absolute last resort — should rarely hit this
    console.warn("[Config] Could not auto-detect IP. Using localhost.");
    return `http://localhost:${BACKEND_PORT}/api`;
  }

  // Production APK
  if (USE_LOCAL_FOR_PRODUCTION) {
    const ip = getDevIP() || LOCAL_IP;
    return `http://${ip}:${BACKEND_PORT}/api`;
  }

  return PRODUCTION_URL;
}

// Web backend (faithlyweb server) — port 5000 locally, same Render host in prod
// Handles: /attendance/my-attendance, /notifications/feed
const WEB_BACKEND_PORT = 5000;

function getWebBaseUrl() {
  if (__DEV__) {
    const ip = getDevIP();
    if (ip) return `http://${ip}:${WEB_BACKEND_PORT}/api`;
    return `http://localhost:${WEB_BACKEND_PORT}/api`;
  }
  // In production, use same strategy as main backend
  if (USE_LOCAL_FOR_PRODUCTION) {
    const ip = getDevIP() || LOCAL_IP;
    return `http://${ip}:${WEB_BACKEND_PORT}/api`;
  }
  return PRODUCTION_URL;
}

export const API_CONFIG = {
  CUSTOM_BACKEND: {
    BASE_URL: getBaseUrl(),
  },
  WEB_BACKEND: {
    BASE_URL: getWebBaseUrl(),
  },
};

export const DEV_MODE = __DEV__;
