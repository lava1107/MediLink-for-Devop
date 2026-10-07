import { Router } from "express";
import {
  sendEmailController,
  sendSMSController,
  testEmailController,
  testSMSController,
  getLogsController,
  getConfigController,
  updateConfigController,
  quickSendController,
} from "../controllers/communicationController.js";

const router = Router();

// Dispatch email
router.post("/email", sendEmailController);

// Dispatch SMS
router.post("/sms", sendSMSController);

// Test routes for live verification
router.post("/test-email", testEmailController);
router.post("/test-sms", testSMSController);

// History logs
router.get("/logs", getLogsController);

// Gateway configuration (SMTP & Twilio/SMS)
router.get("/config", getConfigController);
router.post("/config", updateConfigController);

// Quick action trigger (POS, Prescriptions, Customers, Suppliers)
router.post("/quick-send", quickSendController);

export default router;
