import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token from the Authorization header
 * and attaches user info to req.user.
 *
 * NOTE: The web server JWT payload uses { email, role } — NOT userId.
 * `email` is the primary user identifier across all 45+ API routes.
 * `userId` is kept for backward compat with any local-backend routes.
 */
export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Web server JWT: { email, role, iss, aud, exp }
    // Use email as primary identifier; userId kept as fallback for local routes
    req.user = {
      email: decoded.email,
      userId: decoded.userId || decoded.email, // fallback to email if userId absent
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}
