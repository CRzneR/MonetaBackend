// moneta-backend/server.js
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import costRoutes from "./routes/costs.js";
import incomeRoutes from "./routes/income.js";

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());

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

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/income", incomeRoutes);

// ROOT Route → nur zur Bestätigung, dass die API läuft
// (z. B. für Render-Healthchecks, die "/" aufrufen)
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "BilanzBalance API" });
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
    process.exit(1);
  });
