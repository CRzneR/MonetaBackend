import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ---------------- REGISTER ----------------
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

    // Passwort wird im Model gehashed (wichtig!)
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

// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Bitte E-Mail und Passwort eingeben.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Benutzer nicht gefunden.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Falsches Passwort.",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login erfolgreich",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("❌ Fehler beim Login:", error);
    return res.status(500).json({
      message: "Interner Serverfehler",
    });
  }
});

// ---------------- AUTH CHECK (NEU 🔥) ----------------
// Damit prüfst du im Frontend, ob User eingeloggt ist
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Nicht eingeloggt" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ message: "Token ungültig" });
  }
});

export default router;

