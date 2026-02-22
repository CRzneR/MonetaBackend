// moneta-backend/routes/income.js
import express from "express";
import Income from "../models/Income.js";

const router = express.Router();

// 🔐 Session-Middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Nicht eingeloggt" });
  }
  next();
}

// ============================
// GET: Nur Einnahmen des Users
// ============================
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter = { userId: req.session.userId };

    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.month) filter.month = req.query.month;

    const incomes = await Income.find(filter).sort({ createdAt: -1 });
    res.json(incomes);
  } catch (error) {
    console.error("GET /api/income error:", error);
    res.status(500).json({ message: "Fehler beim Laden der Einnahmen" });
  }
});

// ============================
// POST: Neue Einnahme speichern
// ============================
router.post("/", requireAuth, async (req, res) => {
  try {
    const { source, amount, category, month } = req.body;

    const newIncome = new Income({
      userId: req.session.userId, // ⭐ wichtig
      source,
      amount,
      category,
      month,
      year: new Date().getFullYear(),
    });

    await newIncome.save();
    res.status(201).json(newIncome);
  } catch (error) {
    console.error("POST /api/income error:", error);
    res.status(400).json({ message: "Fehler beim Speichern der Einnahme" });
  }
});

// ============================
// DELETE: Nur eigene Einnahme
// ============================
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Einnahme nicht gefunden" });
    }

    res.json({ message: "Einnahme gelöscht" });
  } catch (error) {
    console.error("DELETE /api/income/:id error:", error);
    res.status(500).json({ message: "Fehler beim Löschen der Einnahme" });
  }
});

export default router;
