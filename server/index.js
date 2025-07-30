const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const logger = require('./lib/logger');

// Debug environment variables loading
logger.info('Environment variables loaded:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Not set',
  NODE_ENV: process.env.NODE_ENV,
  envPath: require('path').join(__dirname, '../.env'),
});
const { errorHandler, NotFoundError } = require('./lib/errors');

const app = express();

// Security middleware
app.use(helmet());

// Compression for better performance
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);

// Import routes
const llmRoutes = require('./routes/llm');
const healthRoutes = require('./routes/health');
const analyticsRoutes = require('./routes/analytics');
const chatRoutes = require('./routes/chat');
const weatherRoutes = require('./routes/weather');
const elevationRoutes = require('./routes/elevation');
const rhythmRoutes = require('./routes/rhythm');
const vectorRoutes = require('./routes/vector');

// Mount routes
app.use('/api/v1/llm', llmRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/elevation', elevationRoutes);
app.use('/api/v1/rhythm', rhythmRoutes);
app.use('/api/v1/vector', vectorRoutes);

// 404 handler
app.use((req, _res, next) => {
  next(new NotFoundError(`Endpoint not found: ${req.path}`));
});

// Error handling middleware
app.use(errorHandler);

// Server startup with initialization
const PORT = process.env.LLM_SERVER_PORT || 5002;

// Pre-startup checks
async function performStartupChecks() {
  logger.log('🔍 Performing startup checks...');

  // Check required environment variables
  const requiredEnvVars = ['NODE_ENV'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.warn(`⚠️  Missing optional environment variables: ${missingVars.join(', ')}`);
  }

  // Initialize services
  try {
    // Initialize cache
    const { cache } = require('./middleware/cache');
    if (cache) {

      logger.info('✅ Cache service initialized');
    } else {

      logger.warn('⚠️  Cache service not available');
    }

    // Initialize queue
    const { RequestQueue } = require('./services/queue');
    if (RequestQueue) {

      logger.info('✅ Queue service initialized');
    } else {

      logger.warn('⚠️  Queue service not available');
    }

  } catch (error) {

    logger.warn('⚠️  Service initialization warnings:', error.message);
  }

  logger.info('✅ Startup checks completed');
}

// Start server with proper initialization
async function startServer() {
  try {
    await performStartupChecks();

    const server = app.listen(PORT, () => {

      logger.info(`🚀 Virgil LLM Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
      logger.info(`⚡ Ready check: http://localhost:${PORT}/api/v1/health/ready`);
      logger.info('📋 Available endpoints:');
      logger.info('  POST /api/v1/llm/complete - Text completion');
      logger.info('  POST /api/v1/llm/stream - Streaming completion');
      logger.info('  POST /api/v1/chat - Secure chat endpoint');
      logger.info('  GET /api/v1/health - Health check');
      logger.info('  POST /api/v1/analytics/track - Analytics tracking');
      logger.info('  GET /api/v1/weather/coordinates/:lat/:lon - Weather by coordinates');
      logger.info('  GET /api/v1/weather/city/:city - Weather by city');
      logger.info('  GET /api/v1/elevation/coordinates/:lat/:lon - Elevation by coordinates');
      logger.info('  POST /api/v1/rhythm/generate - AI-powered rhythm generation');
      logger.info('  POST /api/v1/vector/store - Store text with embedding');
      logger.info('  POST /api/v1/vector/search - Search similar texts');
      logger.info('  GET /api/v1/vector/health - Vector service health check');
      logger.info('🎯 Server ready to accept connections');

    });

    return server;
  } catch (error) {

    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
let server;
startServer().then(srv => {
  server = srv;
}).catch(error => {

  logger.error('❌ Fatal startup error:', error);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = () => {

  logger.info('🛑 Received shutdown signal, closing server gracefully...');

  if (server) {
    server.close(() => {
      logger.info('✅ Server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    logger.warn('⚠️  Server not yet initialized, exiting immediately');
    process.exit(0);
  }

};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
