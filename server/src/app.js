import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import catalogueRoutes from "./routes/catalogue.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler, notFound } from "./middleware/errors.js";

const required = ["MONGODB_URI", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} must be configured before the API can start.`);
}
if (process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters.");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (
    allowedOrigins.includes("*") ||
    allowedOrigins.includes(origin) ||
    /^https:\/\/[a-z0-9_-]+\.vercel\.app$/i.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin)
  ) {
    return callback(null, true);
  }
  return callback(new Error(`Origin ${origin} not allowed by CORS`));
};

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api", catalogueRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);


export default app;
