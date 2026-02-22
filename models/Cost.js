import mongoose from "mongoose";

const costSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kosten: { type: Number, required: true },
    name: { type: String, required: true },
    kategorie: { type: String, required: true },
    costType: { type: String, required: true },

    recurring: { type: Boolean, default: false },

    month: { type: String, default: null },
    year: { type: Number, default: null },

    abgebuchtByMonth: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

export default mongoose.model("Cost", costSchema);
