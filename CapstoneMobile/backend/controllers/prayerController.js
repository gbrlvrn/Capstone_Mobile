import PrayerRequest from "../models/PrayerRequest.js";

/**
 * GET /api/prayers?limit=20&skip=0
 */
export async function getRequests(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;

    const requests = await PrayerRequest.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await PrayerRequest.countDocuments();

    return res.json({ requests, total });
  } catch (err) {
    console.error("GET PRAYERS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch prayer requests." });
  }
}

/**
 * POST /api/prayers
 * Body: { email, displayName?, isAnonymous?, request }
 */
export async function createRequest(req, res) {
  try {
    const { email, displayName, isAnonymous, request } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required." });
    if (!request || !request.trim()) {
      return res.status(400).json({ message: "Prayer request text is required." });
    }

    const prayerRequest = await PrayerRequest.create({
      email: email.toLowerCase().trim(),
      displayName: isAnonymous ? "Anonymous" : (displayName || "A Member"),
      isAnonymous: !!isAnonymous,
      request: request.trim(),
    });

    return res.status(201).json({ message: "Prayer request created.", prayerRequest });
  } catch (err) {
    console.error("CREATE PRAYER ERROR:", err);
    return res.status(500).json({ message: "Failed to create prayer request." });
  }
}

/**
 * POST /api/prayers/:id/pray
 * Body: { email }
 */
export async function prayForRequest(req, res) {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required." });

    const prayer = await PrayerRequest.findById(id);
    if (!prayer) return res.status(404).json({ message: "Prayer request not found." });

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already prayed
    if (prayer.prayedBy.includes(cleanEmail)) {
      return res.json({
        message: "Already prayed for this request.",
        prayerCount: prayer.prayerCount,
      });
    }

    prayer.prayedBy.push(cleanEmail);
    prayer.prayerCount = prayer.prayedBy.length;
    await prayer.save();

    return res.json({
      message: "Prayer recorded.",
      prayerCount: prayer.prayerCount,
    });
  } catch (err) {
    console.error("PRAY ERROR:", err);
    return res.status(500).json({ message: "Failed to record prayer." });
  }
}
