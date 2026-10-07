import { Router } from "express";
import { checkAvailability } from "../controllers/availabilityController.js";

const router = Router();

router.get("/", checkAvailability);
router.get("/check", checkAvailability);

export default router;
