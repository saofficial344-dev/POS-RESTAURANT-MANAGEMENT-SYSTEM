import express from "express";

import {
  getTax,
  updateTax,
} from "../controllers/settingController.js";

const router = express.Router();

router.get("/", getTax);

router.put("/", updateTax);

export default router;