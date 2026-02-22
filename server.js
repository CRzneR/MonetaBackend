// moneta-backend/server.js
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ⭐ NEU: Session Imports
import session from "express-session";
import MongoStore from "connect-mongo";

import authRoutes from "./routes/auth.js";
import costRoutes from "./routes/costs.js";
import incomeRoutes from "./routes/income.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// =======================
// Middleware
// =======================

app.use(express.json());

// ⭐ CORS — wichtig für Cookies
app.use(
  cors({
    origin: true, // lokal ok, bei getrennten Domains konkrete URL angeben
    credentials: true, // ⭐ notwendig für Session-Cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.options("*", cors());

// =======================
// ⭐ Session Middleware
// =======================

app.use(
  session({
    name: "moneta.sid", // Cookie Name
    secret: process.env.JWT_SECRET || "supersecret",

    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),

    cookie: {
      httpOnly: true, // JS kann Cookie nicht lesen
      secure: false, // ⚠️ true bei HTTPS (Production!)
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Tage
    },
  }),
);

// =======================
// STATIC FRONTEND (optional)
// =======================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/pages", express.static(path.join(__dirname, "../frontend/pages")));
app.use("/frontend/js", express.static(path.join(__dirname, "../frontend/js")));

// =======================
// API ROUTES
// =======================

app.use("/api/auth", authRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/income", incomeRoutes);

// =======================
// ROOT Route (lokal)
// =======================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/pages/fixkosten.html"));
});

// SPA-Fallback (kein API)
app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "../frontend/pages/fixkosten.html"));
});

// =======================
// MongoDB Verbindung & Serverstart
// =======================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB verbunden");

    app.listen(PORT, () => {
      console.log(`🚀 Server läuft auf Port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Fehler:", err);
    process.exit(1);
  });
