import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";
import {
  getDeliveryDashboard,
  getAvailableOrders,
  acceptDeliveryOrder,
  denyDeliveryOrder,
  getAssignedOrders,
  getAssignedOrderDetails,
  updateDeliveryWorkflowStatus,
  updateDeliveryLocation,
  updateAvailability,
} from "../controllers/deliveryController.js";

const router = express.Router();

// All delivery routes require a valid token and the 'delivery' accountType
router.use(authMiddleware, allowRoles("delivery"));

router.get("/dashboard", getDeliveryDashboard);
router.get("/available-orders", getAvailableOrders);
router.post("/orders/:id/accept", acceptDeliveryOrder);
router.post("/orders/:id/deny", denyDeliveryOrder);
router.get("/orders", getAssignedOrders);
router.get("/orders/:id", getAssignedOrderDetails);
router.patch("/orders/:id/status", updateDeliveryWorkflowStatus);
router.post("/orders/:id/location", updateDeliveryLocation);
router.patch("/availability", updateAvailability);

export default router;
