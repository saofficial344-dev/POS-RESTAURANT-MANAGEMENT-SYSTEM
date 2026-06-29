import express from "express";
import { createBill, getBills, getSingleBill, voidBill, deleteBill, deleteAllBills } from "../controllers/billController.js";
import protect from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, createBill);
router.get("/", protect, getBills);
router.get("/:id", protect, getSingleBill);
router.put("/void/:id", voidBill);

// DELETE /all must be registered before DELETE /:id to avoid "all" being parsed as an ID
router.delete("/all", protect, adminOnly, deleteAllBills);
router.delete("/:id", protect, adminOnly, deleteBill);

export default router;