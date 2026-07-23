import Event from "../models/Event.js";
import User from "../models/User.js";
import { sendPushNotification } from "../utils/pushNotifications.js";

/**
 * GET /api/events
 * Returns upcoming events sorted by date.
 */
export async function getEvents(req, res) {
  try {
    const events = await Event.find({ date: { $gte: new Date() } })
      .sort({ date: 1 })
      .limit(50)
      .lean();

    // Add rsvpCount to each event
    const result = events.map((e) => ({
      ...e,
      rsvpCount: e.rsvps ? e.rsvps.reduce((sum, r) => sum + (r.headcount || 1), 0) : 0,
    }));

    return res.json({ events: result });
  } catch (err) {
    console.error("GET EVENTS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch events." });
  }
}

/**
 * POST /api/events/:id/rsvp
 * Body: { email, headcount? }
 */
export async function rsvpEvent(req, res) {
  try {
    const { id } = req.params;
    const { email, headcount = 1 } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required." });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found." });

    // Check if already RSVP'd
    const existingIdx = event.rsvps.findIndex(
      (r) => r.email.toLowerCase() === email.toLowerCase()
    );

    if (existingIdx >= 0) {
      // Update headcount
      event.rsvps[existingIdx].headcount = headcount;
    } else {
      event.rsvps.push({ email: email.toLowerCase(), headcount });
    }

    await event.save();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user && user.expoPushToken) {
      sendPushNotification(
        user.expoPushToken,
        "RSVP Confirmed",
        `You have successfully RSVP'd to "${event.title}".`,
        { screen: "Events", category: "announcement" }
      ).catch(err => console.error("Push error:", err));
    }

    const rsvpCount = event.rsvps.reduce((sum, r) => sum + (r.headcount || 1), 0);

    return res.json({ message: "RSVP recorded.", rsvpCount });
  } catch (err) {
    console.error("RSVP ERROR:", err);
    return res.status(500).json({ message: "Failed to RSVP." });
  }
}

/**
 * POST /api/events/seed
 * Seeds sample events for development/testing purposes.
 */
export async function seedEvents(req, res) {
  try {
    const existing = await Event.countDocuments();
    if (existing > 0) {
      return res.json({ message: "Events already exist.", count: existing });
    }

    const now = new Date();
    const sampleEvents = [
      {
        title: "Sunday Worship Service",
        description: "Join us for our weekly Sunday worship. Everyone is welcome!",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7 || 7)),
        time: "8:00 AM - 10:00 AM",
        location: "Main Chapel",
        community: "General",
      },
      {
        title: "Youth Fellowship Night",
        description: "An evening of worship, games, and fellowship for the youth ministry.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
        time: "6:00 PM - 9:00 PM",
        location: "Fellowship Hall",
        community: "Youth Ministry",
      },
      {
        title: "Prayer & Fasting Week",
        description: "A week-long prayer and fasting event. Join us as we seek God's guidance.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
        time: "5:00 AM - 6:00 AM Daily",
        location: "Prayer Room",
        community: "General",
      },
      {
        title: "Community Outreach",
        description: "Help distribute food and supplies to families in need in the community.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14),
        time: "7:00 AM - 12:00 PM",
        location: "Community Center",
        community: "Mission Fund",
      },
      {
        title: "Children's Ministry Camp",
        description: "A fun-filled day camp for kids ages 5-12 with Bible stories and activities.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21),
        time: "9:00 AM - 3:00 PM",
        location: "Church Grounds",
        community: "Children Ministry",
      },
    ];

    await Event.insertMany(sampleEvents);
    return res.json({ message: "Sample events seeded.", count: sampleEvents.length });
  } catch (err) {
    console.error("SEED EVENTS ERROR:", err);
    return res.status(500).json({ message: "Failed to seed events." });
  }
}
