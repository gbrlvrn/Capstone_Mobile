import mongoose from "mongoose";
import { announcements } from "../config/db.js";

/**
 * GET /api/announcements — Get announcements for mobile
 * Reads directly from the "announcements" collection using the web admin schema:
 *   { title, body, category, eventDate, expiresAt, visibility, targetBranches, image, images, createdBy, createdAt }
 * Maps fields to the format expected by the mobile frontend.
 */
export async function getAnnouncements(req, res) {
  try {
    // Query the raw collection to match the web admin's schema exactly
    const rawDocs = await announcements
      .find({})
      .sort({ eventDate: -1, createdAt: -1 })
      .toArray();

    // Map web admin fields to mobile-friendly fields
    const formattedAnnouncements = rawDocs.map((doc) => ({
      id: doc._id.toString(),
      _id: doc._id.toString(),
      title: doc.title || "",
      message: doc.body || "",
      description: doc.body || "",
      date: doc.eventDate || doc.createdAt || null,
      time: doc.time || "",
      location: doc.location || "All Branches",
      // Allow base64 images through so the mobile app can display them
      image: doc.image || "",
      category: doc.category || "General",
      color: doc.color || "rgba(46,107,240,0.1)",
      bordercolor: doc.bordercolor || "#2E6BF0",
      isActive: doc.isActive !== undefined ? doc.isActive : true,
      createdAt: doc.createdAt,
      createdBy: doc.createdBy || "",
      visibility: doc.visibility || "all",
    }));

    return res.status(200).json(formattedAnnouncements);
  } catch (err) {
    console.error("GET ANNOUNCEMENT ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch announcements." });
  }
}

/**
 * POST /api/announcements — Create a new announcement (admin)
 */
export async function createAnnouncement(req, res) {
  try {
    const { title, body, message, description, eventDate, date, time, location, category, color, bordercolor, visibility } = req.body;

    const announcementTitle = title;
    const announcementBody = body || message || description || "";

    if (!announcementTitle || !announcementBody) {
      return res.status(400).json({ message: "Title and body are required." });
    }

    const announcementData = {
      title: announcementTitle,
      body: announcementBody,
      category: category || "General",
      eventDate: eventDate || date ? new Date(eventDate || date) : null,
      expiresAt: null,
      visibility: visibility || "all",
      targetBranches: [],
      time: time || "",
      location: location || "",
      color: color || "rgba(46,107,240,0.1)",
      bordercolor: bordercolor || "#2E6BF0",
      createdBy: req.user?.email || "mobile",
      createdAt: new Date().toISOString(),
    };

    // Handle image upload via multer
    if (req.file) {
      announcementData.image = `/uploads/${req.file.filename}`;
    }

    const result = await announcements.insertOne(announcementData);

    return res.status(201).json({ ...announcementData, _id: result.insertedId });
  } catch (err) {
    console.error("CREATE ANNOUNCEMENT ERROR:", err);
    return res.status(500).json({ message: "Failed to create announcement." });
  }
}

/**
 * PUT /api/announcements/:id — Update an announcement (admin)
 */
export async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Handle image upload via multer
    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    // Map mobile field names to web admin field names
    if (updates.message && !updates.body) updates.body = updates.message;
    if (updates.date && !updates.eventDate) updates.eventDate = updates.date;

    const result = await announcements.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: updates },
        { returnDocument: "after" }
      );

    if (!result.value) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    return res.status(200).json(result.value);
  } catch (err) {
    console.error("UPDATE ANNOUNCEMENT ERROR:", err);
    return res.status(500).json({ message: "Failed to update announcement." });
  }
}

/**
 * DELETE /api/announcements/:id — Delete an announcement (admin)
 */
export async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const result = await announcements.deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    return res.status(200).json({ message: "Announcement deleted successfully." });
  } catch (err) {
    console.error("DELETE ANNOUNCEMENT ERROR:", err);
    return res.status(500).json({ message: "Failed to delete announcement." });
  }
}
