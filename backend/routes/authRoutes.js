import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

// 🔐 Register (ONLY ADMIN)
// router.post("/register", protect, adminOnly, registerUser);
router.post("/register", registerUser);

// 🔐 Login
router.post("/login", loginUser);

export default router;