// moneta-backend/server.js

import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import session from "express-session";
import MongoStore from "connect-mongo";

import authRoutes from "./routes/auth.js";
import costRoutes from "./routes/costs.js";
import incomeRoutes from "./routes/income.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// 🔥 Render läuft hinter Proxy
app.set("trust proxy", 1);

// =======================
// Middleware
// =======================

app.use(express.json());

// =======================
// 🌐 CORS — für Vercel + Cookies
// =======================

app.use(
  cors({
    origin: "https://moneta-frontend.vercel.app",
    credentials: true,
  }),
);

// =======================
// 🍪 Session Middleware
// =======================

app.use(
  session({
    name: "moneta.sid",

    secret: process.env.SESSION_SECRET || "supersecret",

    resave: false,
    saveUninitialized: false,

    proxy: true,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 7, // 7 Tage
    }),

    cookie: {
      httpOnly: true,
      secure: true, // HTTPS Pflicht auf Render
      sameSite: "none", // Cross-Site erforderlich

      // ❌ KEINE domain setzen!

      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

// =======================
// API ROUTES
// =======================

app.use("/api/auth", authRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/income", incomeRoutes);

// =======================
// Health Check (optional)
// =======================

app.get("/", (req, res) => {
  res.send("Moneta API läuft 🚀");
});

// =======================
// MongoDB & Serverstart
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
