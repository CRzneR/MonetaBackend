// moneta-backend/routes/income.js
import express from "express";
import Income from "../models/Income.js";

const router = express.Router();

// Alle Einnahmen abrufen
router.get("/", async (req, res) => {
  try {
    const incomes = await Income.find();
    res.json(incomes);
  } catch (error) {
    console.error("GET /api/income error:", error);
    res.status(500).json({ message: "Fehler beim Laden der Einnahmen" });
  }
});

// Neue Einnahme speichern
router.post("/", async (req, res) => {
  try {
    const { source, amount, category, month } = req.body;

    const newIncome = new Income({
      source,
      amount,
      category,
      month,
    });

    await newIncome.save();
    res.status(201).json(newIncome);
  } catch (error) {
    console.error("POST /api/income error:", error);
    res.status(400).json({ message: "Fehler beim Speichern der Einnahme" });
  }
});

// Einnahme löschen
router.delete("/:id", async (req, res) => {
  try {
    await Income.findByIdAndDelete(req.params.id);
    res.json({ message: "Einnahme gelöscht" });
  } catch (error) {
    console.error("DELETE /api/income/:id error:", error);
    res.status(500).json({ message: "Fehler beim Löschen der Einnahme" });
  }
});

// WICHTIG für deinen Import in server.js:
export default router;
