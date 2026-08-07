import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";
import { getDashboardData } from "../controllers/adminController.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, allowRoles("admin"), getDashboardData);

export default router;
