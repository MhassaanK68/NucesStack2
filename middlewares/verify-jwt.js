const { verifyAccessToken } = require("../utils/jwt");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({
      error: "Access token missing",
      message: "Authorization header is required in the format: Bearer <token>"
    });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(403).json({
      error: "Invalid or expired token",
      message: "Please login again to obtain a valid access token"
    });
  }

  req.user = payload;
  next();
}

module.exports = authenticateToken;
