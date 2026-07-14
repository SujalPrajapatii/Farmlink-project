import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import addressRoutes from "./routes/addressRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { paymentWebhook } from "./controllers/paymentController.js";

import featureRoutes from "./routes/featureRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();

const app = express();

// Must be before express.json().
// Razorpay signature verification needs the untouched raw request body.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentWebhook
);

app.use("/api/payments", paymentRoutes);
const PORT = Number(process.env.PORT) || 5000;

// CORS allows your React frontend to call this backend.
// Set CLIENT_URL in backend/.env.
// Example: CLIENT_URL=http://localhost:5173
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

// Allows backend to read JSON data sent by the frontend.
// Example: login details, new product details, order details.
app.use(express.json({ limit: "1mb" }));

// Allows backend to read normal form data if needed.
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Makes files in backend/uploads available through /uploads.
// Example: http://localhost:5000/uploads/image.jpg
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

// A simple URL to check whether backend is running.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FarmLink backend is running",
  });
});

// Backend API routes.
app.use("/api", featureRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);

// Root route.
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FarmLink backend is running",
  });
});

// Runs the backend server.
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});