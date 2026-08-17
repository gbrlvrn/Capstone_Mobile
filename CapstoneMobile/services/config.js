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
const PRODUCTION_URL = "https://api.puacfaithly.com/api";

function getBaseUrl() {
  // Production APK (eas build) — always use deployed URL
  if (!__DEV__) {
    if (USE_LOCAL_FOR_PRODUCTION) {
      const ip = getDevIP() || LOCAL_IP;
      return `http://${ip}:${BACKEND_PORT}/api`;
    }
    return PRODUCTION_URL;
  }

  // Expo Go / dev client — ALSO use production URL so login/register work.
  // The local backend (port 5001) is only a subset of routes and lacks
  // /login, /register, /notifications/feed, etc. which live on the web server.
  // Override this ONLY if you are actively developing local backend routes.
  const FORCE_LOCAL_IN_DEV = false;
  if (FORCE_LOCAL_IN_DEV) {
    const ip = getDevIP();
    if (ip) {
      console.log(`[Config] Dev mode: using local backend at ${ip}:${BACKEND_PORT}`);
      return `http://${ip}:${BACKEND_PORT}/api`;
    }
  }

  console.log(`[Config] Dev mode: using production URL (${PRODUCTION_URL})`);
  return PRODUCTION_URL;
}

// Web backend (faithlyweb server) — port 5000 locally, same Render host in prod
// Handles: /attendance/my-attendance, /notifications/feed
const WEB_BACKEND_PORT = 5000;

function getWebBaseUrl() {
  // Web backend always uses the same production URL as the main backend.
  // Both CUSTOM_BACKEND and WEB_BACKEND point to faithly-server.onrender.com
  // since all routes (/login, /register, /notifications/feed, /loans, etc.)
  // are served from the same Render deployment.
  if (!__DEV__) {
    if (USE_LOCAL_FOR_PRODUCTION) {
      const ip = getDevIP() || LOCAL_IP;
      return `http://${ip}:${WEB_BACKEND_PORT}/api`;
    }
    return PRODUCTION_URL;
  }
  // Dev mode: also use production (see getBaseUrl rationale above)
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
