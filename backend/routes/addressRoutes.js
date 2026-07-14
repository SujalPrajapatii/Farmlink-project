import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";
import {
  createAddress,
  getMyAddresses,
} from "../controllers/addressController.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  allowRoles("business"),
  getMyAddresses
);

router.post(
  "/",
  authMiddleware,
  allowRoles("business"),
  createAddress
);

export default router;