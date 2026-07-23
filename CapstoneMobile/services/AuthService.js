import { API_CONFIG } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@faithly_token";

// ── Token Management ────────────────────────────────────────────────

export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ── JWT Role Decoder ─────────────────────────────────────────────────
// Role is NOT returned from /me — it lives in the JWT payload only.
export function decodeTokenRole() {
  try {
    const token = AsyncStorage.getItem(TOKEN_KEY); // sync-ish via cache
    // Parse payload (base64url part 2)
    return null; // Use async version below
  } catch { return null; }
}

export async function getTokenPayload() {
  try {
    const token = await getToken();
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── HTTP Helpers ────────────────────────────────────────────────────

async function request(method, path, body, requiresAuth = false) {
  const url = `${API_CONFIG.CUSTOM_BACKEND.BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json" };

  if (requiresAuth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}

    // 401 — token expired or invalid → clear + throw so screens can redirect
    if (res.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      throw new Error("Invalid or expired token");
    }

    if (!res.ok) throw new Error(data?.message || text || "Request failed");
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError")
      throw new Error("Network request timed out. Please check your connection.");
    throw error;
  }
}

async function get(path, requiresAuth = false) {
  return request("GET", path, null, requiresAuth);
}

// ── Web Backend Helper (faithlyweb server, port 5000) ────────────────
// Used for endpoints that only exist on the web backend:
//   /attendance/my-attendance, /notifications/feed
async function webGet(path, requiresAuth = false) {
  const url = `${API_CONFIG.WEB_BACKEND.BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (requiresAuth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { method: "GET", headers, signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (res.status === 401) { await AsyncStorage.removeItem(TOKEN_KEY); throw new Error("Invalid or expired token"); }
    if (!res.ok) throw new Error(data?.message || text || "Request failed");
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") throw new Error("Network request timed out.");
    throw error;
  }
}

// POST helper for the web backend (port 5000 / faithlyweb)
async function webPost(path, body, requiresAuth = true) {
  const url = `${API_CONFIG.WEB_BACKEND.BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (requiresAuth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (res.status === 401) { await AsyncStorage.removeItem(TOKEN_KEY); throw new Error("Invalid or expired token"); }
    if (!res.ok) throw new Error(data?.message || text || "Request failed");
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") throw new Error("Network request timed out.");
    throw error;
  }
}

// PUT helper for the web backend
async function webPut(path, body, requiresAuth = true) {
  const url = `${API_CONFIG.WEB_BACKEND.BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (requiresAuth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body), signal: controller.signal });
    clearTimeout(timeoutId);
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (res.status === 401) { await AsyncStorage.removeItem(TOKEN_KEY); throw new Error("Invalid or expired token"); }
    if (!res.ok) throw new Error(data?.message || text || "Request failed");
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") throw new Error("Network request timed out.");
    throw error;
  }
}

// ── Role Normalizer ─────────────────────────────────────────────────
// Web backend returns role: "user" for regular members.
// Mobile uses "member" internally. Map accordingly.
const OFFICER_POSITIONS = [
  "deacon", "local evangelist", "district evangelist", "national evangelist",
  "assistant priest", "priest", "elder", "district elder",
  "bishop", "district bishop", "national bishop", "apostle",
];

function normalizeRole(user) {
  if (!user) return user;
  const pos = (user.position || "").trim().toLowerCase();
  if (OFFICER_POSITIONS.includes(pos)) {
    user.role = "officer";
  } else if (user.role && ["admin", "loanAdmin", "secretaryAdmin"].includes(user.role)) {
    user.role = "officer";
  } else if (user.role === "user" || user.role === "member" || !user.role) {
    user.role = "member";
  }
  return user;
}

// ── Auth Endpoints ──────────────────────────────────────────────────

export async function signupUser(payload) {
  const data = await request("POST", "/register", payload);
  if (data.token) await saveToken(data.token);
  return data;
}

export async function loginUser(email, password) {
  const data = await request("POST", "/login", { email, password });
  if (data && data.user) {
    data.user = normalizeRole(data.user);
  }
  if (data.token) await saveToken(data.token);
  return data;
}

export function checkEmailExists(email) {
  const clean = encodeURIComponent(email.trim().toLowerCase());
  return get(`/auth/exists?email=${clean}`);
}

export function verifyOTP(email, otp) {
  return request("POST", "/verify-otp", { email, otp });
}

export function resendOTP(email) {
  return request("POST", "/resend-otp", { email });
}

export function requestPasswordReset(email) {
  return request("POST", "/reset-password-request", { email });
}

export function verifyPasswordResetOTP(email, otp) {
  return request("POST", "/reset-password-verify-otp", { email, otp });
}

export function updatePassword(email, otp, newPassword) {
  return request("POST", "/reset-password-update", { email, otp, newPassword });
}

// GET /api/me — returns current authenticated user profile
// NOTE: role is NOT in this response — decode JWT with getTokenPayload() for role
export async function getProfile() {
  return get("/me", true);
}

// PUT /api/update-profile — update editable profile fields
export function updateProfile(fields) {
  return request("PUT", "/update-profile", fields, true);
}

// DELETE /api/delete-account — requires current password (NOT email)
export function deleteAccount(password) {
  return request("DELETE", "/delete-account", { password }, true);
}

export function getPublicSettings() {
  return get("/settings/public");
}

// ── Branches ────────────────────────────────────────────────────────

export async function getBranches() {
  try {
    const fetchPromise = get("/public/branches");
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Branch fetch timeout")), 8000)
    );
    const data = await Promise.race([fetchPromise, timeoutPromise]);
    if (data && data.success) return data;
    if (Array.isArray(data)) return { success: true, branches: data };
    if (data && data.branches) return { success: true, branches: data.branches };
    throw new Error("Invalid format");
  } catch (e) {
    console.log("Fallback branches:", e.message);
    // Local hardcoded fallback (offline only)
    const COMMUNITIES = {
      "Kalinga": ["Tabuk", "Zapote", "Bliss", "Libanon", "Batong Buhay", "Balatoc", "Lat-nog"],
      "Isabela": ["Santiago City"],
      "Abra": ["Lamao", "Lingey", "Cabaruyan", "Ducligan", "Gangal", "Bila-Bila", "Naguillian", "Ud-udiao", "Villa Conchita", "Ay-yeng Manabo", "Dao-angan", "Kilong-olao", "Bao-yan", "Amti", "Danac", "Bengued", "Sappaac", "Saccaang"],
      "Benguet": ["Baguio"],
      "Rizal": ["Montalban"],
      "NCR": ["Valenzuela City", "Tandang Sora, Quezon City", "COA, Quezon City", "Payatas, Quezon City", "Malaria, Caloocan"],
      "Bulacan": ["Meycauayan City", "Camalig", "San Jose Del Monte"],
      "Tarlac": ["Pacpaco, San Manuel", "Victoria"],
      "Nueva Ecija": ["Bambanaba, Cuyapo"],
      "Pangasinan": ["Dagupan", "Mangatarem", "Laoak Langka", "Orbiztondo", "Malasiqui, Bolaoit", "Taloyan", "Binmaley", "San Carlos", "Manaoag", "Pozorrubio", "Alcala"],
      "Agusan Del Norte": ["Butuan City", "RTR", "Jabonga, Bangonay", "Kasiklan", "San Mateo", "Fatima Kim.13", "Bayugan", "Ibuan", "Balubo"],
      "Cebu": ["Mandaue", "Liloan", "Calero", "Compostela"],
      "Surigao Del Norte": ["Alegria", "Bonifacio", "Matin-ao", "Ipil"],
      "Surigao Del Sur": ["Kinabigtasan, Tago"],
    };
    const branches = [];
    let idCounter = 1;
    for (const [province, names] of Object.entries(COMMUNITIES)) {
      for (const name of names) {
        branches.push({ _id: String(idCounter++), name, province, members: 0, officers: 0 });
      }
    }
    return { success: true, branches };
  }
}

// ── Profile Photo Upload ────────────────────────────────────────────
// Uses PUT /api/upload-photo-file (multipart) — preferred for mobile

export async function uploadProfilePhoto(photoUri) {
  const url = `${API_CONFIG.CUSTOM_BACKEND.BASE_URL}/upload-photo-file`;
  const token = await getToken();

  const formData = new FormData();
  formData.append("photo", {
    uri: photoUri,
    name: `profile_${Date.now()}.jpg`,
    type: "image/jpeg",
  });

  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}
  if (res.status === 401) { await clearToken(); throw new Error("Invalid or expired token"); }
  if (!res.ok) throw new Error(data?.message || text || "Upload failed");
  return data;
}

// ── Verification ────────────────────────────────────────────────────

export async function submitVerification(payload) {
  // payload = { churchId, position }
  return request("POST", "/verification/submit", payload, true);
}

// In-memory cache for verification status (clears on full app reload)
let _verificationCache = null;
let _verificationCacheTime = 0;
const VERIFICATION_CACHE_TTL = 60 * 1000; // 1 minute

export function clearVerificationCache() {
  _verificationCache = null;
  _verificationCacheTime = 0;
}

export async function getVerificationStatus(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _verificationCache && (now - _verificationCacheTime) < VERIFICATION_CACHE_TTL) {
    return _verificationCache;
  }
  try {
    // Backend requires ?email= in the query string — read it from stored session
    const stored = await AsyncStorage.getItem("faithly_user");
    const parsed = stored ? JSON.parse(stored) : {};
    const email = parsed.email || "";

    if (!email) throw new Error("No email in storage");

    const encoded = encodeURIComponent(email);
    const data = await get(`/verification/status?email=${encoded}`, true);
    if (data) {
      if (data.verificationStatus === "verified") data.role = "officer";
      else if (data.role && ["admin", "loanAdmin", "secretaryAdmin"].includes(data.role)) data.role = "officer";
      else if (data.role === "user") data.role = "member";
    }
    _verificationCache = data;
    _verificationCacheTime = now;
    return data;
  } catch (e) {
    if (_verificationCache) return _verificationCache; // return stale cache on error
    throw e;
  }
}

// ── Push Notifications ──────────────────────────────────────────────

export function registerPushToken(expoPushToken) {
  // Sent via update-profile, not a separate route
  return request("PUT", "/update-profile", { expoPushToken }, true);
}

// ── Loan Endpoints ──────────────────────────────────────────────────
// All loan operations route to the web backend (port 5000)
// since POST /loans/:id/pay and other routes only exist there.

export function createLoan(loanData) {
  return webPost("/loans/apply", loanData, true);
}

export function getLoans(page = 1, limit = 10) {
  return webGet(`/loans/my-loans?page=${page}&limit=${limit}`, true);
}

export function getLoanById(loanId) {
  return webGet(`/loans/${loanId}`, true);
}

export function getLoanSchedule(loanId) {
  return webGet(`/loans/${loanId}/schedule`, true);
}

// POST /api/loans/:id/pay — submit a loan payment (web backend only)
// paymentData: { paymentMethod, subMethod, accountName, accountNumber, proofData, proofFileName, successUrl, cancelUrl }
export function submitLoanPayment(loanId, paymentData) {
  return webPost(`/loans/${loanId}/pay`, paymentData, true);
}

// GET /api/loans/my-payments — all loan payment records
export function getMyLoanPayments(limit = 50) {
  return webGet(`/loans/my-payments?limit=${limit}`, true);
}

// GET /api/loans/my-pending-payments — pending loan payments only
export function getMyPendingLoanPayments() {
  return webGet("/loans/my-pending-payments", true);
}

// PUT /api/loans/:id/cancel
export function cancelLoan(loanId, reason = "") {
  return webPut(`/loans/${loanId}/cancel`, { reason }, true);
}

// PUT /api/loans/:id/respond-terms — accept or decline modified loan terms
export function respondToLoanTerms(loanId, accepted) {
  return webPut(`/loans/${loanId}/respond-terms`, { accepted }, true);
}

// POST /api/loans/verify-id — Gemini Vision AI ID validation (local backend, port 5001)
// body: { base64: string, mimeType: string }
// returns: { valid: boolean, idType: string|null, confidence: string, reason: string }
export function verifyIdImage(base64, mimeType = "image/jpeg") {
  return request("POST", "/loans/verify-id", { base64, mimeType }, true);
}

// ── Donation Endpoints ──────────────────────────────────────────────

export function createDonation(donationData) {
  // Manual mode fields: amount, category, community, paymentMethod,
  //   isRecurring, proofOfPayment (base64), subMethod, accountName, accountNumber
  // Gateway mode fields: amount, category, paymentMethod, isRecurring
  return request("POST", "/donations", donationData, true);
}

export function getDonations(page = 1, limit = 50, category = "") {
  let url = `/donations/my-donations?page=${page}&limit=${limit}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  return get(url, true);
}

// ── Savings Endpoints ───────────────────────────────────────────────

export async function getSavingsData(txnLimit = 50, goalPage = 1, goalLimit = 20) {
  try {
    const data = await get(
      `/savings/overview?txnLimit=${txnLimit}&goalPage=${goalPage}&goalLimit=${goalLimit}`,
      true
    );
    return {
      // Normalize field names — backend returns "transactions", mobile used "savings"
      savings: data.transactions || data.savings || data.deposits || [],
      goals: (data.goals || []).map(g => ({
        ...g,
        id: g._id || g.id,
        target: g.targetAmount,       // backend: targetAmount → mobile: target
        amountSaved: g.savedAmount || 0, // backend: savedAmount → mobile: amountSaved
      })),
      stats: data.stats || {},
    };
  } catch (e) {
    if (e.message === "Invalid or expired token") throw e;
    throw e;
  }
}

export function getSavingsGoals(all = false, page = 1, limit = 20) {
  // Use web backend so goal IDs are valid MongoDB ObjectIds for deposit submissions
  const url = all ? "/savings/goals?all=true" : `/savings/goals?page=${page}&limit=${limit}`;
  return webGet(url, true);
}

export function createSavingsGoal(goalData) {
  return webPost("/savings/goals", goalData, true);
}

export function updateSavingsGoal(goalId, fields) {
  return request("PUT", `/savings/goals/${goalId}`, fields, true);
}

export function deleteSavingsGoal(goalId) {
  return request("DELETE", `/savings/goals/${goalId}`, null, true);
}

export function createSavingsDeposit(depositData) {
  // Calls web backend — so deposits appear in web admin Payment Approvals
  // Expected fields: goalId, amount, description, source, paymentMethod,
  //   proofOfPayment, subMethod, accountName, accountNumber
  return webPost("/savings/deposit", depositData, true);
}

export function createSavingsWithdrawal(withdrawalData) {
  // fields: goalId, amount, reason, sendMethod, accountNumber, accountName
  return webPost("/savings/withdraw", withdrawalData, true);
}

export function createSavingsTransfer(transferData) {
  // fields: fromGoalId, toGoalId, amount, note
  return webPost("/savings/transfer", transferData, true);
}

export function getSavingsTransactions(page = 1, limit = 10, goalId = "") {
  let url = `/savings/transactions?page=${page}&limit=${limit}`;
  if (goalId) url += `&goalId=${goalId}`;
  return webGet(url, true);
}

// ── Attendance Endpoints ────────────────────────────────────────────

// POST /api/attendance/scan-qr — ONLY valid check-in route
export function scanQRAttendance(sessionId) {
  return request("POST", "/attendance/scan-qr", { sessionId }, true);
}

// Alias for backward compat — always uses scan-qr
export function checkInAttendance(data) {
  const sessionId = data.sessionId || data.qrCode || data.code || "";
  return request("POST", "/attendance/scan-qr", { sessionId }, true);
}

// GET /api/attendance/my-attendance — on web backend (port 5000)
export function getAttendanceHistory(page = 1, limit = 10) {
  return webGet(`/attendance/my-attendance?page=${page}&limit=${limit}`, true);
}

// GET /api/attendance/my-attendance stats — on web backend
export function getAttendanceStats() {
  return webGet("/attendance/my-attendance?limit=1", true);
}

// ── Announcements & Events ──────────────────────────────────────────
// Backend: GET /api/announcements → returns a plain array []
//          GET /api/events        → returns a plain array []

// Shared cache to prevent duplicate network calls on the same screen
let _announcementsCache = null;
let _announcementsCacheTime = 0;
const ANNOUNCEMENTS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function getAnnouncements() {
  try {
    const now = Date.now();
    if (_announcementsCache && (now - _announcementsCacheTime) < ANNOUNCEMENTS_CACHE_TTL) {
      return _announcementsCache;
    }
    // Correct endpoint: /api/announcements — returns a plain array
    const result = await get("/announcements", false);
    // Normalise: handle plain array, { data: [] }, { announcements: [] }
    let list = [];
    if (Array.isArray(result)) {
      list = result;
    } else if (result?.data && Array.isArray(result.data)) {
      list = result.data;
    } else if (result?.announcements && Array.isArray(result.announcements)) {
      list = result.announcements;
    }
    _announcementsCache = list;
    _announcementsCacheTime = now;
    return list;
  } catch (err) {
    console.error("Error fetching announcements:", err.message);
    return _announcementsCache || []; // return stale cache on network error
  }
}

export async function getEvents() {
  try {
    // Correct endpoint: /api/events — returns a plain array
    const result = await get("/events", false);
    if (Array.isArray(result)) return result;
    if (result?.data && Array.isArray(result.data)) return result.data;
    if (result?.events && Array.isArray(result.events)) return result.events;
    return [];
  } catch (err) {
    console.error("Error fetching events:", err.message);
    return [];
  }
}


// ── Chat Endpoint ────────────────────────────────────────────────────

export function chatWithBot(payload) {
  // payload: { message, history: [{ sender, text }] }
  return request("POST", "/chat", payload, true);
}

// ── Prayer Endpoints ─────────────────────────────────────────────────

export function getPrayerRequests(limit = 20, skip = 0) {
  return get(`/prayers?limit=${limit}&skip=${skip}`, true);
}

export function createPrayerRequest(data) {
  // data: { text, author }
  return request("POST", "/prayers", data, true);
}

export function prayForRequest(requestId, email) {
  return request("POST", `/prayers/${requestId}/pray`, { email });
}

// ── Notifications Endpoints ──────────────────────────────────────────

export async function getNotificationsFeed() {
  try {
    // Notifications feed lives on the web backend (port 5000 / faithlyweb)
    return await webGet("/notifications/feed", true);
  } catch (e) {
    console.error("Notifications feed error:", e.message);
    return {
      readIds: [],
      loans: [], payments: [], donations: [],
      attendance: [], savings: [], announcements: [],
    };
  }
}


export async function getReadNotificationIds() {
  try {
    // Read state is local — stored in AsyncStorage, no backend endpoint needed
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    const raw = await AsyncStorage.getItem("faithly_read_notification_ids");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Read notifications fetch error:", e.message);
    return [];
  }
}

export async function markNotificationsRead(ids) {
  if (!ids || ids.length === 0) return;
  try {
    // Persist read IDs locally — merge with existing
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    const raw = await AsyncStorage.getItem("faithly_read_notification_ids");
    const existing = raw ? JSON.parse(raw) : [];
    const merged = Array.from(new Set([...existing, ...ids]));
    await AsyncStorage.setItem("faithly_read_notification_ids", JSON.stringify(merged));
  } catch (e) {
    console.error("Mark read error:", e.message);
  }
}



// ── Saved Payment Accounts ───────────────────────────────────────────

export function getSavedAccounts() {
  return get("/saved-accounts", true);
}

export function savePaymentAccount(accountData) {
  // fields: method, accountNumber, accountName, label
  return request("POST", "/saved-accounts", accountData, true);
}

// ── RSVP (kept for events if needed) ────────────────────────────────

export function rsvpEvent(eventId, email, headcount = 1) {
  return request("POST", `/events/${eventId}/rsvp`, { email, headcount });
}
