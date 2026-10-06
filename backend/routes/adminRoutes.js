import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";
import {
  getDashboardData,
  getDeliveryBoys,
  assignDeliveryBoy,
  updateDeliveryBoyStatus,
  removeUser,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(authMiddleware, allowRoles("admin"));

router.get("/dashboard", getDashboardData);
router.get("/delivery-boys", getDeliveryBoys);
router.post("/orders/:id/assign-delivery", assignDeliveryBoy);
router.patch("/delivery-boys/:id/status", updateDeliveryBoyStatus);
router.post("/users/:id/remove", removeUser);

export default router;


