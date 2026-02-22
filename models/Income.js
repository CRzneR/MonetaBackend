import mongoose from "mongoose";

const incomeSchema = new mongoose.Schema({
  source: { type: String, required: true },
  amount: { type: Number, required: true },

  category: {
    type: String,
    enum: ["Gehalt", "Nebeneinkünfte"],
    required: true,
  },

  month: {
    type: String,
    required: true,
    enum: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  },

  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100,
  },
});

const Income = mongoose.model("Income", incomeSchema);

export default Income;
