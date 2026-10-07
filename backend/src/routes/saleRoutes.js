import { Router } from "express";
import { getAll, getById, create } from "../controllers/saleController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", authenticateToken, requireRole(["Admin", "Pharmacist"]), create);

export default router;
