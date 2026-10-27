// moneta-backend/server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/account.js";
import costRoutes from "./routes/costs.js";
import incomeRoutes from "./routes/income.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.disable("x-powered-by");

// Middleware
// Limit erhöht: Profilbilder werden als Base64 im JSON-Body übertragen und
// überschreiten express' Standard-Limit von 100kb sonst schnell.
app.use(express.json({ limit: "5mb" }));

app.use(
  cors({
    origin: [
      "https://moneta-frontend.vercel.app",
      "https://bilanzbalance.de",
      "https://www.bilanzbalance.de",
      "http://bilanzbalance.de",
      "http://www.bilanzbalance.de",
      "http://localhost:5001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors());

// -------------- STATIC FRONTEND (nur lokal) --------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.join(__dirname, "../frontend");
const hasFrontend = fs.existsSync(path.join(frontendDir, "index.html"));

if (hasFrontend) {
  app.use(express.static(frontendDir));
  app.use("/pages", express.static(path.join(frontendDir, "pages")));
  app.use("/frontend/js", express.static(path.join(frontendDir, "js")));
}

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/income", incomeRoutes);

// Unbekannte API-Pfade: sauberes JSON statt HTML-Fehlerseite
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Endpoint nicht gefunden." });
});

// ROOT Route
// Lokal: Landingpage aus dem Frontend. Auf Render: einfacher Status.
app.get("/", (req, res) => {
  if (hasFrontend) {
    return res.sendFile(path.join(frontendDir, "index.html"));
  }
  res.json({ status: "ok", service: "BilanzBalance API" });
});

// MongoDB Verbindung & Serverstart
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB verbunden");
    app.listen(PORT, () => {
      console.log(`🚀 Server läuft auf Port ${PORT}`);
      console.log(
        hasFrontend
          ? "🖥️  Frontend wird lokal mit ausgeliefert."
          : "ℹ️  Kein Frontend-Ordner gefunden – nur API-Betrieb.",
      );
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Fehler:", err);
    process.exit(1);
  });
