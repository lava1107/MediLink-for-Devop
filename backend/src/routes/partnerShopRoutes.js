import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
  getPartnerMedicines,
  getShopMedicines,
  addShopMedicine,
  updateShopMedicine,
  deleteShopMedicine,
} from "../controllers/partnerShopController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/medicines", getPartnerMedicines);
router.get("/:id/medicines", getShopMedicines);
router.post("/:id/medicines", addShopMedicine);
router.put("/:id/medicines/:medId", updateShopMedicine);
router.delete("/:id/medicines/:medId", deleteShopMedicine);

router.get("/", getAll);
router.get("/:id", getById);
router.post("/", authenticateToken, requireRole(["Admin"]), create);
router.put("/:id", authenticateToken, requireRole(["Admin"]), update);
router.delete("/:id", authenticateToken, requireRole(["Admin"]), remove);

export default router;
