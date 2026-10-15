// moneta-backend/routes/account.js
//
// Konto-Verwaltung (eingeloggt): Konto endgültig löschen.
//
// POST /api/account/delete   Body: { "password": "..." }
//
// Zur Sicherheit wird das Passwort erneut abgefragt - ein gestohlenes
// Login-Token allein reicht also nicht, um ein Konto zu löschen.
// Gelöscht werden alle Kosten und Einnahmen des Nutzers und danach der
// Nutzer selbst (zuletzt, damit ein Fehler dazwischen wiederholbar bleibt).

import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Cost from "../models/Cost.js";
import Income from "../models/Income.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/delete", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body || {};

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        message: "Bitte gib zur Bestätigung dein Passwort ein.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "Konto nicht gefunden." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Falsches Passwort." });
    }

    await Promise.all([
      Cost.deleteMany({ userId: user._id }),
      Income.deleteMany({ userId: user._id }),
    ]);

    await User.deleteOne({ _id: user._id });

    return res.json({
      message: "Dein Konto und alle zugehörigen Daten wurden gelöscht.",
    });
  } catch (error) {
    console.error("❌ Fehler beim Löschen des Kontos:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
});

export default router;
