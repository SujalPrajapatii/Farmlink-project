import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

import {
  placeOrder,
  getMyOrders,
  getOrderTracking,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

// Buyer or farmer can view only their own orders.
router.get("/mine", authMiddleware, getMyOrders);

// Buyer or farmer can view the tracking history of their own order.
router.get("/:id/tracking", authMiddleware, getOrderTracking);

// Only business buyers can place an order.
router.post(
  "/",
  authMiddleware,
  allowRoles("business"),
  placeOrder
);

// Only farmers can accept, dispatch, deliver, or cancel their own orders.
router.patch(
  "/:id/status",
  authMiddleware,
  allowRoles("farmer"),
  updateOrderStatus
);

export default router;