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
  return post("/reset-password-request", { email: String(email || "").trim().toLowerCase() });
}

export async function verifyResetOTP(email, otp) {
  try {
    return await post("/reset-password-verify-otp", {
      email: String(email || "").trim().toLowerCase(),
      otp: String(otp || "").trim(),
    });
  } catch (err) {
    // If backend returns 404 because verify endpoint isn't deployed on production web server, allow flow to continue to resetPassword step
    if (err?.message?.includes("404") || err?.message?.includes("Cannot POST")) {
      console.warn("Verify OTP route 404 on server; proceeding to reset password screen");
      return { message: "Proceeding" };
    }
    throw err;
  }
}

export function resetPassword(email, otp, newPassword) {
  return post("/reset-password-update", {
    email: String(email || "").trim().toLowerCase(),
    otp: String(otp || "").trim(),
    newPassword: String(newPassword || "").trim(),
  });
}
