// index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // Bodyparser für JSON

// MongoDB verbinden
mongoose
  .connect(
    "mongodb+srv://<user>:<password>@cluster0.mongodb.net/monetaDB?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Schema erstellen
const incomeSchema = new mongoose.Schema({
  source: String,
  amount: Number,
  month: String,
  category: String,
});

const Income = mongoose.model("Income", incomeSchema);

// === Routen ===
// Alle Einnahmen abrufen
app.get("/api/incomes", async (req, res) => {
  const incomes = await Income.find();
  res.json(incomes);
});

// Einnahme hinzufügen
app.post("/api/incomes", async (req, res) => {
  const { source, amount, month, category } = req.body;
  const newIncome = new Income({ source, amount, month, category });
  await newIncome.save();
  res.json(newIncome);
});

// Einnahme löschen
app.delete("/api/incomes/:id", async (req, res) => {
  const { id } = req.params;
  await Income.findByIdAndDelete(id);
  res.json({ success: true });
});

// Server starten
const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
