import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Registrierung (auth.js)
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "Bitte alle Felder ausfüllen." });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Benutzer existiert bereits." });

    // ⚠️ Kein Hash hier – das macht das Model automatisch!
    const newUser = new User({ username, email, password });
    await newUser.save();

    return res.status(201).json({ message: "Benutzer erfolgreich registriert" });
  } catch (error) {
    console.error("❌ Fehler bei der Registrierung:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Bitte E-Mail und Passwort eingeben." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Benutzer nicht gefunden." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Falsches Passwort." });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login erfolgreich",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("❌ Fehler beim Login:", error);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
});

export default router;
