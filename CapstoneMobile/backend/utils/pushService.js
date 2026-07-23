/**
 * Expo Push Notification utility.
 * Sends push notifications via Expo's push API.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification to one or more Expo push tokens.
 * @param {string|string[]} pushTokens - Expo push token(s)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
export async function sendPushNotification(pushTokens, title, body, data = {}) {
  const tokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];

  // Filter valid Expo tokens
  const validTokens = tokens.filter(
    (t) => typeof t === "string" && t.startsWith("ExponentPushToken[")
  );

  if (validTokens.length === 0) {
    console.log("No valid Expo push tokens to send to.");
    return [];
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
    priority: "high",
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    console.log("Push notification result:", JSON.stringify(result));
    return result.data || [];
  } catch (err) {
    console.error("PUSH NOTIFICATION ERROR:", err);
    return [];
  }
}

/**
 * Send push to a user by email (looks up their stored push token).
 */
export async function sendPushToUser(User, email, title, body, data = {}) {
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select("expoPushToken");
    if (!user?.expoPushToken) return;
    await sendPushNotification(user.expoPushToken, title, body, data);
  } catch (err) {
    console.error("PUSH TO USER ERROR:", err);
  }
}
