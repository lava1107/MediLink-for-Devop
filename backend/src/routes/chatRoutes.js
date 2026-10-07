import { Router } from "express";
import { handleChatMessage } from "../controllers/chatController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// POST /api/chat - Protected or role-aware chatbot message handler
router.post("/", authenticateToken, handleChatMessage);

export default router;
