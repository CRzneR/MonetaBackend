import mongoose from "mongoose";

const costSchema = new mongoose.Schema(
  {
    kosten: Number,
    name: String,
    kategorie: String,
    costType: String, // fix, jährlich, variabel
  },
  { timestamps: true }
);

export default mongoose.model("Cost", costSchema);
