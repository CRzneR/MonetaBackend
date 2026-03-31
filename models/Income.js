import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ← NEU
  source: { type: String, required: true },
  amount: { type: Number, required: true },
  category: {
    type: String,
    enum: ["Gehalt", "Nebeneinkünfte"],
    required: true,
  },
  month: { type: String, required: true },
});

export default mongoose.model("Income", incomeSchema);