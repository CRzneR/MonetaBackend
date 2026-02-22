import express from "express";
const router = express.Router();

import Cost from "../models/Cost.js";

// 🔐 Middleware: Session prüfen
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Nicht eingeloggt" });
  }
  next();
}

// ============================
// GET: Kosten des eingeloggten Users
// ============================
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter = { userId: req.session.userId };

    if (req.query.year) filter.year = Number(req.query.year);

    if (req.query.month) {
      filter.$or = [{ month: req.query.month }, { recurring: true }];
    }

    const costs = await Cost.find(filter).sort({ createdAt: -1 });
    res.json(costs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================
// POST: Neue Kosten
// ============================
router.post("/", requireAuth, async (req, res) => {
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
    userId: req.session.userId, // ⭐ aus Session
    kosten,
    name,
    kategorie,
    costType,
    year: Number.isFinite(Number(year)) ? Number(year) : now.getFullYear(),
    month: recurring ? null : month || months[now.getMonth()],
    recurring: Boolean(recurring),
  });

  try {
    const savedCost = await newCost.save();
    res.status(201).json(savedCost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ============================
// PATCH: Abgebucht aktualisieren
// ============================
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { abgebucht, month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "month und year sind erforderlich" });
    }

    const key = `${year}-${String(month).padStart(2, "0")}`;

    const updated = await Cost.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { $set: { [`abgebuchtByMonth.${key}`]: abgebucht } },
      { new: true },
    );

    if (!updated) return res.status(404).json({ message: "Kosten nicht gefunden" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================
// DELETE
// ============================
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Cost.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!deleted) return res.status(404).json({ message: "Kosten nicht gefunden" });

    res.json({ message: "Kosten gelöscht" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
