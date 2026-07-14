import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

import {
  createOnlinePayment,
  verifyOnlinePayment,
} from "../controllers/paymentController.js";

const router = express.Router();

// Creates or returns the Razorpay payment order.
router.post(
  "/orders/:id/create",
  authMiddleware,
  allowRoles("business"),
  createOnlinePayment
);

// Verifies the Razorpay success response.
router.post(
  "/orders/:id/verify",
  authMiddleware,
  allowRoles("business"),
  verifyOnlinePayment
);

export default router;