import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email.js";

const router = express.Router();

// Erzeugt ein zufälliges Token-Paar: den Klartext-Wert (geht per Mail raus)
// und dessen SHA-256-Hash (wird in der DB gespeichert, nie der Klartext).
function createToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

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

    const { raw, hash } = createToken();

    // Passwort wird im Model gehashed (wichtig!)
    const newUser = new User({
      username,
      email,
      password,
      isVerified: false,
      verificationTokenHash: hash,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });
    await newUser.save();

    try {
      await sendVerificationEmail(newUser.email, raw);
    } catch (mailErr) {
      console.error("❌ Fehler beim Versenden der Verifizierungs-Mail:", mailErr);
      // Registrierung bleibt trotzdem erfolgreich - Nutzer kann sich ggf. später
      // eine neue Mail anfordern (falls du das noch ergänzt).
    }

    return res.status(201).json({
      message: "Benutzer erfolgreich registriert. Bitte bestätige deine E-Mail-Adresse.",
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

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Bitte bestätige zuerst deine E-Mail-Adresse. Schau in dein Postfach.",
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
      },
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

// ---------------- E-MAIL VERIFIZIEREN ----------------
// Wird direkt aus dem Mail-Link aufgerufen (GET), leitet danach aufs Frontend um.
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || "https://bilanzbalance.de";

  if (!token) {
    return res.redirect(`${frontendUrl}/pages/verify-email.html?status=missing`);
  }

  const hash = crypto.createHash("sha256").update(String(token)).digest("hex");

  try {
    const user = await User.findOne({
      verificationTokenHash: hash,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect(`${frontendUrl}/pages/verify-email.html?status=invalid`);
    }

    user.isVerified = true;
    user.verificationTokenHash = null;
    user.verificationExpires = null;
    await user.save();

    return res.redirect(`${frontendUrl}/pages/verify-email.html?status=success`);
  } catch (err) {
    console.error("❌ Fehler bei der E-Mail-Verifizierung:", err);
    return res.redirect(`${frontendUrl}/pages/verify-email.html?status=error`);
  }
});

// ---------------- PASSWORT VERGESSEN ----------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Bitte E-Mail-Adresse angeben." });
  }

  try {
    const user = await User.findOne({ email });

    // Bewusst IMMER dieselbe Erfolgsmeldung, egal ob der Account existiert -
    // sonst könnte man über diesen Endpunkt herausfinden, welche E-Mails
    // registriert sind.
    if (user) {
      const { raw, hash } = createToken();
      user.resetPasswordTokenHash = hash;
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1h
      await user.save();

      try {
        await sendPasswordResetEmail(user.email, raw);
      } catch (mailErr) {
        console.error("❌ Fehler beim Versenden der Reset-Mail:", mailErr);
      }
    }

    return res.json({
      message: "Falls ein Konto mit dieser E-Mail existiert, haben wir einen Link geschickt.",
    });
  } catch (error) {
    console.error("❌ Fehler bei forgot-password:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
});

// ---------------- PASSWORT ZURÜCKSETZEN ----------------
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token und neues Passwort sind erforderlich." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Passwort muss mindestens 6 Zeichen lang sein." });
  }

  const hash = crypto.createHash("sha256").update(String(token)).digest("hex");

  try {
    const user = await User.findOne({
      resetPasswordTokenHash: hash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Link ist ungültig oder abgelaufen." });
    }

    user.password = password; // wird im Model-pre-save gehasht
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: "Passwort erfolgreich geändert." });
  } catch (error) {
    console.error("❌ Fehler bei reset-password:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
});

// ---------------- AUTH CHECK ----------------
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
