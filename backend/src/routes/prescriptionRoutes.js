import { Router } from "express";
import { getAll, getById, find, create, update, remove, verify, reject } from "../controllers/prescriptionController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/find", find);
router.get("/", getAll);
router.get("/:id", getById);
router.post("/", authenticateToken, requireRole(["Admin", "Pharmacist"]), create);
router.put("/:id", authenticateToken, requireRole(["Admin", "Pharmacist"]), update);
router.patch("/:id/verify", authenticateToken, requireRole(["Admin", "Pharmacist"]), verify);
router.patch("/:id/reject", authenticateToken, requireRole(["Admin", "Pharmacist"]), reject);
router.delete("/:id", authenticateToken, requireRole(["Admin"]), remove);

export default router;
