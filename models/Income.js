import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    source: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      enum: ["Gehalt", "Nebeneinkünfte"],
      required: true,
    },

    month: {
      type: String,
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

incomeSchema.index(
  { userId: 1, category: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { category: "Gehalt" } },
);

export default mongoose.model("Income", incomeSchema);
