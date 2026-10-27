import express from "express";
const router = express.Router();

import Cost from "../models/Cost.js";
import authMiddleware from "../middleware/authMiddleware.js";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/**
 * Monatsnummer = Jahr * 12 + Monatsindex. Damit lassen sich Monate über
 * Jahresgrenzen hinweg einfach vergleichen. Liefert null bei ungültigen Werten.
 */
function monthIndex(month, year) {
  const m = MONTHS.indexOf(month);
  const y = Number(year);

  if (m === -1 || !Number.isFinite(y)) return null;

  return y * 12 + m;
}

// GET
// Mit ?month=...&year=... werden nur Einträge geliefert, die in diesem Monat gelten:
//  - Variable Kosten: month/year stimmen überein
//  - Wiederkehrende Kosten: der Monat liegt zwischen validFrom und validUntil.
//    Ältere Einträge ohne validFrom gelten ab Januar ihres gespeicherten Jahres.
router.get("/", authMiddleware, async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    const { month, year } = req.query;

    if (month && year) {
      const idx = monthIndex(month, year);

      if (idx === null) {
        return res.status(400).json({ message: "Ungültiger Monat oder ungültiges Jahr" });
      }

      filter.$or = [
        {
          recurring: true,
          $and: [
            { $or: [{ validFrom: { $lte: idx } }, { validFrom: null, year: { $lte: Number(year) } }] },
            { $or: [{ validUntil: null }, { validUntil: { $gte: idx } }] },
          ],
        },
        { recurring: { $ne: true }, month, year: Number(year) },
      ];
    } else {
      // Rückwärtskompatibel: nur Jahr oder nur Monat angegeben
      if (year) filter.year = Number(year);

      if (month) {
        filter.$or = [{ month }, { recurring: true }];
      }
    }

    const costs = await Cost.find(filter).sort({ createdAt: -1 });
    res.json(costs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST
// Wiederkehrende Kosten gelten ab dem übergebenen Monat (month/year) und in
// allen folgenden Monaten, nicht rückwirkend.
router.post("/", authMiddleware, async (req, res) => {
  const { kosten, name, kategorie, costType, month, year, recurring } = req.body;

  const now = new Date();
  const isRecurring = Boolean(recurring);

  const entryYear = Number.isFinite(Number(year)) ? Number(year) : now.getFullYear();
  const entryMonth = MONTHS.includes(month) ? month : MONTHS[now.getMonth()];

  const newCost = new Cost({
    userId: req.user.userId,
    kosten,
    name,
    kategorie,
    costType,
    year: entryYear,
    month: isRecurring ? null : entryMonth,
    recurring: isRecurring,
    validFrom: isRecurring ? monthIndex(entryMonth, entryYear) : null,
    validUntil: null,
  });

  try {
    const savedCost = await newCost.save();
    res.status(201).json(savedCost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH
// Unterstützt mehrere Anwendungsfälle im selben Endpunkt:
// 1) Monatlicher "tatsächlich abgebucht"-Wert: Body { abgebucht, month, year }
// 2) Basisfelder des Eintrags ändern: Body kann name, kategorie, costType, kosten enthalten
// 3) recurring/entryMonth/entryYear: legt fest, ob & für welchen Monat der Eintrag gilt
//    (separate Feldnamen ggü. month/year, damit kein Konflikt mit Fall 1 entsteht)
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const {
      abgebucht,
      bezahlt,
      month,
      year,
      name,
      kategorie,
      costType,
      kosten,
      recurring,
      entryMonth,
      entryYear,
    } = req.body;

    const setFields = {};

    if (abgebucht !== undefined) {
      if (!month || !year) {
        return res.status(400).json({ message: "month und year sind erforderlich" });
      }
      const key = `${year}-${String(month).padStart(2, "0")}`;
      setFields[`abgebuchtByMonth.${key}`] = abgebucht;
    }

    if (bezahlt !== undefined) {
      if (!month || !year) {
        return res.status(400).json({ message: "month und year sind erforderlich" });
      }
      const key = `${year}-${String(month).padStart(2, "0")}`;
      setFields[`bezahltByMonth.${key}`] = Boolean(bezahlt);
    }

    if (name !== undefined) setFields.name = name;
    if (kategorie !== undefined) setFields.kategorie = kategorie;
    if (costType !== undefined) setFields.costType = costType;
    if (kosten !== undefined) setFields.kosten = kosten;
    if (recurring !== undefined) setFields.recurring = recurring;
    if (entryMonth !== undefined) setFields.month = entryMonth;
    if (entryYear !== undefined) setFields.year = Number(entryYear);

    if (Object.keys(setFields).length === 0) {
      return res.status(400).json({ message: "Keine Änderungen übermittelt" });
    }

    const updated = await Cost.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: setFields },
      { new: true },
    );

    if (!updated) return res.status(404).json({ message: "Kosten nicht gefunden" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
// Mit ?month=...&year=... werden wiederkehrende Kosten nur ab diesem Monat
// beendet (validUntil = Vormonat). Frühere Monate bleiben unverändert.
// Liegt der Monat am oder vor dem Start des Eintrags, wird er komplett gelöscht.
// Variable Kosten und Aufrufe ohne month/year löschen den Eintrag komplett.
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const cost = await Cost.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!cost) return res.status(404).json({ message: "Kosten nicht gefunden" });

    const idx = monthIndex(req.query.month, req.query.year);

    if (cost.recurring && idx !== null) {
      // Ältere Einträge ohne validFrom: Start = Januar ihres Jahres
      const start = cost.validFrom ?? (cost.year != null ? Number(cost.year) * 12 : null);

      if (start !== null && idx > start) {
        const end = idx - 1;
        cost.validUntil = cost.validUntil == null ? end : Math.min(cost.validUntil, end);
        await cost.save();

        return res.json({ message: "Kosten ab diesem Monat gelöscht", validUntil: cost.validUntil });
      }
    }

    await Cost.deleteOne({ _id: cost._id });

    res.json({ message: "Kosten gelöscht" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
