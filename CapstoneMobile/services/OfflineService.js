/**
 * OfflineService.js
 * Manages connectivity detection, action queueing, and data caching.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "./config";

const QUEUE_KEY = "@faithly_offline_queue";
const CONNECTIVITY_CHECK_URL = `${API_CONFIG.CUSTOM_BACKEND.BASE_URL.replace("/api", "")}/`;

/**
 * Check if the device can reach the backend.
 */
export async function isOnline() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(CONNECTIVITY_CHECK_URL, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Add an action to the offline queue.
 * @param {string} type - e.g. "donation", "attendance"
 * @param {object} payload - the data to send when back online
 */
export async function queueAction(type, payload) {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current offline queue.
 */
export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a completed item from the queue.
 */
export async function removeFromQueue(id) {
  try {
    const queue = await getQueue();
    const updated = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  } catch {}
}

/**
 * Clear the entire queue.
 */
export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Cache data locally.
 */
export async function cacheData(key, data) {
  try {
    await AsyncStorage.setItem(
      `@offline_cache_${key}`,
      JSON.stringify({ data, cachedAt: new Date().toISOString() })
    );
  } catch {}
}

/**
 * Get cached data.
 */
export async function getCachedData(key) {
  try {
    const raw = await AsyncStorage.getItem(`@offline_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}
