import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Register — requires valid JWT and admin role; not publicly accessible
router.post("/register", protect, adminOnly, registerUser);

// 🔐 Login
router.post("/login", loginUser);

export default router;