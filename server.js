// moneta-backend/server.js
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routen importieren
import authRoutes from "./routes/auth.js";
import costRoutes from "./routes/costs.js";
import incomeRoutes from "./routes/income.js";

// Initialisierung
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cors());

// -------------- STATIC FRONTEND --------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// STATIC Ordner:
app.use(express.static(path.join(__dirname, "../frontend")));

// EXTRA: /pages separat verfügbar machen
app.use("/pages", express.static(path.join(__dirname, "../frontend/pages")));

// EXTRA: /js verfügbar machen
app.use("/frontend/js", express.static(path.join(__dirname, "../frontend/js")));

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/income", incomeRoutes);

// ROOT Route → fixkosten.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/fixkosten.html"));
});

// Catch-All NUR für nicht-API Routen → fixkosten.html
app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "../frontend/fixkosten.html"));
});

// MongoDB Verbindung & Serverstart
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
    process.exit(1); // optional: Prozess beenden, wenn DB nicht erreichbar
  });
