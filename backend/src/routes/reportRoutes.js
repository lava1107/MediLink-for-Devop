import { Router } from "express";
import { getReport } from "../controllers/reportController.js";
import { authenticateToken } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:key", optionalAuth, getReport);

export default router;
