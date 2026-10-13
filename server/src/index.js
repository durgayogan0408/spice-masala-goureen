import mongoose from "mongoose";
import app from "./app.js";

const port = Number(process.env.PORT) || 4000;
app.listen(port, "0.0.0.0", () => console.log(`Spice & Masala API listening on port ${port}`));

mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
