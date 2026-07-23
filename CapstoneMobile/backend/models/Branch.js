import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  province: { type: String, required: false }, // User mentioned this field
  address: { type: String, required: false },
  pastor: { type: String, required: false },
  status: { type: String, default: "Active", enum: ["Active", "Inactive"] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Branch", branchSchema);
