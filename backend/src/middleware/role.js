import { error } from "../utils/response.js";

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of allowed role names, e.g. ['Admin']
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, "Authentication required.", 401);
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return error(
        res,
        `Access denied. You need one of the following roles: [${allowedRoles.join(", ")}]. Your role: ${userRole}`,
        403
      );
    }

    next();
  };
}
