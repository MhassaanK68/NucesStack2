const jwt = require('jsonwebtoken');

/**
 * Generates a JWT token with no payload that expires in 5 minutes
 * @returns {string} JWT token
 */
const generateToken = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(
    {}, // Empty payload as required
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
};

/**
 * Verifies a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} Decoded token if valid
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Middleware to protect routes with JWT authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = (req, res, next) => {
  // Skip authentication for non-API routes and the token endpoint
  if (!req.path.startsWith('/api/') || req.path === '/api/get-token') {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized',
      message: 'No token provided. Use Authorization: Bearer <token>'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' from token

  try {
    // Verify token and attach to request
    req.user = verifyToken(token);
    next();
  } catch (error) {
    let statusCode = 403;
    let message = 'Invalid token';
    
    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    }
    
    return res.status(statusCode).json({
      success: false,
      error: 'Authentication failed',
      message: message
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware
};
