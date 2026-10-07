import { processAiQuery } from "../services/aiService.js";
import { success, error } from "../utils/response.js";

/**
 * POST /api/chat
 * Natural-language LLM Chatbot with Live MySQL Database Grounding
 */
export async function handleChatMessage(req, res, next) {
  try {
    const { message, conversationHistory } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return error(res, "Message cannot be empty", 400);
    }

    const user = req.user || null;
    const result = await processAiQuery({
      message: message.trim(),
      conversationHistory: conversationHistory || [],
      user,
    });

    return success(res, result, "MediBot response generated");
  } catch (err) {
    next(err);
  }
}
