import { Router } from "express";
import { getAll, getById, create, update, remove } from "../controllers/supplierController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", authenticateToken, requireRole(["Admin", "Pharmacist"]), create);
router.put("/:id", authenticateToken, requireRole(["Admin", "Pharmacist"]), update);
router.delete("/:id", authenticateToken, requireRole(["Admin"]), remove);

export default router;
