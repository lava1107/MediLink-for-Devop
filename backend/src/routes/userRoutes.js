import { Router } from "express";
import { getAll, getById, create, update, toggleStatus, remove } from "../controllers/userController.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = Router();

// Allow Admin to update any user, or any authenticated user to update their own profile
function canUpdateUser(req, res, next) {
  if (req.user?.role === "Admin" || req.user?.id === req.params.id) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Forbidden: You can only edit your own user profile.",
  });
}

router.get("/", authenticateToken, requireRole(["Admin"]), getAll);
router.get("/:id", authenticateToken, canUpdateUser, getById);
router.post("/", authenticateToken, requireRole(["Admin"]), create);
router.put("/:id", authenticateToken, canUpdateUser, update);
router.patch("/:id/status", authenticateToken, requireRole(["Admin"]), toggleStatus);
router.delete("/:id", authenticateToken, requireRole(["Admin"]), remove);

export default router;
