import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  remove,
  updateStatus,
  notifyStockQueue,
  sendReservationSMS,
} from "../controllers/reservationController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

router.get("/", getAll);
router.post("/notify-stock", notifyStockQueue);
router.post("/:id/send-sms", sendReservationSMS);
router.get("/:id", getById);
router.post("/", authenticateToken, requireRole(["Admin", "Pharmacist"]), create);
router.put("/:id", authenticateToken, requireRole(["Admin", "Pharmacist"]), update);
router.patch("/:id/status", authenticateToken, requireRole(["Admin", "Pharmacist"]), updateStatus);
router.delete("/:id", authenticateToken, requireRole(["Admin", "Pharmacist"]), remove);

export default router;
