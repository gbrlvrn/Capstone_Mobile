import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    memberName: { type: String, default: "" },
    loanId: { type: String, required: true, unique: true },
    loanType: {
      type: String,
      enum: ["Personal", "Medical", "Business", "Education", "Emergency", "personal", "emergency", "short-term"],
      required: true,
    },
    amount: { type: Number, required: true },
    purpose: { type: String, required: true, trim: true },
    phoneNumber: { type: String, default: "", trim: true },
    termMonths: { type: Number, required: true },
    interestRate: { type: Number, default: 0.02 },
    interestAmount: { type: Number, default: 0 },
    totalInterest: { type: Number, default: 0 },
    totalRepayment: { type: Number, default: 0 },
    monthlyPayment: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    approvalProbability: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "member_accepted", "active", "completed", "rejected"],
      default: "pending",
    },
    statusHistory: {
      type: [{ status: String, date: Date }],
      default: [],
    },
    paidMonths: { type: Number, default: 0 },
    disbursed: { type: Boolean, default: false },
    disbursedDate: { type: Date, default: null },
    disbursementMethod: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    selfieData: { type: String, default: "" },
    idData: { type: String, default: "" },
    coeData: { type: String, default: "" },     // Certificate of Employment
    itrData: { type: String, default: "" },     // Income Tax Return
    payslipData: { type: String, default: "" }, // Payslip document
    nextPayment: { type: String, default: "Pending" },
    adminModified: { type: Boolean, default: false },
    originalAmount: { type: Number, default: null },
    originalTermMonths: { type: Number, default: null },
    appliedDate: { type: Date, default: Date.now },
    approvedDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Loan", loanSchema);
