const { jwtVerify } = require('jose');
const logger = require('../lib/logger');

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 * Properly verifies JWT signature in production
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

    try {
      let payload;

      // Proper JWT verification for production
      if (process.env.NODE_ENV === 'production') {
        // Verify the token with the JWT secret
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (!jwtSecret) {
          logger.error('SUPABASE_JWT_SECRET not configured');
          return res.status(500).json({
            error: 'Server configuration error',
          });
        }

        // Convert the secret to a Uint8Array for jose
        const encoder = new TextEncoder();
        const secret = encoder.encode(jwtSecret);
        // Verify the token with jose
        const { payload: verifiedPayload } = await jwtVerify(token, secret, {
          algorithms: ['HS256'],
          issuer: process.env.SUPABASE_URL?.replace('/rest/v1', ''),
        });
        payload = verifiedPayload;
      } else {
        // Development mode - decode without verification but log warning
        logger.warn('JWT verification bypassed in development mode');
        payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        // Still check expiration in dev
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          return res.status(401).json({
            error: 'Token expired',
          });
        }
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
    } catch (verifyError) {
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
        });
      } else if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
        });
      }

      logger.error('JWT verification error:', verifyError);
      return res.status(401).json({
        error: 'Authentication failed',
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
