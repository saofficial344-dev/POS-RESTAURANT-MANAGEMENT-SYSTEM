import express from "express";
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
} from "../controllers/itemController.js";
import protect from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { requireActiveSubscription } from "../middleware/subscriptionMiddleware.js";

const router = express.Router();
router.use(protect, requireActiveSubscription);

router.get("/",    getItems);
router.post("/",   adminOnly, createItem);
router.put("/:id", adminOnly, updateItem);
router.delete("/:id", adminOnly, deleteItem);

export default router;