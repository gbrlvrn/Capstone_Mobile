

/**
 * Send an Expo Push Notification
 * @param {string} expoPushToken - The user's Expo push token
 * @param {string} title - Title of the notification
 * @param {string} body - Body of the notification
 * @param {object} data - Optional data payload to pass to the app
 */
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  // Expo requires valid tokens to start with ExponentPushToken or ExpoPushToken
  if (!expoPushToken || typeof expoPushToken !== "string") return;
  if (!expoPushToken.startsWith("ExponentPushToken") && !expoPushToken.startsWith("ExpoPushToken")) return;

  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log("Expo Push Response:", result);
    return result;
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}
