import express from "express";
import Income from "../models/Income.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET – nur eigene Einnahmen
router.get("/", authMiddleware, async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.user.userId });
    res.json(incomes);
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Laden der Einnahmen" });
  }
});

// POST – userId aus Token
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { source, amount, category, month } = req.body;
    const newIncome = new Income({
      userId: req.user.userId, // ← NEU
      source,
      amount,
      category,
      month,
    });
    await newIncome.save();
    res.status(201).json(newIncome);
  } catch (error) {
    res.status(400).json({ message: "Fehler beim Speichern der Einnahme" });
  }
});

// DELETE – nur eigene Einnahmen löschbar
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId, // ← NEU (Sicherheit!)
    });
    if (!deleted) return res.status(404).json({ message: "Einnahme nicht gefunden" });
    res.json({ message: "Einnahme gelöscht" });
  } catch (error) {
    res.status(500).json({ message: "Fehler beim Löschen der Einnahme" });
  }
});

export default router;