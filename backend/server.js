import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import settingRoutes from "./routes/settingRoutes.js";

import categoryRoutes from "./routes/categoryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import billRoutes from "./routes/billRoutes.js";

dotenv.config();
connectDB();
 
const app = express();

app.use(cors());
app.use(express.json());
 
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/settings", settingRoutes);

app.get("/", (req, res) => {
  res.send("API Running...");
}); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);