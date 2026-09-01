import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import addressRoutes from "./routes/addressRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { paymentWebhook } from "./controllers/paymentController.js";
import { ensureOrderTrackingSchema } from "./config/orderTrackingSchema.js";

import featureRoutes from "./routes/featureRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";

dotenv.config();

const app = express();

// Must be before express.json().
// Razorpay signature verification needs the untouched raw request body.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentWebhook
);

const PORT = Number(process.env.PORT) || 5000;

// CORS allows the React development server to call this backend. Vite normally
// uses port 5173, but it moves to the next available local port if it is occupied.
// CLIENT_URL can contain a comma-separated list when deploying more than one UI.
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevelopmentOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header are health checks, curl, or server-to-server calls.
      if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("This website is not allowed to access the API."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

// Allows backend to read JSON data sent by the frontend.
// Example: login details, new product details, order details.
app.use(express.json({ limit: "1mb" }));

// Allows backend to read normal form data if needed.
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Payment requests need the same CORS policy and JSON parsing as every other
// API route.  Mounting these routes above the middleware made browser payment
// requests fail before they reached their controllers.
app.use("/api/payments", paymentRoutes);

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
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/addresses", addressRoutes);

// Root route.
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FarmLink backend is running",
  });
});

// Create the small tracking extension automatically for existing databases.
// The server still starts if the database is temporarily unavailable so the
// health endpoint remains useful while the database is being restored.
ensureOrderTrackingSchema()
  .then(() => console.log("Order tracking schema is ready."))
  .catch((error) => console.error("Order tracking schema setup failed:", error.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
