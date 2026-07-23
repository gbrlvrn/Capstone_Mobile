import mongoose from "mongoose";

const loanPaymentSchema = new mongoose.Schema(
  {
    loanId: { type: String, required: true },
    loanObjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", default: null },
    email: { type: String, required: true, trim: true, lowercase: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "gcash", "bank"],
      default: "gcash",
    },
    proofData: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },
    submittedAt: { type: Date, default: Date.now },
    monthNumber: { type: Number, default: 0 },
    // PayMongo fields
    paymongoLinkId: { type: String, default: "" },
    paymongoSessionId: { type: String, default: "" },
    // Admin approval fields
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: String, default: "" },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: String, default: "" },
    rejectReason: { type: String, default: "" },
  },
  { timestamps: true }
);

// Force collection name to match Admin portal
export default mongoose.model("LoanPayment", loanPaymentSchema, "loan_payments");
