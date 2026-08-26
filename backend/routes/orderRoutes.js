import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

import {
  placeOrder,
  placeCartOrder,
  getMyOrders,
  getOrderSummary,
  getOrderTracking,
  updateOrderStatus,
  cancelOrder,
  getOrderNotifications,
  markOrderNotificationRead,
  addDeliveryLocation,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/mine", authMiddleware, getMyOrders);

router.get("/summary", authMiddleware, getOrderSummary);

router.get("/notifications", authMiddleware, getOrderNotifications);
router.patch("/notifications/:notificationId/read", authMiddleware, allowRoles("farmer"), markOrderNotificationRead);

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
  "/cart",
  authMiddleware,
  allowRoles("business"),
  placeCartOrder
);

// Either participant may cancel before the order goes out for delivery.
router.post(
  "/:id/cancel",
  authMiddleware,
  allowRoles("farmer", "business"),
  cancelOrder
);

router.post(
  "/:id/location",
  authMiddleware,
  allowRoles("farmer"),
  addDeliveryLocation
);

export default router;
