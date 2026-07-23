import mongoose from "mongoose";

const savingsGoalSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    memberName: { type: String, required: true },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    savedAmount: { type: Number, default: 0 },
    monthlyContribution: { type: Number, default: 0 },
    targetDate: { type: Date, default: null },
    color: { type: String, default: "#2E6BF0" },
    iconType: { type: String, default: "wallet" },
    status: { type: String, enum: ["active", "completed"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("SavingsGoal", savingsGoalSchema, "savings_goals");
