import mongoose from "mongoose";

const costSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    kosten: { type: Number, required: true },
    name: { type: String, required: true },
    kategorie: { type: String, required: true },
    costType: { type: String, required: true }, // fix, jährlich, variabel
  },
  { timestamps: true }
);

export default mongoose.model("Cost", costSchema);
