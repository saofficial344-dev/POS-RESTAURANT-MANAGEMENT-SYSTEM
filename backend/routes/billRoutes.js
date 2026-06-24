import express from "express";
import { createBill, getBills,getSingleBill,voidBill } from "../controllers/billController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createBill);
router.get("/", protect, getBills);
router.get("/:id", protect, getSingleBill);
router.put("/void/:id", voidBill);

export default router;