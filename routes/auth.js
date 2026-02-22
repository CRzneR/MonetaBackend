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

    // 🔥 WICHTIG: Alte Session verwerfen → neue Session erstellen
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session Regenerate Error:", err);
        return res.status(500).json({ message: "Session Fehler" });
      }

      req.session.userId = user._id;

      req.session.save((err) => {
        if (err) {
          console.error("Session Save Error:", err);
          return res.status(500).json({ message: "Session konnte nicht gespeichert werden" });
        }

        res.json({
          message: "Login erfolgreich",
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
          },
        });
      });
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
  if (!req.session) {
    return res.status(200).json({ message: "Bereits ausgeloggt" });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("❌ Logout Fehler:", err);
      return res.status(500).json({ message: "Logout fehlgeschlagen" });
    }

    // 🔥 Cookie exakt löschen (Cross-Site!)
    res.clearCookie("moneta.sid", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.status(200).json({ message: "Erfolgreich ausgeloggt" });
  });
});

export default router;
