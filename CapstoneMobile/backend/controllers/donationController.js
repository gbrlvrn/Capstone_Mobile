import { body, validationResult } from "express-validator";
import Donation from "../models/Donation.js";
import User from "../models/User.js";
import { sendPushNotification } from "../utils/pushNotifications.js";
import { generatePaymentLink } from "../utils/paymongo.js";

/**
 * Validation rules for donation creation
 */
export const createDonationValidation = [
  body("amount")
    .isFloat({ min: 1 })
    .withMessage("Donation amount must be at least 1."),
];

/**
 * POST /api/donations — Record a new donation
 */
export async function createDonation(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const email = req.user.email;
    const {
      amount, type, note, date,
      category,
      // community: accept 'community' field directly
      community,
      // method: mobile sends 'paymentMethod', web sends 'method' — accept both
      method, paymentMethod,
      // proof: mobile sends 'proofOfPayment', some paths send 'proofImage' — accept both
      status, proofImage, proofOfPayment, member,
    } = req.body;

    // Resolve proof: accept whichever field is present (mobile sends proofOfPayment)
    const resolvedProof = proofOfPayment || proofImage || "";

    const resolvedMethod = method || paymentMethod || "Cash";

    // Generate donation ID: D-YYYY-XXXX (global sequential, matching Admin format)
    const year = new Date().getFullYear();
    const count = await Donation.countDocuments({});
    const donationId = `D-${year}-${String(count + 1).padStart(4, "0")}`;

    // Look up member name from User collection
    const user = await User.findOne({ email: email.toLowerCase() });
    const memberName = member || (user ? (user.fullName || `${user.firstName} ${user.lastName}`.trim()) : "Member");

    // Resolve community: use sent value, else fall back to user's registered branch in DB
    const resolvedCommunity = (community && community.trim())
      ? community.trim()
      : (user ? (user.branch || user.community || "") : "");

    const donation = await Donation.create({
      email,
      donationId,
      amount,
      type: type || "One-time",
      category: category || "Offering",
      community: resolvedCommunity,
      method: resolvedMethod,
      status: "pending",
      proofImage: resolvedProof,
      proofOfPayment: resolvedProof,  // Web admin reads this field
      subMethod: req.body.subMethod || "",
      accountName: req.body.accountName || "",
      accountNumber: req.body.accountNumber || "",
      member: memberName,
      note: note || "",
      date: date || new Date(),
      createdAt: new Date(),
    });

    if (!req.body.successUrl && user && user.expoPushToken) {
      sendPushNotification(
        user.expoPushToken,
        "Donation Submitted",
        `Your ${donation.type} donation of ₱${donation.amount.toLocaleString()} has been submitted and is pending admin approval.`,
        { screen: "Donations", category: "transaction" }
      ).catch(err => console.error("Push error:", err));
    }

    const responsePayload = {
      message: "Donation recorded successfully.",
      donation: {
        id: donation.donationId,
        amount: donation.amount,
        type: donation.type,
        note: donation.note,
        date: donation.date,
      },
    };

    // If successUrl and cancelUrl are provided, generate a PayMongo checkout session
    if (req.body.successUrl && req.body.cancelUrl) {
      try {
        const session = await generatePaymentLink(
          donation.amount,
          `Donation: ${donation.category}`,
          donation.donationId,
          donation.method,
          req.body.successUrl,
          req.body.cancelUrl,
          { email, name: memberName }
        );
        responsePayload.checkoutUrl = session.attributes.checkout_url;
      } catch (pmError) {
        console.error("PayMongo integration failed:", pmError);
        return res.status(500).json({ message: "Payment Gateway Error. Please try again." });
      }
    }

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error("CREATE DONATION ERROR:", err);
    return res.status(500).json({ message: "Failed to record donation." });
  }
}

/**
 * GET /api/donations — Get all donations for authenticated user
 */
export async function getDonations(req, res) {
  try {
    const email = req.user.email;
    const donations = await Donation.find({ email })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json({ donations });
  } catch (err) {
    console.error("GET DONATIONS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch donations." });
  }
}
