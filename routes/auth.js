import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// =======================
// Registrierung
// =======================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Bitte alle Felder ausfüllen." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Benutzer existiert bereits." });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    return res.status(201).json({
      message: "Benutzer erfolgreich registriert",
    });
  } catch (error) {
    console.error("❌ Fehler bei der Registrierung:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
});

// =======================
// Login (Session setzen)
// =======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Bitte E-Mail und Passwort eingeben." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Benutzer nicht gefunden." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Falsches Passwort." });
    }

    // ⭐ WICHTIG: Session speichern
    req.session.userId = user._id;

    res.json({
      message: "Login erfolgreich",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("❌ Fehler beim Login:", error);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
});

// =======================
// Auth-Check: Bin ich eingeloggt?
// =======================
router.get("/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Nicht eingeloggt" });
    }

    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User nicht gefunden" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Fehler bei /me:", error);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
});

// =======================
// Logout
// =======================
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout fehlgeschlagen" });
    }

    res.clearCookie("moneta.sid"); // Cookie Name aus server.js
    res.json({ message: "Erfolgreich ausgeloggt" });
  });
});

export default router;
