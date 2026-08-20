# Backend Cold Start Issue — Action Required

Hi! I wanted to flag a network issue we've been seeing on the mobile app that needs a fix on the server side.

---

## The Problem

Users on fresh devices are getting a **"Network request timed out"** error when they open the app and try to log in or load data. This does **not** happen consistently on my device because I use the app frequently, but it reliably fails for new users or testers who haven't opened the app in a while.

After investigating, the root cause is a **Render.com cold start**.

---

## Why It Happens

The backend is deployed on Render's **free tier**, which automatically **spins down the server after ~15 minutes of inactivity**. When a user opens the app after a period of no traffic, Render needs **30–90 seconds** to wake the server back up before it can respond to any requests.

During that wake-up window, the mobile app's requests time out and the user sees an error — even though nothing is actually wrong with the app or their connection.

**On my device:** The server stays warm because I test frequently.  
**On other devices:** The server is cold, so the first requests always fail.

---

## What We Need From You

There are two options — either one will fully fix the issue:

### ✅ Option 1 — Set Up a Free Keepalive Ping (Recommended, Free)

Set up a free monitoring service called **UptimeRobot** to ping the server every 14 minutes. This keeps Render from ever spinning the server down.

1. Go to [https://uptimerobot.com](https://uptimerobot.com) and create a free account.
2. Click **"Add New Monitor"**.
3. Set the monitor type to **HTTP(s)**.
4. Enter the server health/base URL (e.g., `https://faithly-server.onrender.com/api/health` or any valid endpoint).
5. Set the check interval to **every 14 minutes**.
6. Save it.

That's it — UptimeRobot will ping the server every 14 minutes indefinitely, keeping it warm 24/7 at no cost.

> **Note:** If there is no `/health` endpoint, any existing route that returns a 200 response will work (e.g., the base `/api` route or `/api/settings/public`).

---

### ✅ Option 2 — Upgrade the Render Plan (Paid, ~$7/month)

Upgrade the Render service to the **Starter plan**. This disables the sleep-on-inactivity behavior entirely and guarantees the server is always running.

Steps:
1. Go to the Render dashboard → select the backend service.
2. Click **"Change Plan"** and select **Starter**.

This is the cleanest solution but has a monthly cost.

---

## Optional: Add a `/health` Endpoint

If you want to add a dedicated health check route (recommended for monitoring tools), it's just a one-liner in Express:

```js
// In your main server/app file (e.g., server.js or app.js)
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
```

This gives UptimeRobot (and the mobile app) a lightweight, fast endpoint to ping without touching any database or business logic.

---

## Summary

| Action | Cost | Effort | Fixes the Issue? |
|---|---|---|---|
| UptimeRobot keepalive | Free | ~5 minutes | ✅ Yes |
| Upgrade Render plan | ~$7/mo | ~2 minutes | ✅ Yes |
| Add `/health` endpoint | Free | ~2 minutes | Helps (optional) |

The **UptimeRobot** option is the fastest and cheapest fix. Ideally, we get this done before the capstone defense so testers on fresh devices don't hit the timeout error.

---

## Issue #2 — Missing API Routes on Production Server

While testing, we found that the mobile app is also getting **404 errors** for these two endpoints on the production server:

```
Cannot GET /api/announcements
Cannot GET /api/events
```

The server returns an HTML error page instead of JSON, which means these routes **do not exist** on the deployed production API. They exist in the local mobile backend but were never added to the web server.

The mobile app uses these to display the Home screen's announcements and upcoming events. Without them, those sections always appear empty.

### What Needs to Be Added

Please add these two routes to the production server. Here's the minimal implementation:

```js
// GET /api/announcements — returns active announcements (public, no auth needed)
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({ status: 'active' }).sort({ createdAt: -1 });
    res.json(announcements); // plain array, or wrap in { success: true, data: announcements }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

// GET /api/events — returns upcoming events (public, no auth needed)
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events); // plain array
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});
```

> **Note:** If the Announcement/Event models are named differently on the web server, just use whatever the existing model names are. The important part is that the routes exist and return data in a plain array format.

---

## Summary of All Issues

| Issue | Impact | Action Needed |
|---|---|---|
| Render cold start (server sleeping) | Timeout errors on fresh devices | UptimeRobot keepalive or plan upgrade |
| Missing `GET /api/announcements` | Home screen announcements always empty | Add route to production server |
| Missing `GET /api/events` | Home screen events always empty | Add route to production server |

Let me know if you have any questions!
