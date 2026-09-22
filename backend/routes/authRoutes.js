import express from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
  verifySession,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/session", authMiddleware, verifySession);
router.get("/verify", authMiddleware, verifySession);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

export default router;