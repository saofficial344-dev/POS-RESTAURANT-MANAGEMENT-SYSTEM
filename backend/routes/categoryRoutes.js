import express from "express";
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";
import protect from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { requireActiveSubscription } from "../middleware/subscriptionMiddleware.js";

const router = express.Router();
router.use(protect, requireActiveSubscription);

router.post("/", adminOnly, createCategory);
router.get("/",  getCategories);
router.put("/:id",    adminOnly, updateCategory);
router.delete("/:id", adminOnly, deleteCategory);

export default router;