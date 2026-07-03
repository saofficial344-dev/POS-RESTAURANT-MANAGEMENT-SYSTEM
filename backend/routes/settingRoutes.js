import express from "express";
import { getTax, updateTax } from "../controllers/settingController.js";
import protect from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", protect, getTax);
router.put("/", protect, adminOnly, updateTax);

export default router;
