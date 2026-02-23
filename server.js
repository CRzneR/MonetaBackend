// moneta-backend/server.js

import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";

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

// ⭐ WICHTIG für JWT-Cookie
app.use(cookieParser());

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
// API ROUTES
// =======================

app.use("/api/auth", authRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/income", incomeRoutes);

// =======================
// Health Check
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
