import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

import {
  createProduct,
  getAllProducts,
  getMyProducts,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", authMiddleware, getAllProducts);

router.get(
  "/mine",
  authMiddleware,
  allowRoles("farmer"),
  getMyProducts
);

router.post(
  "/",
  authMiddleware,
  allowRoles("farmer"),
  createProduct
);

router.put(
  "/:id",
  authMiddleware,
  allowRoles("farmer"),
  updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  allowRoles("farmer"),
  deleteProduct
);

export default router;