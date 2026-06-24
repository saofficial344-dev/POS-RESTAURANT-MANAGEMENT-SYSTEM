import express from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";
import protect from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, adminOnly, createCategory);
router.get("/", protect, getCategories);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;