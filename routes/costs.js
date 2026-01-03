import express from "express";
const router = express.Router();

import Cost from "../models/Cost.js";
import authMiddleware from "../middleware/authMiddleware.js";

// GET: Kosten nur vom eingeloggten Nutzer (optional gefiltert nach month/year)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const filter = { userId: req.user.id };

    if (req.query.year) filter.year = Number(req.query.year);

    if (req.query.month) {
      // ✅ Monat + alle recurring Kosten
      filter.$or = [{ month: req.query.month }, { recurring: true }];
    }

    const costs = await Cost.find(filter).sort({ createdAt: -1 });
    res.json(costs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Neue Kosten mit userId speichern (inkl. month/year)
router.post("/", authMiddleware, async (req, res) => {
  const { kosten, name, kategorie, costType, month, year, recurring } = req.body;

  const now = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mär",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ];

  const newCost = new Cost({
    userId: req.user.id,
    kosten,
    name,
    kategorie,
    costType,
    year: Number.isFinite(Number(year)) ? Number(year) : now.getFullYear(),

    // ✅ wenn recurring -> month egal (optional null setzen)
    month: recurring ? null : month || months[now.getMonth()],

    // ✅ neu
    recurring: Boolean(recurring),
  });

  try {
    const savedCost = await newCost.save();
    res.status(201).json(savedCost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH: Abgebucht aktualisieren
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { abgebucht, month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "month und year sind erforderlich" });
    }

    const key = `${year}-${String(month).padStart(2, "0")}`; // z.B. 2026-02

    const updated = await Cost.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { [`abgebuchtByMonth.${key}`]: abgebucht } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Kosten nicht gefunden" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE: Nur Kosten löschen, die dem User gehören
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Cost.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) return res.status(404).json({ message: "Kosten nicht gefunden" });

    res.json({ message: "Kosten gelöscht" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
