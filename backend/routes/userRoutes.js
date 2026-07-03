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
import validateObjectId from "../middleware/validateObjectId.js";
import { requireWithinLimit } from "../middleware/subscriptionMiddleware.js";

const router = express.Router();
router.use(protect);

// Managers can view staff list; only admins can mutate
router.get("/", allowRoles("admin", "manager"), getUsers);
router.post("/", adminOnly, requireWithinLimit("staff"), createUser);
router.put("/:id", adminOnly, validateObjectId(), updateUser);
router.delete("/:id", adminOnly, validateObjectId(), deleteUser);
router.patch("/:id/status", adminOnly, validateObjectId(), toggleStatus);

export default router;
