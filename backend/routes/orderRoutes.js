import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

import {
  placeOrder,
  getMyOrders,
  getOrderTracking,
  updateOrderStatus,
  addDeliveryLocation,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/mine", authMiddleware, getMyOrders);

router.get("/:id/tracking", authMiddleware, getOrderTracking);

router.post(
  "/",
  authMiddleware,
  allowRoles("business"),
  placeOrder
);

router.patch(
  "/:id/status",
  authMiddleware,
  allowRoles("farmer"),
  updateOrderStatus
);

router.post(
  "/:id/location",
  authMiddleware,
  allowRoles("farmer"),
  addDeliveryLocation
);

export default router;