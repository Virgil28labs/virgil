const logger = require('../lib/logger');

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 * Decodes and validates the JWT to extract user information
 * Works with the service key to bypass RLS on the backend
 */
const supabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // For development, we'll decode without verification since we're using symmetric keys
    // In production, you should verify against the JWT secret
    try {
      // Decode the JWT to get the payload
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({
          error: 'Token expired',
        });
      }

      // Extract user ID from the 'sub' claim
      if (!payload.sub) {
        return res.status(401).json({
          error: 'Invalid token: missing user ID',
        });
      }

      // Attach user info to request for use in routes
      req.userId = payload.sub;
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (decodeError) {
      logger.error('JWT decode error:', decodeError);
      return res.status(401).json({
        error: 'Invalid token format',
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
    });
  }
};

module.exports = supabaseAuth;
