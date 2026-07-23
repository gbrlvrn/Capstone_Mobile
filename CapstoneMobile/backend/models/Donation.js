import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    donationId: { type: String, required: true, unique: true },
    member: { type: String, default: "Member" },
    amount: { type: Number, required: true },
    category: { type: String, default: "Offering" },
    community: { type: String, default: "" },
    method: { type: String, default: "Cash" },
    subMethod: { type: String, default: "" },
    accountName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    type: { type: String, default: "One-time" }, // Recurring vs One-time
    status: { type: String, default: "pending" }, // pending, confirmed, rejected
    proofImage: { type: String, default: "" }, // Base64 string from Expo
    proofOfPayment: { type: String, default: "" }, // Web admin reads this field
    note: { type: String, default: "", trim: true },
    date: { type: Date, default: Date.now },
    // PayMongo fields (set by webhook when gateway mode is used)
    paymongoLinkId: { type: String, default: "" },
    paymongoSessionId: { type: String, default: "" },
    checkoutUrl: { type: String, default: "" },
    // Admin approval fields
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: String, default: "" },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: String, default: "" },
    rejectReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Donation", donationSchema);
