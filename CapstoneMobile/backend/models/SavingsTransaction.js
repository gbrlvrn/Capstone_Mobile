import mongoose from "mongoose";

const savingsTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["deposit", "withdrawal"], required: true },
    status: { type: String, enum: ["pending", "confirmed", "rejected"], required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    memberName: { type: String, required: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsGoal' },
    goalName: { type: String, default: "" },
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
    source: { type: String, default: "Manual" }, // Manual or Transfer
    paymentMethod: { type: String, default: "" },
    referenceNumber: { type: String, required: true },
    proofOfPayment: { type: String, default: "" }, // Base64
    date: { type: Date, default: Date.now },
    // PayMongo fields
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

export default mongoose.model("SavingsTransaction", savingsTransactionSchema, "savings_transactions");
