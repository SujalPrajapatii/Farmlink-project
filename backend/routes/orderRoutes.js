import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

import {
  placeOrder,
  getMyOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/mine", authMiddleware, getMyOrders);

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

export default router;