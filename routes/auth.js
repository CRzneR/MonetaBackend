import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// =======================
// REGISTER
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

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashed,
    });

    await newUser.save();

    res.status(201).json({ message: "Registrierung erfolgreich" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// =======================
// LOGIN
// =======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Benutzer nicht gefunden." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Falsches Passwort." });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("moneta_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      message: "Login erfolgreich",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// =======================
// AUTH CHECK
// =======================
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.moneta_token;

    if (!token) {
      return res.status(401).json({ message: "Nicht eingeloggt" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User nicht gefunden" });
    }

    res.json(user);
  } catch {
    res.status(401).json({ message: "Token ungültig" });
  }
});

// =======================
// LOGOUT
// =======================
router.post("/logout", (req, res) => {
  res.clearCookie("moneta_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.json({ message: "Logout erfolgreich" });
});

export default router;
