import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleStatus,
} from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import { adminOnly, allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();
router.use(protect);

// Managers can view staff list; only admins can mutate
router.get("/", allowRoles("admin", "manager"), getUsers);
router.post("/", adminOnly, createUser);
router.put("/:id", adminOnly, updateUser);
router.delete("/:id", adminOnly, deleteUser);
router.patch("/:id/status", adminOnly, toggleStatus);

export default router;
