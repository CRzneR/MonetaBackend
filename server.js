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

// 🎯 CORS sauber konfigurieren
const allowedOrigins = [
  "http://localhost:5001", // backend lokal
  "http://localhost:5173", // falls du mal Vite/Dev-Server nutzt
  process.env.FRONTEND_URL, // deine Vercel-URL, z.B. https://moneta.vercel.app
].filter(Boolean); // entfernt undefined/null

app.use(
  cors({
    origin: (origin, callback) => {
      // origin === undefined bei z.B. Postman oder curl → erlauben
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.log("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// -------------- STATIC FRONTEND (optional, lokal nützlich) --------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Wenn du lokal noch das Frontend über Node testen willst:
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/pages", express.static(path.join(__dirname, "../frontend/pages")));
app.use("/frontend/js", express.static(path.join(__dirname, "../frontend/js")));

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/income", incomeRoutes);

// ROOT Route → optional nur lokal relevant
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/fixkosten.html"));
});

// Catch-All NUR für nicht-API Routen → optional
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
    process.exit(1);
  });
