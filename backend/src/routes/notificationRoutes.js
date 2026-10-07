import { Router } from "express";
import { getAll, toggleRead, markAllRead } from "../controllers/notificationController.js";

const router = Router();

router.get("/", getAll);
router.patch("/read-all", markAllRead);
router.patch("/:id/toggle", toggleRead);

export default router;
