import mongoose from "mongoose";
import app from "../src/app.js";

let connection;

export default async function handler(req, res) {
  connection ??= mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).catch((err) => {
    connection = undefined;
    throw err;
  });
  try {
    await connection;
  } catch {
    return res.status(503).json({ message: "Database unavailable" });
  }
  return app(req, res);
}
