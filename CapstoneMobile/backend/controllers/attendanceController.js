import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import AttendanceSession from "../models/AttendanceSession.js";

/**
 * POST /api/attendance/check-in
 * Body: { community?, location?: { latitude, longitude }, notes? }
 */
export async function checkIn(req, res) {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Prevent duplicate manual check-in within the same day
    // Only check for non-session (manual) check-ins
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existing = await Attendance.findOne({
      email,
      type: "check-in",
      sessionId: { $in: [null, ""] },
      createdAt: { $gte: startOfDay },
    });
    if (existing) {
      return res.status(409).json({ message: "Already checked in today.", attendance: existing });
    }

    const attendance = await Attendance.create({
      userId: user._id,
      email,
      type: req.body.type || "check-in",
      community: req.body.community || user.community || "",
      location: req.body.location || {},
      notes: req.body.notes || "",
    });

    return res.status(201).json({ message: "Check-in recorded.", attendance });
  } catch (err) {
    console.error("CHECK-IN ERROR:", err);
    return res.status(500).json({ message: "Failed to record attendance." });
  }
}

/**
 * GET /api/attendance/history?limit=20&skip=0
 */
export async function getHistory(req, res) {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;

    const records = await Attendance.find({ email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Attendance.countDocuments({ email });

    return res.json({ records, total });
  } catch (err) {
    console.error("ATTENDANCE HISTORY ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch attendance history." });
  }
}

/**
 * GET /api/attendance/stats
 * Returns: totalCheckIns, currentStreak, thisMonthCount
 */
export async function getStats(req, res) {
  try {
    const email = req.user?.email;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const totalCheckIns = await Attendance.countDocuments({ email, type: "check-in" });

    // This month count
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCount = await Attendance.countDocuments({
      email,
      type: "check-in",
      createdAt: { $gte: startOfMonth },
    });

    // Calculate streak (consecutive days with check-in)
    const recentCheckins = await Attendance.find({ email, type: "check-in" })
      .sort({ createdAt: -1 })
      .limit(90)
      .lean();

    let currentStreak = 0;
    if (recentCheckins.length > 0) {
      const uniqueDays = new Set();
      recentCheckins.forEach((r) => {
        const d = new Date(r.createdAt);
        uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      });

      const sortedDays = Array.from(uniqueDays)
        .map((s) => {
          const [y, m, d] = s.split("-").map(Number);
          return new Date(y, m, d);
        })
        .sort((a, b) => b - a);

      // Count consecutive days from today/yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedDays.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        expected.setHours(0, 0, 0, 0);

        const day = sortedDays[i];
        day.setHours(0, 0, 0, 0);

        if (day.getTime() === expected.getTime()) {
          currentStreak++;
        } else if (i === 0) {
          // Allow starting from yesterday
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (day.getTime() === yesterday.getTime()) {
            currentStreak++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    return res.json({ totalCheckIns, currentStreak, thisMonthCount });
  } catch (err) {
    console.error("ATTENDANCE STATS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch attendance stats." });
  }
}

/**
 * POST /api/attendance/scan-qr
 * Body: { sessionId: "SESS-2026-0001" }
 */
export async function scanQR(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    // Find the active session
    const session = await AttendanceSession.findOne({ sessionId: sessionId, status: 'active' });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Active session not found or has ended.' });
    }

    const email = req.user?.email;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check if they already checked in to THIS session
    const existing = await Attendance.findOne({ sessionId: session.sessionId, email: user.email });
    if (existing) {
      return res.status(200).json({ success: true, alreadyLogged: true, message: 'You have already checked in for this session.' });
    }

    const now = new Date();
    // Determine Present vs Late based on session grace period
    const startPlusGrace = new Date(session.startDateTime.getTime() + (session.gracePeriodMinutes * 60000));
    const isLate = now > startPlusGrace;
    const status = isLate ? 'Late' : 'Present';

    const count = await Attendance.countDocuments();
    const recordId = `A-${now.getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const newRecord = {
      userId: user._id,
      recordId, 
      sessionId: session.sessionId,
      email: user.email, 
      type: 'check-in',
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

    // Use the mongoose model to create the document
    await Attendance.create(newRecord);

    return res.status(201).json({ success: true, message: `Checked in as ${status} successfully!` });

  } catch(err) {
    console.error("SCAN QR ERROR:", err);
    return res.status(500).json({ success: false, message: 'Failed to record check-in.' });
  }
}

