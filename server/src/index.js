import mongoose from "mongoose";
import app from "./app.js";

const port = Number(process.env.PORT) || 4000;
await mongoose.connect(process.env.MONGODB_URI);
app.listen(port, () => console.log(`Spice & Masala API listening on port ${port}`));
