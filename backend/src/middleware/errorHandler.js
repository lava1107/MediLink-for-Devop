import { error } from "../utils/response.js";

/**
 * Central Express error handler
 */
export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  // MySQL specific errors
  if (err.code === "ER_DUP_ENTRY") {
    return error(res, "A record with this unique identifier already exists.", 409);
  }
  if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW") {
    return error(res, "Referenced record (foreign key) not found.", 400);
  }
  if (err.code === "ER_ROW_IS_REFERENCED_2") {
    return error(res, "Cannot delete or update this record because it is referenced by other items.", 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected server error occurred";

  return error(res, message, statusCode);
}
