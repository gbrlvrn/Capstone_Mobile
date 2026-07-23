import { API_CONFIG } from "./config";

async function post(path, body) {
  const url = `${API_CONFIG.CUSTOM_BACKEND.BASE_URL}${path}`;
  console.log("POST:", url);
  console.log("BODY:", body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log("RESPONSE:", text);

  let data = {};
  try { data = JSON.parse(text); } catch {}

  if (!res.ok) throw new Error(data?.message || text || "Request failed");
  return data;
}

export function sendOTP(email) {
  return post("/resend-otp", { email: String(email || "").trim().toLowerCase() });
}

export function verifyOTP(email, otp) {
  return post("/verify-otp", {
    email: String(email || "").trim().toLowerCase(),
    otp: String(otp || "").trim(),
  });
}

export function sendForgotPasswordOTP(email) {
  return post("/auth/forgot-password", { email: String(email || "").trim().toLowerCase() });
}

export function resetPassword(email, otp, newPassword) {
  return post("/auth/reset-password", {
    email: String(email || "").trim().toLowerCase(),
    otp: String(otp || "").trim(),
    newPassword: String(newPassword || "").trim(),
  });
}
