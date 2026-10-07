import { Router } from "express";
import {
  login,
  getMe,
  logout,
  oauthLogin,
  getGoogleAuthUrl,
  handleGoogleCallback,
  verifyGoogleToken,
  getGoogleConfig,
  setGoogleConfig,
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.post("/oauth", oauthLogin);
router.get("/google/config", getGoogleConfig);
router.post("/google/config", setGoogleConfig);
router.get("/google/url", getGoogleAuthUrl);
router.post("/google/callback", handleGoogleCallback);
router.get("/google/callback", handleGoogleCallback);
router.post("/google/verify-token", verifyGoogleToken);
router.get("/me", authenticateToken, getMe);
router.post("/logout", authenticateToken, logout);

export default router;
