# QR Attendance Fix — Web Server Changes Required

**From:** Mobile Dev (Gabriel)  
**To:** Web Dev  
**Date:** August 22, 2026  
**Priority:** High — Both QR attendance flows are broken

---

## Summary

There are **2 QR attendance flows** between mobile and web, and **both are broken** due to missing/mismatched routes on the web server. The mobile app code is already correct — all fixes are on `faithlyweb/server/src/routes/attendance.js`.

---

## Bug #1: Mobile Cannot Scan Session QR

### What Should Happen
1. Admin starts a session on the web → QR code displays `sessionId` (e.g. `SESS-2026-0822200523`)
2. Mobile user opens Attendance → Scan Service QR → scans the QR
3. Mobile sends `POST /api/attendance/scan-qr` with `{ "sessionId": "SESS-2026-0822200523" }`
4. User gets checked in

### What Actually Happens
- Mobile sends the request to `https://api.puacfaithly.com/api/attendance/scan-qr`
- **404 Not Found** — this route does not exist on the web server

### Root Cause
The web server's `attendance.js` has routes for:
- `POST /admin/attendance/sessions/start` ✅
- `POST /admin/attendance/log-tap` ✅
- `GET /attendance/my-attendance` ✅
- **`POST /attendance/scan-qr`** ❌ **MISSING**

### Fix Required
Add a `POST /attendance/scan-qr` route to `attendance.js` with `authenticateUser` middleware. Here is the exact implementation:

```javascript
/* ================== USER - SCAN SESSION QR (MOBILE) ================== */
router.post('/attendance/scan-qr', authenticateUser, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    // Find the active session
    const session = await attendanceSessions.findOne({ sessionId: sessionId, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Active session not found or has ended.' });
    }

    const email = req.user.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check if already checked in to THIS session
    const existing = await attendance.findOne({ sessionId: session.sessionId, email: user.email });
    if (existing) {
      return res.status(200).json({ success: true, alreadyLogged: true, message: 'You have already checked in for this session.' });
    }

    const now = new Date();

    // Determine Present vs Late based on grace period
    const startPlusGrace = new Date(new Date(session.startDateTime).getTime() + (session.gracePeriodMinutes * 60000));
    const isLate = now > startPlusGrace;
    const status = isLate ? 'Late' : 'Present';

    const count = await attendance.countDocuments();
    const recordId = `A-${now.getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const newRecord = {
      recordId,
      sessionId: session.sessionId,
      email: user.email,
      member: user.fullName || user.name,
      service: session.serviceType,
      branch: session.branch,
      userBranch: user.branch,
      method: 'QR Scan',
      rfidCardId: user.rfidCardId || null,
      status,
      date: now.toLocaleDateString('en-US'),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      createdAt: now
    };

    await attendance.insertOne(newRecord);

    return res.status(201).json({ success: true, message: `Checked in as ${status} successfully!` });
  } catch (err) {
    console.error('SCAN QR ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to record check-in.' });
  }
});
```

> **Where to add:** Place this route in `attendance.js` right before the existing `GET /attendance/my-attendance` route (around line 330).

---

## Bug #2: Web Cannot Scan Mobile's Member QR

### What Should Happen
1. Mobile user opens Profile → taps Digital Member Pass → shows QR code
2. Admin scans that QR at the RFID station (web's `/admin/rfid-preview`)
3. Attendance recorded for that member

### What Actually Happens
- The mobile QR contains the **user's email** (e.g. `juan@example.com`)
- The web's `AdminRFIDPreview.js` sends it as: `{ cardId: "juan@example.com", method: "RFID", minLevelSessionId: "SESS-..." }`
- The `log-tap` route does: `user = await users.findOne({ rfidCardId: cardId })`
- No user has `rfidCardId: "juan@example.com"` → **"User not found / Unregistered Card"**

### Root Cause
The `log-tap` route only looks up users by `rfidCardId`, but the mobile QR contains an **email address**, not an RFID card ID.

### Fix Required
Modify the `POST /admin/attendance/log-tap` route to detect when the scanned value is an email (contains `@`) and look up by email instead:

```javascript
// In the existing log-tap route, replace the user lookup section:

// --- CURRENT CODE (around line 174-181) ---
let user = null;
if (method === 'Manual') {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ success: false, message: 'Member ID required for manual entry' });
    user = await users.findOne({ memberId });
} else {
    user = await users.findOne({ rfidCardId: cardId });
}

// --- REPLACE WITH ---
let user = null;
let resolvedMethod = method || 'RFID';
if (method === 'Manual') {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ success: false, message: 'Member ID required for manual entry' });
    user = await users.findOne({ memberId });
} else if (cardId && cardId.includes('@')) {
    // Mobile QR code contains the user's email address
    user = await users.findOne({ email: cardId.trim().toLowerCase() });
    resolvedMethod = 'QR Scan';
} else {
    user = await users.findOne({ rfidCardId: cardId });
}
```

Then also update the record's `method` field further down in the same route:

```javascript
// Change this line:
method: method || 'RFID',

// To this:
method: resolvedMethod,
```

---

## Quick Reference: What the Mobile Sends

| Flow | QR Content | Endpoint | Body |
|------|-----------|----------|------|
| Mobile scans session QR | `SESS-2026-0822200523` | `POST /api/attendance/scan-qr` | `{ "sessionId": "SESS-2026-0822200523" }` |
| Web scans member QR | `juan@example.com` | `POST /api/admin/attendance/log-tap` | `{ "cardId": "juan@example.com", "method": "RFID", "minLevelSessionId": "SESS-..." }` |

---

## Testing Checklist

After implementing, verify:

- [ ] Start a session on admin panel
- [ ] Mobile scans session QR → should get "Checked in as Present/Late successfully!"
- [ ] Mobile scans same QR again → should get "You have already checked in for this session."
- [ ] Mobile scans QR with no active session → should get "Active session not found or has ended."
- [ ] Web RFID station scans mobile member QR (email) → should check in the member
- [ ] Web RFID station scans same member QR again → should get "Already recorded"
- [ ] Regular RFID card tap still works as before (no regression)
- [ ] Manual entry by Member ID still works as before (no regression)

---

## Files to Modify

Only **1 file** needs changes:

```
faithlyweb/server/src/routes/attendance.js
```

- **Add:** `POST /attendance/scan-qr` route (new, ~40 lines)
- **Modify:** `POST /admin/attendance/log-tap` route (email detection, ~5 lines changed)

No frontend changes needed. No mobile changes needed.
