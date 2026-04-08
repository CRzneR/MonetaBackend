// moneta-backend/server.js
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import costRoutes from "./routes/costs.js";
import incomeRoutes from "./routes/income.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());

app.use(
  cors({
    origin: ["https://moneta-frontend.vercel.app", "http://localhost:5001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors());

// -------------- STATIC FRONTEND (optional, lokal nützlich) --------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/pages", express.static(path.join(__dirname, "../frontend/pages")));
app.use("/frontend/js", express.static(path.join(__dirname, "../frontend/js")));

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/income", incomeRoutes);

// ROOT Route → optional nur lokal relevant
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages/frontend/fixkosten.html"));
});

app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "../pages/frontend/fixkosten.html"));
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
