import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
}));

app.use(express.json());

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

app.get("/api/health", (req, res) => {
  res.json({ message: "FarmLink backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});