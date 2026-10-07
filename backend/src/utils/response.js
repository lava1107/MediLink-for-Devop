/**
 * Standard JSON API response helpers
 */
export function success(res, data = null, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function error(res, message = "Internal server error", statusCode = 500, details = null) {
  const response = {
    success: false,
    message,
  };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
}
