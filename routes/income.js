import express from "express";

import Income from "../models/Income.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

router.get("/", authMiddleware, async (req, res) => {
  try {
    const filter = {
      userId: req.user.userId,
    };

    if (req.query.month) {
      filter.month = req.query.month;
    }

    if (req.query.year) {
      filter.year = Number(req.query.year);
    }

    const incomes = await Income.find(filter).sort({
      year: -1,
      createdAt: -1,
    });

    res.json(incomes);
  } catch (error) {
    console.error("GET /income:", error);
    res.status(500).json({
      message: "Fehler beim Laden der Einnahmen",
    });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { source, amount, category, month, year } = req.body;

    const numericAmount = Number(amount);
    const numericYear = Number(year);

    if (!source || !category || !month) {
      return res.status(400).json({
        message: "source, category und month sind erforderlich",
      });
    }

    if (!MONTHS.includes(month)) {
      return res.status(400).json({
        message: "Ungültiger Monat",
      });
    }

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        message: "Der Betrag muss eine gültige Zahl >= 0 sein",
      });
    }

    if (!Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 2100) {
      return res.status(400).json({
        message: "Ungültiges Jahr",
      });
    }

    if (category === "Gehalt") {
      const income = await Income.findOneAndUpdate(
        {
          userId: req.user.userId,
          category: "Gehalt",
          month,
          year: numericYear,
        },
        {
          $set: {
            source,
            amount: numericAmount,
          },
          $setOnInsert: {
            userId: req.user.userId,
            category: "Gehalt",
            month,
            year: numericYear,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        },
      );

      return res.status(200).json(income);
    }

    const income = await Income.create({
      userId: req.user.userId,
      source,
      amount: numericAmount,
      category,
      month,
      year: numericYear,
    });

    res.status(201).json(income);
  } catch (error) {
    console.error("POST /income:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Für diesen Monat existiert bereits ein Gehalt.",
      });
    }

    res.status(400).json({
      message: "Fehler beim Speichern der Einnahme",
    });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!deleted) {
      return res.status(404).json({
        message: "Einnahme nicht gefunden",
      });
    }

    res.json({
      message: "Einnahme gelöscht",
    });
  } catch (error) {
    console.error("DELETE /income/:id:", error);

    res.status(500).json({
      message: "Fehler beim Löschen der Einnahme",
    });
  }
});

export default router;
